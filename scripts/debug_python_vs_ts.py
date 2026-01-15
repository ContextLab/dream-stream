#!/usr/bin/env python3
"""
Step-by-step debug script that prints intermediate values for classifier.
Run this, then compare output with TypeScript debug logs.

Key values to compare:
1. RMSSD computation from HR samples
2. CV (coefficient of variation) of RMSSD history
3. Time-based REM probability
4. Final remScore
5. consecutiveRemSignals counter
6. Final classification
"""

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
    stage_map = {"awake": "awake", "light": "nrem", "deep": "nrem", "rem": "rem"}
    for stage in data["sleepStages"]:
        start = parse_time(stage["startTime"])
        end = parse_time(stage["endTime"])
        stage_3 = stage_map.get(stage["stage"], "unknown")
        if start and end and stage_3 != "unknown":
            sleep_stages.append({"stage": stage_3, "start": start, "end": end})
    sleep_stages.sort(key=lambda x: x["start"])

    return hr_samples, sleep_stages


def identify_sessions(sleep_stages, gap_hours=4):
    """Group sleep stages into sessions separated by >4 hour gaps."""
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


# ============================================================================
# EXACT COPY of TypeScript algorithm logic (for comparison)
# ============================================================================

ULTRADIAN_CYCLE_MINUTES = 90
CV_THRESHOLD = 0.20  # Must match TypeScript
REM_CONSECUTIVE_REQUIRED = 2
MAX_RECENT_HR_SAMPLES = 20
MAX_RMSSD_HISTORY = 10


def compute_rmssd(hrs):
    """Compute RMSSD from HR values (not RR intervals!)"""
    if len(hrs) < 2:
        return 10.0  # Default value in TS
    sum_sq_diffs = 0
    for i in range(1, len(hrs)):
        diff = hrs[i] - hrs[i - 1]
        sum_sq_diffs += diff * diff
    return math.sqrt(sum_sq_diffs / (len(hrs) - 1))


def compute_cv(values):
    """Compute coefficient of variation of RMSSD history."""
    if len(values) < 3:
        return 0.5  # Default in TS
    mean_val = statistics.mean(values)
    if mean_val < 0.1:
        return 0.5
    # Use population stdev to match TypeScript (which divides by n, not n-1)
    variance = sum((v - mean_val) ** 2 for v in values) / len(values)
    return math.sqrt(variance) / mean_val


def get_time_based_rem_probability(minutes):
    """Time-based REM probability from ultradian rhythm."""
    if minutes < 70:
        return 0.0
    cycle = int(minutes / ULTRADIAN_CYCLE_MINUTES)
    position_in_cycle = (minutes % ULTRADIAN_CYCLE_MINUTES) / ULTRADIAN_CYCLE_MINUTES
    base_prob = min(0.35, 0.10 + cycle * 0.08)
    if position_in_cycle >= 0.65:
        return base_prob * 2.0
    else:
        return base_prob * 0.3


def classify_step(
    minutes,
    rmssd_history,
    consecutive_rem_signals,
    prev_stage,
    recent_hrs,
    debug=False,
):
    """
    Single classification step - mirrors TypeScript classifyWithStatsInternal.
    Returns (stage, new_consecutive_rem_signals, debug_info)
    """
    cv = compute_cv(rmssd_history)
    time_rem_prob = get_time_based_rem_probability(minutes)

    cv_rem_signal = 1.0 if cv < CV_THRESHOLD else 0.0
    strong_cv_signal = cv < CV_THRESHOLD * 0.7

    # remScore formula from TypeScript
    rem_score = (
        0.5 * time_rem_prob
        + 0.5 * cv_rem_signal * 0.5
        + (0.15 if strong_cv_signal else 0)
    )

    new_consecutive = consecutive_rem_signals

    if minutes < 70:
        stage = "nrem"
        new_consecutive = 0
    elif rem_score > 0.25:
        new_consecutive += 1
        if new_consecutive >= REM_CONSECUTIVE_REQUIRED:
            stage = "rem"
        else:
            stage = "nrem"
    else:
        new_consecutive = 0
        # Check for awake
        if len(recent_hrs) >= 3:
            hr_std = statistics.stdev(recent_hrs)
        else:
            hr_std = 0

        if cv > 0.5 and hr_std > 5:
            stage = "awake"
        else:
            stage = "nrem"

    # Hysteresis: stay in REM if previous was REM and score still reasonable
    if prev_stage == "rem" and stage != "rem" and rem_score > 0.15:
        stage = "rem"

    debug_info = {
        "minutes": minutes,
        "cv": cv,
        "time_rem_prob": time_rem_prob,
        "cv_rem_signal": cv_rem_signal,
        "strong_cv_signal": strong_cv_signal,
        "rem_score": rem_score,
        "consecutive_rem_signals": new_consecutive,
        "stage": stage,
        "rmssd_history_len": len(rmssd_history),
    }

    return stage, new_consecutive, debug_info


