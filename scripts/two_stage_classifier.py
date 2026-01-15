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


def run_two_stage_classifier(
    hr_samples, sessions, awake_mean_diff_thresh, awake_rmssd_thresh, cv_threshold
):
    CYCLE_LENGTH = 90
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
                    diffs = [
                        abs(recent_hrs[i] - recent_hrs[i - 1])
                        for i in range(1, len(recent_hrs))
                    ]
                    diffs_sq = [d * d for d in diffs]
                    rmssd = math.sqrt(sum(diffs_sq) / len(diffs_sq))
                    mean_diff = statistics.mean(diffs[-10:])
                else:
                    rmssd = 10
                    mean_diff = 0

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

                is_awake = (
                    mean_diff > awake_mean_diff_thresh or rmssd > awake_rmssd_thresh
                )

                if is_awake:
                    predicted = "awake"
                    consecutive_rem_signals = 0
                else:
                    if minutes < 70:
                        time_rem_prob = 0
                    else:
                        cycle = int(minutes / CYCLE_LENGTH)
                        pos = (minutes % CYCLE_LENGTH) / CYCLE_LENGTH
                        base_prob = min(0.35, 0.10 + cycle * 0.08)
                        time_rem_prob = (
                            base_prob * 2.0 if pos >= 0.65 else base_prob * 0.3
                        )

                    cv_rem_signal = 1.0 if cv < cv_threshold else 0.0
                    strong_cv = cv < cv_threshold * 0.7
                    rem_score = (
                        0.5 * time_rem_prob
                        + 0.5 * cv_rem_signal * 0.5
                        + (0.15 if strong_cv else 0)
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
                        predicted = "nrem"

                confusion[actual][predicted] += 1

    return confusion


def calc_metrics(confusion):
    total = sum(sum(row.values()) for row in confusion.values())
    correct = sum(confusion[s][s] for s in ["awake", "nrem", "rem"])

    rem_tp = confusion["rem"]["rem"]
    rem_fn = confusion["rem"]["awake"] + confusion["rem"]["nrem"]
    rem_fp = confusion["awake"]["rem"] + confusion["nrem"]["rem"]

    rem_sens = rem_tp / (rem_tp + rem_fn) if (rem_tp + rem_fn) > 0 else 0

    awake_tp = confusion["awake"]["awake"]
    awake_fn = confusion["awake"]["nrem"] + confusion["awake"]["rem"]
    awake_fp = confusion["nrem"]["awake"] + confusion["rem"]["awake"]

    awake_sens = awake_tp / (awake_tp + awake_fn) if (awake_tp + awake_fn) > 0 else 0
    awake_prec = awake_tp / (awake_tp + awake_fp) if (awake_tp + awake_fp) > 0 else 0

    return {
        "accuracy": correct / total if total > 0 else 0,
        "rem_sens": rem_sens,
        "awake_sens": awake_sens,
        "awake_prec": awake_prec,
        "rem_tp": rem_tp,
        "rem_fn": rem_fn,
        "awake_tp": awake_tp,
        "awake_fn": awake_fn,
        "awake_fp": awake_fp,
    }


def main():
    hr_samples, sleep_stages = load_data()
    sessions = identify_sessions(sleep_stages)

    print("=" * 100)
    print("TWO-STAGE CLASSIFIER: Stage 1 (Awake vs Sleep) + Stage 2 (NREM vs REM)")
    print("=" * 100)

    print("\n" + "-" * 100)
    print("PARAMETER SWEEP")
    print("-" * 100)
    print(
        f"{'MeanDiff':<10} {'RMSSD':<8} {'CV':<6} {'REM Sens':<10} {'Awake Sens':<12} {'Awake Prec':<12} {'Overall':<10}"
    )
    print("-" * 100)

    best = None
    best_score = 0

    for mean_diff_thresh in [2.0, 2.5, 3.0, 3.5, 4.0]:
        for rmssd_thresh in [4.0, 5.0, 6.0, 7.0, 8.0]:
            for cv_thresh in [0.18, 0.20, 0.22]:
                confusion = run_two_stage_classifier(
                    hr_samples, sessions, mean_diff_thresh, rmssd_thresh, cv_thresh
                )
                m = calc_metrics(confusion)

                score = (
                    0.4 * m["rem_sens"]
                    + 0.3 * m["awake_sens"]
                    + 0.2 * m["awake_prec"]
                    + 0.1 * m["accuracy"]
                )

                if m["rem_sens"] >= 0.70:
                    print(
                        f"{mean_diff_thresh:<10.1f} {rmssd_thresh:<8.1f} {cv_thresh:<6.2f} "
                        f"{m['rem_sens'] * 100:<10.1f} {m['awake_sens'] * 100:<12.1f} "
                        f"{m['awake_prec'] * 100:<12.1f} {m['accuracy'] * 100:<10.1f}"
                    )

                if score > best_score and m["rem_sens"] >= 0.70:
                    best_score = score
                    best = (mean_diff_thresh, rmssd_thresh, cv_thresh, m, confusion)

    if best:
        mean_diff, rmssd, cv, m, confusion = best
        print("\n" + "=" * 100)
        print("BEST CONFIGURATION (REM sens >= 70%)")
        print("=" * 100)
        print(f"Stage 1 - Awake Detection:")
        print(f"  mean_diff threshold: {mean_diff}")
        print(f"  rmssd threshold: {rmssd}")
        print(f"Stage 2 - REM Detection:")
        print(f"  CV threshold: {cv}")
        print(f"\nResults:")
        print(
            f"  REM Sensitivity: {m['rem_sens'] * 100:.1f}% ({m['rem_tp']}/{m['rem_tp'] + m['rem_fn']})"
        )
        print(
            f"  Awake Sensitivity: {m['awake_sens'] * 100:.1f}% ({m['awake_tp']}/{m['awake_tp'] + m['awake_fn']})"
        )
        print(
            f"  Awake Precision: {m['awake_prec'] * 100:.1f}% ({m['awake_tp']}/{m['awake_tp'] + m['awake_fp']})"
        )
        print(f"  Overall Accuracy: {m['accuracy'] * 100:.1f}%")
        print(f"\nConfusion Matrix:")
        print(f"              Predicted:  Awake    NREM     REM")
        for actual in ["awake", "nrem", "rem"]:
            row = confusion[actual]
            print(
                f"    Actual {actual:5s}:        {row['awake']:5d}   {row['nrem']:5d}   {row['rem']:5d}"
            )

    print("\n" + "=" * 100)
    print("COMPARISON: Prioritize HIGH REM Sensitivity (>= 80%)")
    print("=" * 100)

    best_high_rem = None
    best_awake = 0

    for mean_diff_thresh in [2.5, 3.0, 3.5, 4.0, 4.5, 5.0]:
        for rmssd_thresh in [5.0, 6.0, 7.0, 8.0, 9.0, 10.0]:
            for cv_thresh in [0.18, 0.20, 0.22]:
                confusion = run_two_stage_classifier(
                    hr_samples, sessions, mean_diff_thresh, rmssd_thresh, cv_thresh
                )
                m = calc_metrics(confusion)

                if m["rem_sens"] >= 0.80 and m["awake_sens"] > best_awake:
                    best_awake = m["awake_sens"]
                    best_high_rem = (
                        mean_diff_thresh,
                        rmssd_thresh,
                        cv_thresh,
                        m,
                        confusion,
                    )

    if best_high_rem:
        mean_diff, rmssd, cv, m, confusion = best_high_rem
        print(f"Stage 1 - Awake Detection:")
        print(f"  mean_diff threshold: {mean_diff}")
        print(f"  rmssd threshold: {rmssd}")
        print(f"Stage 2 - REM Detection:")
        print(f"  CV threshold: {cv}")
        print(f"\nResults:")
        print(f"  REM Sensitivity: {m['rem_sens'] * 100:.1f}%")
        print(f"  Awake Sensitivity: {m['awake_sens'] * 100:.1f}%")
        print(f"  Awake Precision: {m['awake_prec'] * 100:.1f}%")
        print(f"\nConfusion Matrix:")
        print(f"              Predicted:  Awake    NREM     REM")
        for actual in ["awake", "nrem", "rem"]:
            row = confusion[actual]
            print(
                f"    Actual {actual:5s}:        {row['awake']:5d}   {row['nrem']:5d}   {row['rem']:5d}"
            )


if __name__ == "__main__":
    main()
