#!/usr/bin/env python3
"""
Analyze awake misclassification issue.

Current problem:
- Awake accuracy: 0.2% (1/509 correct)
- 310 awake samples classified as REM
- 198 awake samples classified as NREM

Goal: Find features that distinguish awake from REM/NREM
"""

import json
import math
import statistics
from datetime import datetime
from collections import defaultdict


def parse_time(time_str):
    try:
        return datetime.fromisoformat(time_str.replace("Z", "+00:00"))
    except ValueError:
        return None


def load_data(json_path="notes/raw_sleep_data.json"):
    with open(json_path) as f:
        data = json.load(f)

    hr_samples = []
    for sample in data["hrSamples"]:
        t = parse_time(sample["time"])
        if t:
            hr_samples.append({"bpm": sample["bpm"], "time": t})
    hr_samples.sort(key=lambda x: x["time"])

    sleep_stages = []
    for stage in data["sleepStages"]:
        start = parse_time(stage["startTime"])
        end = parse_time(stage["endTime"])
        if start and end:
            sleep_stages.append({"stage": stage["stage"], "start": start, "end": end})
    sleep_stages.sort(key=lambda x: x["start"])

    return hr_samples, sleep_stages


def get_hr_features_for_stage(hr_samples, stage_start, stage_end):
    """Extract HR features for a single sleep stage period."""
    matching = [
        hr["bpm"] for hr in hr_samples if stage_start <= hr["time"] <= stage_end
    ]

    if len(matching) < 2:
        return None

    mean_hr = statistics.mean(matching)
    std_hr = statistics.stdev(matching) if len(matching) > 1 else 0
    range_hr = max(matching) - min(matching)

    diffs = [abs(matching[i] - matching[i - 1]) for i in range(1, len(matching))]
    mean_diff = statistics.mean(diffs) if diffs else 0
    max_diff = max(diffs) if diffs else 0

    rmssd = math.sqrt(sum(d * d for d in diffs) / len(diffs)) if diffs else 0

    return {
        "count": len(matching),
        "mean_hr": mean_hr,
        "std_hr": std_hr,
        "range_hr": range_hr,
        "mean_diff": mean_diff,
        "max_diff": max_diff,
        "rmssd": rmssd,
        "cv": std_hr / mean_hr if mean_hr > 0 else 0,
    }


def analyze_by_stage():
    """Analyze HR features by stage type."""
    hr_samples, sleep_stages = load_data()

    stage_features = defaultdict(list)

    for stage in sleep_stages:
        features = get_hr_features_for_stage(hr_samples, stage["start"], stage["end"])
        if features:
            stage_type = stage["stage"]
            if stage_type in ["light", "deep"]:
                stage_type = "nrem"
            stage_features[stage_type].append(features)

    print("=" * 80)
    print("HR FEATURES BY STAGE TYPE")
    print("=" * 80)

    for stage_type in ["awake", "nrem", "rem"]:
        features = stage_features[stage_type]
        if not features:
            continue

        print(f"\n{stage_type.upper()} ({len(features)} periods)")
        print("-" * 40)

        for metric in [
            "mean_hr",
            "std_hr",
            "range_hr",
            "mean_diff",
            "max_diff",
            "rmssd",
            "cv",
        ]:
            values = [f[metric] for f in features]
            print(
                f"  {metric:12s}: mean={statistics.mean(values):6.2f}, "
                f"std={statistics.stdev(values):5.2f}, "
                f"min={min(values):5.2f}, max={max(values):5.2f}"
            )

    return stage_features


