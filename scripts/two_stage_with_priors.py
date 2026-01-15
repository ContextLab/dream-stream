#!/usr/bin/env python3
"""Two-stage classifier with time-based awake priors (Option C)."""

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


def get_awake_prior(minutes_since_start):
    """Time-based probability of being awake."""
    if minutes_since_start < 30:
        return 0.35
    if minutes_since_start < 60:
        return 0.01
    if minutes_since_start < 90:
        return 0.33
    if minutes_since_start < 330:
        return 0.10
    if minutes_since_start < 360:
        return 0.30
    return min(0.65, 0.30 + (minutes_since_start - 360) * 0.003)


def get_dynamic_threshold(minutes_since_start, base_threshold=3.0):
    """Dynamic mean_diff threshold based on awake prior."""
    prior = get_awake_prior(minutes_since_start)
    if prior > 0.25:
        return base_threshold - 0.5  # Easier to detect awake
    if prior < 0.05:
        return base_threshold + 1.0  # Harder to detect awake
    return base_threshold


def run_classifier(hr_samples, sessions, base_thresh, use_dynamic, cv_threshold):
    CYCLE_LENGTH = 90
    REM_CONSECUTIVE_REQUIRED = 2
    AWAKE_CONSECUTIVE_REQUIRED = 1
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
        consecutive_awake_signals = 0
        prev_predicted = "nrem"

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

                # Dynamic or fixed threshold
                if use_dynamic:
                    awake_thresh = get_dynamic_threshold(minutes, base_thresh)
                else:
                    awake_thresh = base_thresh

                awake_signal = mean_diff > awake_thresh

                if awake_signal:
                    consecutive_awake_signals += 1
                else:
                    consecutive_awake_signals = 0

                is_awake = consecutive_awake_signals >= AWAKE_CONSECUTIVE_REQUIRED

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

                    if (
                        prev_predicted == "rem"
                        and predicted == "nrem"
                        and rem_score > 0.15
                    ):
                        predicted = "rem"

                confusion[actual][predicted] += 1
                prev_predicted = predicted

    return confusion


def calc_metrics(confusion):
    total = sum(sum(row.values()) for row in confusion.values())
    correct = sum(confusion[s][s] for s in ["awake", "nrem", "rem"])

    rem_tp = confusion["rem"]["rem"]
    rem_fn = confusion["rem"]["awake"] + confusion["rem"]["nrem"]
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
        "confusion": confusion,
    }


def main():
    hr_samples, sleep_stages = load_data()
    sessions = identify_sessions(sleep_stages)

    print("=" * 100)
    print("TWO-STAGE CLASSIFIER WITH TIME-BASED PRIORS (Option C)")
    print("=" * 100)

    print(
        f"\n{'Mode':<12} {'Base':<8} {'REM Sens':<10} {'Awake Sens':<12} {'Awake Prec':<12} {'Overall':<10}"
    )
    print("-" * 100)

    results = []

    for base_thresh in [2.5, 3.0, 3.5]:
        for use_dynamic in [False, True]:
            confusion = run_classifier(
                hr_samples, sessions, base_thresh, use_dynamic, cv_threshold=0.20
            )
            m = calc_metrics(confusion)

            mode = "dynamic" if use_dynamic else "fixed"
            results.append((mode, base_thresh, m))

            print(
                f"{mode:<12} {base_thresh:<8.1f} "
                f"{m['rem_sens'] * 100:<10.1f} {m['awake_sens'] * 100:<12.1f} "
                f"{m['awake_prec'] * 100:<12.1f} {m['accuracy'] * 100:<10.1f}"
            )

    print("\n" + "=" * 100)
    print("COMPARISON: FIXED vs DYNAMIC THRESHOLD")
    print("=" * 100)

    fixed_best = max(
        [r for r in results if r[0] == "fixed"],
        key=lambda x: x[2]["rem_sens"] * 0.5
        + x[2]["awake_sens"] * 0.3
        + x[2]["awake_prec"] * 0.2,
    )
    dynamic_best = max(
        [r for r in results if r[0] == "dynamic"],
        key=lambda x: x[2]["rem_sens"] * 0.5
        + x[2]["awake_sens"] * 0.3
        + x[2]["awake_prec"] * 0.2,
    )

    print(f"\nBest FIXED (base={fixed_best[1]}):")
    m = fixed_best[2]
    print(
        f"  REM: {m['rem_sens'] * 100:.1f}%, Awake: {m['awake_sens'] * 100:.1f}% sens / {m['awake_prec'] * 100:.1f}% prec"
    )
    print(
        f"  Confusion: awake={m['confusion']['awake']}, nrem={m['confusion']['nrem']}, rem={m['confusion']['rem']}"
    )

    print(f"\nBest DYNAMIC (base={dynamic_best[1]}):")
    m = dynamic_best[2]
    print(
        f"  REM: {m['rem_sens'] * 100:.1f}%, Awake: {m['awake_sens'] * 100:.1f}% sens / {m['awake_prec'] * 100:.1f}% prec"
    )
    print(
        f"  Confusion: awake={m['confusion']['awake']}, nrem={m['confusion']['nrem']}, rem={m['confusion']['rem']}"
    )

    # Show threshold values at different times
    print("\n" + "=" * 100)
    print("DYNAMIC THRESHOLD VALUES BY TIME")
    print("=" * 100)
    print(f"\n{'Minutes':<12} {'Awake Prior':<15} {'Threshold (base=3.0)':<20}")
    print("-" * 50)
    for mins in [0, 15, 30, 45, 60, 75, 90, 120, 180, 240, 300, 330, 360, 420, 480]:
        prior = get_awake_prior(mins)
        thresh = get_dynamic_threshold(mins, 3.0)
        print(f"{mins:<12} {prior:<15.2f} {thresh:<20.1f}")


if __name__ == "__main__":
    main()
