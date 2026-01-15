#!/usr/bin/env python3
import json
import math
import statistics
from datetime import datetime


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


def run_classifier(hr_samples, sessions, awake_threshold, awake_override_rem):
    CYCLE_LENGTH = 90
    CV_THRESHOLD = 0.20
    REM_CONSECUTIVE_REQUIRED = 2
    MAX_RECENT_HR = 20
    MAX_RMSSD_HISTORY = 10

    confusion = {
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

                if len(recent_hrs) >= 3:
                    recent_diffs = [
                        abs(recent_hrs[i] - recent_hrs[i - 1])
                        for i in range(1, len(recent_hrs))
                    ]
                    mean_diff = statistics.mean(recent_diffs[-10:])
                    local_std = (
                        statistics.stdev(recent_hrs[-5:]) if len(recent_hrs) >= 5 else 0
                    )
                else:
                    mean_diff = 0
                    local_std = 0

                is_awake = mean_diff > awake_threshold

                if minutes < 70:
                    predicted = "nrem"
                    consecutive_rem_signals = 0
                elif is_awake and (not awake_override_rem or rem_score < 0.3):
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

                confusion[actual][predicted] += 1
                prev_stage = predicted

    return confusion


def calc_metrics(confusion):
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

    return {
        "accuracy": correct / total if total > 0 else 0,
        "rem_sens": rem_sens,
        "rem_spec": rem_spec,
        "awake_acc": awake_acc,
        "awake_correct": awake_correct,
        "awake_total": awake_total,
    }


def main():
    hr_samples, sleep_stages = load_data()
    sessions = identify_sessions(sleep_stages)

    print("=" * 90)
    print("PARAMETER SWEEP: Finding optimal awake detection threshold")
    print("=" * 90)
    print(
        f"{'Threshold':<12} {'AwakeOverride':<15} {'REM Sens':<10} {'REM Spec':<10} {'Awake Acc':<12} {'Overall':<10}"
    )
    print("-" * 90)

    best_balanced = None
    best_score = 0

    for awake_thresh in [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]:
        for override_rem in [True, False]:
            confusion = run_classifier(hr_samples, sessions, awake_thresh, override_rem)
            m = calc_metrics(confusion)

            balanced_score = (
                0.5 * m["rem_sens"] + 0.3 * m["awake_acc"] + 0.2 * m["rem_spec"]
            )

            print(
                f"{awake_thresh:<12.1f} {str(override_rem):<15} {m['rem_sens'] * 100:<10.1f} {m['rem_spec'] * 100:<10.1f} "
                f"{m['awake_acc'] * 100:<12.1f} {m['accuracy'] * 100:<10.1f}"
            )

            if balanced_score > best_score:
                best_score = balanced_score
                best_balanced = (awake_thresh, override_rem, m, confusion)

    print("\n" + "=" * 90)
    print("BEST BALANCED CONFIGURATION")
    print("=" * 90)
    thresh, override, m, confusion = best_balanced
    print(f"Awake Threshold: {thresh}")
    print(f"Override REM: {override}")
    print(f"REM Sensitivity: {m['rem_sens'] * 100:.1f}%")
    print(f"REM Specificity: {m['rem_spec'] * 100:.1f}%")
    print(
        f"Awake Accuracy: {m['awake_acc'] * 100:.1f}% ({m['awake_correct']}/{m['awake_total']})"
    )
    print(f"Overall Accuracy: {m['accuracy'] * 100:.1f}%")
    print(f"\nConfusion Matrix:")
    print(f"              Predicted:  Awake    NREM     REM")
    for actual in ["awake", "nrem", "rem"]:
        row = confusion[actual]
        print(
            f"    Actual {actual:5s}:        {row['awake']:5d}   {row['nrem']:5d}   {row['rem']:5d}"
        )

    print("\n" + "=" * 90)
    print("ALTERNATIVE: Prioritize REM sensitivity with decent awake")
    print("=" * 90)

    best_rem = None
    best_rem_score = 0
    for awake_thresh in [2.5, 3.0, 3.5, 4.0]:
        for override_rem in [True]:
            confusion = run_classifier(hr_samples, sessions, awake_thresh, override_rem)
            m = calc_metrics(confusion)
            if m["rem_sens"] >= 0.75 and m["awake_acc"] > best_rem_score:
                best_rem_score = m["awake_acc"]
                best_rem = (awake_thresh, override_rem, m, confusion)

    if best_rem:
        thresh, override, m, confusion = best_rem
        print(f"Awake Threshold: {thresh}")
        print(f"Override REM: {override}")
        print(f"REM Sensitivity: {m['rem_sens'] * 100:.1f}%")
        print(
            f"Awake Accuracy: {m['awake_acc'] * 100:.1f}% ({m['awake_correct']}/{m['awake_total']})"
        )
        print(f"\nConfusion Matrix:")
        print(f"              Predicted:  Awake    NREM     REM")
        for actual in ["awake", "nrem", "rem"]:
            row = confusion[actual]
            print(
                f"    Actual {actual:5s}:        {row['awake']:5d}   {row['nrem']:5d}   {row['rem']:5d}"
            )


if __name__ == "__main__":
    main()