def find_discriminating_thresholds(stage_features):
    """Find thresholds that best separate awake from sleep."""
    print("\n" + "=" * 80)
    print("DISCRIMINATING FEATURES ANALYSIS")
    print("=" * 80)

    awake = stage_features["awake"]
    nrem = stage_features["nrem"]
    rem = stage_features["rem"]
    sleep = nrem + rem

    print(f"\nSamples: awake={len(awake)}, nrem={len(nrem)}, rem={len(rem)}")

    metrics = ["std_hr", "range_hr", "mean_diff", "max_diff", "rmssd", "cv"]

    for metric in metrics:
        awake_vals = [f[metric] for f in awake]
        sleep_vals = [f[metric] for f in sleep]

        awake_mean = statistics.mean(awake_vals)
        sleep_mean = statistics.mean(sleep_vals)

        print(f"\n{metric}:")
        print(f"  Awake mean: {awake_mean:.3f}")
        print(f"  Sleep mean: {sleep_mean:.3f}")
        print(
            f"  Ratio (awake/sleep): {awake_mean / sleep_mean if sleep_mean > 0 else 'inf':.2f}"
        )

        for thresh in [
            statistics.mean(awake_vals + sleep_vals),
            (awake_mean + sleep_mean) / 2,
        ]:
            awake_above = sum(1 for v in awake_vals if v > thresh)
            sleep_above = sum(1 for v in sleep_vals if v > thresh)

            if awake_mean > sleep_mean:
                awake_correct = awake_above
                sleep_correct = len(sleep_vals) - sleep_above
            else:
                awake_correct = len(awake_vals) - awake_above
                sleep_correct = sleep_above

            total_correct = awake_correct + sleep_correct
            total = len(awake_vals) + len(sleep_vals)

            print(
                f"  Threshold {thresh:.3f}: "
                f"awake={awake_correct}/{len(awake_vals)} ({100 * awake_correct / len(awake_vals):.1f}%), "
                f"sleep={sleep_correct}/{len(sleep_vals)} ({100 * sleep_correct / len(sleep_vals):.1f}%), "
                f"total={100 * total_correct / total:.1f}%"
            )


def analyze_temporal_patterns():
    """Analyze when awake periods occur relative to sleep cycles."""
    hr_samples, sleep_stages = load_data()

    print("\n" + "=" * 80)
    print("TEMPORAL ANALYSIS OF AWAKE PERIODS")
    print("=" * 80)

    sessions = identify_sessions(sleep_stages)

    for sess_idx, session in enumerate(sessions[:3]):
        print(f"\nSession {sess_idx}:")
        session_start = session[0]["start"]

        for stage in session:
            if stage["stage"] == "awake":
                minutes = (stage["start"] - session_start).total_seconds() / 60
                duration = (stage["end"] - stage["start"]).total_seconds() / 60
                print(f"  Awake at {minutes:.0f} min, duration {duration:.1f} min")


def identify_sessions(sleep_stages, gap_hours=4):
    if not sleep_stages:
        return []
    sessions = []
    current = [sleep_stages[0]]
    for i in range(1, len(sleep_stages)):
        gap = (
            sleep_stages[i]["start"] - sleep_stages[i - 1]["end"]
        ).total_seconds() / 3600
        if gap > gap_hours:
            sessions.append(current)
            current = []
        current.append(sleep_stages[i])
    if current:
        sessions.append(current)
    return sessions