def run_debug_on_first_session(hr_samples, sleep_stages, max_samples=100):
    """
    Run classifier on first session, printing debug info for each HR sample.
    """
    sessions = identify_sessions(sleep_stages)
    if not sessions:
        print("No sessions found!")
        return

    session = sessions[0]
    print(f"First session: {len(session)} stages")
    print(f"  Start: {session[0]['start']}")
    print(f"  End: {session[-1]['end']}")

    session_start = session[0]["start"]

    # State variables (matching TypeScript)
    recent_hrs = []
    rmssd_history = []
    consecutive_rem_signals = 0
    prev_stage = "nrem"

    # Track predictions vs actuals
    correct = 0
    total = 0
    rem_tp, rem_fn, rem_fp = 0, 0, 0

    sample_count = 0

    print("\n" + "=" * 100)
    print("STEP-BY-STEP DEBUG OUTPUT")
    print("=" * 100)
    print(
        f"{'#':>4} {'min':>6} {'actual':>6} {'pred':>6} {'CV':>6} {'timeP':>6} {'cvSig':>5} {'remSc':>6} {'consec':>6} {'rmssd':>6}"
    )
    print("-" * 100)

    for stage_rec in session:
        actual = stage_rec["stage"]
        start = stage_rec["start"]
        end = stage_rec["end"]

        stage_hrs = [hr for hr in hr_samples if start <= hr["time"] <= end]
        stage_hrs.sort(key=lambda x: x["time"])

        for hr in stage_hrs:
            sample_count += 1
            if sample_count > max_samples:
                break

            # Add HR to recent list (matching TypeScript)
            recent_hrs.append(hr["bpm"])
            if len(recent_hrs) > MAX_RECENT_HR_SAMPLES:
                recent_hrs.pop(0)

            # Compute RMSSD from recent HRs
            rmssd = compute_rmssd(recent_hrs)
            rmssd_history.append(rmssd)
            if len(rmssd_history) > MAX_RMSSD_HISTORY:
                rmssd_history.pop(0)

            # Compute minutes since session start
            minutes = (hr["time"] - session_start).total_seconds() / 60

            # Classify
            predicted, consecutive_rem_signals, debug = classify_step(
                minutes,
                rmssd_history,
                consecutive_rem_signals,
                prev_stage,
                recent_hrs[-5:] if len(recent_hrs) >= 5 else recent_hrs,
            )

            # Track accuracy
            total += 1
            if predicted == actual:
                correct += 1
            if actual == "rem" and predicted == "rem":
                rem_tp += 1
            elif actual == "rem" and predicted != "rem":
                rem_fn += 1
            elif actual != "rem" and predicted == "rem":
                rem_fp += 1

            # Print debug line
            print(
                f"{sample_count:>4} {debug['minutes']:>6.1f} {actual:>6} {predicted:>6} "
                f"{debug['cv']:>6.3f} {debug['time_rem_prob']:>6.3f} {int(debug['cv_rem_signal']):>5} "
                f"{debug['rem_score']:>6.3f} {debug['consecutive_rem_signals']:>6} {rmssd:>6.2f}"
            )

            prev_stage = predicted

        if sample_count > max_samples:
            break

    print("-" * 100)
    print(f"\nSummary (first {min(sample_count, max_samples)} samples):")
    print(f"  Accuracy: {correct}/{total} = {100 * correct / total:.1f}%")
    rem_sens = rem_tp / (rem_tp + rem_fn) if (rem_tp + rem_fn) > 0 else 0
    print(f"  REM Sensitivity: {rem_tp}/{rem_tp + rem_fn} = {100 * rem_sens:.1f}%")
    print(f"  REM False Positives: {rem_fp}")


def main():
    print("Loading data...")
    hr_samples, sleep_stages = load_data()
    print(f"Loaded {len(hr_samples)} HR samples, {len(sleep_stages)} sleep stages")

    print("\n" + "=" * 100)
    print("KEY ALGORITHM PARAMETERS (must match TypeScript)")
    print("=" * 100)
    print(f"  CV_THRESHOLD = {CV_THRESHOLD}")
    print(f"  REM_CONSECUTIVE_REQUIRED = {REM_CONSECUTIVE_REQUIRED}")
    print(f"  MAX_RECENT_HR_SAMPLES = {MAX_RECENT_HR_SAMPLES}")
    print(f"  MAX_RMSSD_HISTORY = {MAX_RMSSD_HISTORY}")
    print(f"  ULTRADIAN_CYCLE_MINUTES = {ULTRADIAN_CYCLE_MINUTES}")

    run_debug_on_first_session(hr_samples, sleep_stages, max_samples=50)

    print("\n" + "=" * 100)
    print("TO DEBUG TypeScript:")
    print("=" * 100)
    print("1. Add console.log statements in classifyWithModel() to print:")
    print("   - minutes, cv, timeRemProb, cvRemSignal, remScore, consecutiveRemSignals")
    print("2. Compare line-by-line with this output")
    print("3. Look for first divergence point")


if __name__ == "__main__":
    main()