def test_improved_classifier():
    """Test classifier with improved awake detection."""
    hr_samples, sleep_stages = load_data()
    sessions = identify_sessions(sleep_stages)

    print("\n" + "=" * 80)
    print("TESTING IMPROVED CLASSIFIER")
    print("=" * 80)

    confusion = {
        s: {t: 0 for t in ["awake", "nrem", "rem"]} for s in ["awake", "nrem", "rem"]
    }

    CYCLE_LENGTH = 90
    CV_THRESHOLD = 0.20
    REM_CONSECUTIVE_REQUIRED = 2
    MAX_RECENT_HR = 20
    MAX_RMSSD_HISTORY = 10

    for session in sessions:
        if len(session) < 5:
            continue

        session_start = session[0]["start"]
        recent_hrs = []
        rmssd_history = []
        consecutive_rem_signals = 0
        prev_stage = "nrem"

        for stage_rec in session:
            actual = stage_rec["stage"]
            if actual in ["light", "deep"]:
                actual = "nrem"

            start = stage_rec["start"]
            end = stage_rec["end"]

            stage_hrs = [hr for hr in hr_samples if start <= hr["time"] <= end]
            stage_hrs.sort(key=lambda x: x["time"])

            for hr in stage_hrs:
                recent_hrs.append(hr["bpm"])
                if len(recent_hrs) > MAX_RECENT_HR:
                    recent_hrs.pop(0)

                if len(recent_hrs) >= 2:
                    diffs_sq = [
                        (recent_hrs[i] - recent_hrs[i - 1]) ** 2
                        for i in range(1, len(recent_hrs))
                    ]
                    rmssd = math.sqrt(sum(diffs_sq) / len(diffs_sq))
                else:
                    rmssd = 10

                rmssd_history.append(rmssd)
                if len(rmssd_history) > MAX_RMSSD_HISTORY:
                    rmssd_history.pop(0)

                minutes = (hr["time"] - session_start).total_seconds() / 60

                if len(rmssd_history) >= 3:
                    mean_rmssd = statistics.mean(rmssd_history)
                    if mean_rmssd < 0.1:
                        cv = 0.5
                    else:
                        variance = sum(
                            (v - mean_rmssd) ** 2 for v in rmssd_history
                        ) / len(rmssd_history)
                        cv = math.sqrt(variance) / mean_rmssd
                else:
                    cv = 0.5

                if minutes < 70:
                    time_rem_prob = 0
                else:
                    cycle = int(minutes / CYCLE_LENGTH)
                    pos = (minutes % CYCLE_LENGTH) / CYCLE_LENGTH
                    base_prob = min(0.35, 0.10 + cycle * 0.08)
                    time_rem_prob = base_prob * 2.0 if pos >= 0.65 else base_prob * 0.3

                cv_rem_signal = 1.0 if cv < CV_THRESHOLD else 0.0
                strong_cv = cv < CV_THRESHOLD * 0.7
                rem_score = (
                    0.5 * time_rem_prob
                    + 0.5 * cv_rem_signal * 0.5
                    + (0.15 if strong_cv else 0)
                )

                local_std = (
                    statistics.stdev(recent_hrs[-5:]) if len(recent_hrs) >= 5 else 0
                )
                local_range = (
                    max(recent_hrs[-5:]) - min(recent_hrs[-5:])
                    if len(recent_hrs) >= 5
                    else 0
                )
                local_mean_diff = (
                    statistics.mean(
                        [
                            abs(recent_hrs[i] - recent_hrs[i - 1])
                            for i in range(max(1, len(recent_hrs) - 5), len(recent_hrs))
                        ]
                    )
                    if len(recent_hrs) >= 2
                    else 0
                )

                if minutes < 70:
                    predicted = "nrem"
                    consecutive_rem_signals = 0
                elif rem_score > 0.25:
                    consecutive_rem_signals += 1
                    if consecutive_rem_signals >= REM_CONSECUTIVE_REQUIRED:
                        predicted = "rem"
                    else:
                        predicted = "nrem"
                else:
                    consecutive_rem_signals = 0
                    if cv > 0.5 and local_std > 5:
                        predicted = "awake"
                    else:
                        predicted = "nrem"

                if prev_stage == "rem" and predicted != "rem" and rem_score > 0.15:
                    predicted = "rem"

                confusion[actual][predicted] += 1
                prev_stage = predicted

    print("\nBASELINE (current algorithm):")
    print_confusion(confusion)

    confusion2 = {
        s: {t: 0 for t in ["awake", "nrem", "rem"]} for s in ["awake", "nrem", "rem"]
    }

    for session in sessions:
        if len(session) < 5:
            continue

        session_start = session[0]["start"]
        recent_hrs = []
        rmssd_history = []
        consecutive_rem_signals = 0
        prev_stage = "nrem"

        for stage_rec in session:
            actual = stage_rec["stage"]
            if actual in ["light", "deep"]:
                actual = "nrem"

            start = stage_rec["start"]
            end = stage_rec["end"]

            stage_hrs = [hr for hr in hr_samples if start <= hr["time"] <= end]
            stage_hrs.sort(key=lambda x: x["time"])

            for hr in stage_hrs:
                recent_hrs.append(hr["bpm"])
                if len(recent_hrs) > MAX_RECENT_HR:
                    recent_hrs.pop(0)

                if len(recent_hrs) >= 2:
                    diffs_sq = [
                        (recent_hrs[i] - recent_hrs[i - 1]) ** 2
                        for i in range(1, len(recent_hrs))
                    ]
                    rmssd = math.sqrt(sum(diffs_sq) / len(diffs_sq))
                else:
                    rmssd = 10

                rmssd_history.append(rmssd)
                if len(rmssd_history) > MAX_RMSSD_HISTORY:
                    rmssd_history.pop(0)

                minutes = (hr["time"] - session_start).total_seconds() / 60

                if len(rmssd_history) >= 3:
                    mean_rmssd = statistics.mean(rmssd_history)
                    if mean_rmssd < 0.1:
                        cv = 0.5
                    else:
                        variance = sum(
                            (v - mean_rmssd) ** 2 for v in rmssd_history
                        ) / len(rmssd_history)
                        cv = math.sqrt(variance) / mean_rmssd
                else:
                    cv = 0.5

                if minutes < 70:
                    time_rem_prob = 0
                else:
                    cycle = int(minutes / CYCLE_LENGTH)
                    pos = (minutes % CYCLE_LENGTH) / CYCLE_LENGTH
                    base_prob = min(0.35, 0.10 + cycle * 0.08)
                    time_rem_prob = base_prob * 2.0 if pos >= 0.65 else base_prob * 0.3

                cv_rem_signal = 1.0 if cv < CV_THRESHOLD else 0.0
                strong_cv = cv < CV_THRESHOLD * 0.7
                rem_score = (
                    0.5 * time_rem_prob
                    + 0.5 * cv_rem_signal * 0.5
                    + (0.15 if strong_cv else 0)
                )

                local_std = (
                    statistics.stdev(recent_hrs[-5:]) if len(recent_hrs) >= 5 else 0
                )
                local_range = (
                    max(recent_hrs[-5:]) - min(recent_hrs[-5:])
                    if len(recent_hrs) >= 5
                    else 0
                )

                if len(recent_hrs) >= 2:
                    recent_diffs = [
                        abs(recent_hrs[i] - recent_hrs[i - 1])
                        for i in range(max(1, len(recent_hrs) - 10), len(recent_hrs))
                    ]
                    mean_diff = statistics.mean(recent_diffs)
                    max_diff = max(recent_diffs)
                else:
                    mean_diff = 0
                    max_diff = 0

                awake_score = 0
                if local_std > 3:
                    awake_score += 0.3
                if local_range > 8:
                    awake_score += 0.2
                if mean_diff > 2:
                    awake_score += 0.3
                if max_diff > 5:
                    awake_score += 0.2
                if cv > 0.4:
                    awake_score += 0.2
                if rmssd > 4:
                    awake_score += 0.2

                if minutes < 70:
                    predicted = "nrem"
                    consecutive_rem_signals = 0
                elif awake_score > 0.6:
                    predicted = "awake"
                    consecutive_rem_signals = 0
                elif rem_score > 0.25:
                    consecutive_rem_signals += 1
                    if consecutive_rem_signals >= REM_CONSECUTIVE_REQUIRED:
                        predicted = "rem"
                    else:
                        predicted = "nrem"
                else:
                    consecutive_rem_signals = 0
                    predicted = "nrem"

                if prev_stage == "rem" and predicted == "nrem" and rem_score > 0.15:
                    predicted = "rem"

                confusion2[actual][predicted] += 1
                prev_stage = predicted

    print("\nIMPROVED (awake score threshold):")
    print_confusion(confusion2)


def print_confusion(confusion):
    total = sum(sum(row.values()) for row in confusion.values())
    correct = sum(confusion[s][s] for s in ["awake", "nrem", "rem"])

    rem_tp = confusion["rem"]["rem"]
    rem_fn = confusion["rem"]["awake"] + confusion["rem"]["nrem"]
    rem_fp = confusion["awake"]["rem"] + confusion["nrem"]["rem"]
    rem_tn = (
        confusion["awake"]["awake"]
        + confusion["awake"]["nrem"]
        + confusion["nrem"]["awake"]
        + confusion["nrem"]["nrem"]
    )

    rem_sens = rem_tp / (rem_tp + rem_fn) if (rem_tp + rem_fn) > 0 else 0
    rem_spec = rem_tn / (rem_tn + rem_fp) if (rem_tn + rem_fp) > 0 else 0

    awake_correct = confusion["awake"]["awake"]
    awake_total = sum(confusion["awake"].values())
    awake_acc = awake_correct / awake_total if awake_total > 0 else 0

    print(f"  Overall Accuracy: {100 * correct / total:.1f}%")
    print(f"  REM Sensitivity: {100 * rem_sens:.1f}%")
    print(f"  REM Specificity: {100 * rem_spec:.1f}%")
    print(f"  Awake Accuracy: {100 * awake_acc:.1f}% ({awake_correct}/{awake_total})")
    print(f"  Confusion Matrix:")
    print(f"              Predicted:  Awake    NREM     REM")
    for actual in ["awake", "nrem", "rem"]:
        row = confusion[actual]
        print(
            f"    Actual {actual:5s}:        {row['awake']:5d}   {row['nrem']:5d}   {row['rem']:5d}"
        )


if __name__ == "__main__":
    stage_features = analyze_by_stage()
    find_discriminating_thresholds(stage_features)
    analyze_temporal_patterns()
    test_improved_classifier()
