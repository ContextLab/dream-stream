#!/usr/bin/env python3
"""
Simulate the sleep stage classifier locally to iterate quickly.
Uses the same algorithm as remOptimizedClassifier.ts but in Python.
"""

import json
import sys
from datetime import datetime, timedelta
from collections import defaultdict
import statistics


def parse_time(time_str):
    try:
        return datetime.fromisoformat(time_str.replace("Z", "+00:00"))
    except ValueError:
        return None


def compute_rmssd(hrs):
    """Compute RMSSD (root mean square of successive differences)."""
    if len(hrs) < 2:
        return 10.0  # Default high value
    diffs_squared = [(hrs[i] - hrs[i - 1]) ** 2 for i in range(1, len(hrs))]
    return (sum(diffs_squared) / len(diffs_squared)) ** 0.5


def simulate_classifier(json_path, verbose=False):
    """Run classification simulation and compute metrics."""
    with open(json_path) as f:
        data = json.load(f)

    print(
        f"Data: {len(data['sleepStages'])} sleep stages, {len(data['hrSamples'])} HR samples"
    )
    print()

    # Build HR lookup by time
    hr_samples = []
    for sample in data["hrSamples"]:
        t = parse_time(sample["time"])
        if t:
            hr_samples.append({"bpm": sample["bpm"], "time": t})
    hr_samples.sort(key=lambda x: x["time"])

    # Sort sleep stages by time
    sleep_stages = []
    for stage in data["sleepStages"]:
        start = parse_time(stage["startTime"])
        end = parse_time(stage["endTime"])
        if start and end:
            # Map to 3-class
            stage_3 = {
                "awake": "awake",
                "light": "nrem",
                "deep": "nrem",
                "rem": "rem",
            }.get(stage["stage"], "unknown")
            if stage_3 != "unknown":
                sleep_stages.append({"stage": stage_3, "start": start, "end": end})
    sleep_stages.sort(key=lambda x: x["start"])

    if not sleep_stages:
        print("No valid sleep stages found")
        return

    # Find session start (first sleep stage)
    session_start = sleep_stages[0]["start"]

    # Compute stage statistics from training data (first pass)
    stage_hrs = defaultdict(list)
    for stage_rec in sleep_stages:
        stage = stage_rec["stage"]
        start = stage_rec["start"]
        end = stage_rec["end"]

        # Find HR samples in this stage
        for hr in hr_samples:
            if start <= hr["time"] <= end:
                stage_hrs[stage].append(hr["bpm"])

    # Compute RMSSD per stage
    print("=" * 60)
    print("TRAINING: Learned Stage Statistics")
    print("=" * 60)

    stage_rmssd = {}
    for stage in ["awake", "nrem", "rem"]:
        hrs = stage_hrs[stage]
        if len(hrs) >= 5:
            rmssd = compute_rmssd(hrs)
            stage_rmssd[stage] = rmssd
            print(
                f"{stage.upper()}: RMSSD={rmssd:.2f}, HR={statistics.mean(hrs):.1f}±{statistics.stdev(hrs):.1f} (n={len(hrs)})"
            )
        else:
            stage_rmssd[stage] = {"awake": 8.6, "nrem": 4.3, "rem": 3.0}[stage]
            print(
                f"{stage.upper()}: Using default RMSSD={stage_rmssd[stage]:.2f} (insufficient data)"
            )

    # Compute thresholds
    rem_nrem_threshold = (stage_rmssd["rem"] + stage_rmssd["nrem"]) / 2
    nrem_awake_threshold = (stage_rmssd["nrem"] + stage_rmssd["awake"]) / 2

    print()
    print(
        f"Thresholds: REM/NREM={rem_nrem_threshold:.2f}, NREM/Awake={nrem_awake_threshold:.2f}"
    )
    print()

    # Now simulate classification
    print("=" * 60)
    print("VALIDATION: Simulating Classification")
    print("=" * 60)

    # Confusion matrix
    confusion = {
        "awake": {"awake": 0, "nrem": 0, "rem": 0},
        "nrem": {"awake": 0, "nrem": 0, "rem": 0},
        "rem": {"awake": 0, "nrem": 0, "rem": 0},
    }

    recent_hrs = []
    MAX_RECENT = 20
    FIRST_REM_LATENCY = 70  # minutes

    total = 0
    correct = 0
    predictions = []

    for stage_rec in sleep_stages:
        actual = stage_rec["stage"]
        start = stage_rec["start"]
        end = stage_rec["end"]

        # Find HR samples in this stage
        stage_hr_samples = [hr for hr in hr_samples if start <= hr["time"] <= end]

        for hr in stage_hr_samples:
            # Update recent HR buffer
            recent_hrs.append(hr["bpm"])
            if len(recent_hrs) > MAX_RECENT:
                recent_hrs.pop(0)

            # Compute features
            minutes_since_start = (hr["time"] - session_start).total_seconds() / 60
            local_rmssd = compute_rmssd(recent_hrs)

            # Classify based on RMSSD
            if minutes_since_start < FIRST_REM_LATENCY:
                # Too early for REM
                if local_rmssd >= nrem_awake_threshold:
                    predicted = "awake"
                else:
                    predicted = "nrem"
            else:
                if local_rmssd < rem_nrem_threshold:
                    predicted = "rem"
                elif local_rmssd < nrem_awake_threshold:
                    predicted = "nrem"
                else:
                    predicted = "awake"

            confusion[actual][predicted] += 1
            total += 1
            if actual == predicted:
                correct += 1

            predictions.append(
                {
                    "time": hr["time"],
                    "actual": actual,
                    "predicted": predicted,
                    "rmssd": local_rmssd,
                    "minutes": minutes_since_start,
                }
            )

    # Print results
    print()
    print("Confusion Matrix:")
    print("              Predicted:  Awake    NREM     REM")
    for actual in ["awake", "nrem", "rem"]:
        row = confusion[actual]
        print(
            f"  Actual {actual:5s}:        {row['awake']:5d}   {row['nrem']:5d}   {row['rem']:5d}"
        )

    print()

    # Calculate metrics
    accuracy = correct / total if total > 0 else 0

    # REM sensitivity (recall) = TP / (TP + FN)
    rem_tp = confusion["rem"]["rem"]
    rem_fn = confusion["rem"]["awake"] + confusion["rem"]["nrem"]
    rem_sensitivity = rem_tp / (rem_tp + rem_fn) if (rem_tp + rem_fn) > 0 else 0

    # REM specificity = TN / (TN + FP)
    rem_fp = confusion["awake"]["rem"] + confusion["nrem"]["rem"]
    rem_tn = (
        confusion["awake"]["awake"]
        + confusion["awake"]["nrem"]
        + confusion["nrem"]["awake"]
        + confusion["nrem"]["nrem"]
    )
    rem_specificity = rem_tn / (rem_tn + rem_fp) if (rem_tn + rem_fp) > 0 else 0

    # Per-stage accuracy
    per_stage = {}
    for stage in ["awake", "nrem", "rem"]:
        stage_total = sum(confusion[stage].values())
        per_stage[stage] = (
            confusion[stage][stage] / stage_total if stage_total > 0 else 0
        )

    print(f"Overall Accuracy: {accuracy * 100:.1f}%")
    print(
        f"REM Sensitivity:  {rem_sensitivity * 100:.1f}% (of actual REM, how many detected)"
    )
    print(
        f"REM Specificity:  {rem_specificity * 100:.1f}% (of non-REM, how many correctly rejected)"
    )
    print()
    print(f"Per-stage accuracy:")
    print(f"  Awake: {per_stage['awake'] * 100:.1f}%")
    print(f"  NREM:  {per_stage['nrem'] * 100:.1f}%")
    print(f"  REM:   {per_stage['rem'] * 100:.1f}%")

    # Analyze where REM predictions fail
    print()
    print("=" * 60)
    print("REM DETECTION ANALYSIS")
    print("=" * 60)

    rem_predictions = [p for p in predictions if p["actual"] == "rem"]
    if rem_predictions:
        correct_rem = [p for p in rem_predictions if p["predicted"] == "rem"]
        missed_rem = [p for p in rem_predictions if p["predicted"] != "rem"]

        print(f"\nCorrect REM detections: {len(correct_rem)}")
        if correct_rem:
            rmssd_correct = [p["rmssd"] for p in correct_rem]
            print(f"  RMSSD range: {min(rmssd_correct):.2f} - {max(rmssd_correct):.2f}")
            print(f"  RMSSD mean: {statistics.mean(rmssd_correct):.2f}")

        print(f"\nMissed REM (false negatives): {len(missed_rem)}")
        if missed_rem:
            rmssd_missed = [p["rmssd"] for p in missed_rem]
            print(f"  RMSSD range: {min(rmssd_missed):.2f} - {max(rmssd_missed):.2f}")
            print(f"  RMSSD mean: {statistics.mean(rmssd_missed):.2f}")

            # How many were classified as what?
            missed_as_nrem = sum(1 for p in missed_rem if p["predicted"] == "nrem")
            missed_as_awake = sum(1 for p in missed_rem if p["predicted"] == "awake")
            print(f"  Classified as NREM: {missed_as_nrem}")
            print(f"  Classified as Awake: {missed_as_awake}")

            # Were any in first 70 min?
            early_rem = [p for p in rem_predictions if p["minutes"] < FIRST_REM_LATENCY]
            print(f"  REM samples before {FIRST_REM_LATENCY}min: {len(early_rem)}")

    # False positives analysis
    false_rem = [
        p for p in predictions if p["predicted"] == "rem" and p["actual"] != "rem"
    ]
    if false_rem:
        print(f"\nFalse REM predictions: {len(false_rem)}")
        rmssd_false = [p["rmssd"] for p in false_rem]
        print(f"  RMSSD range: {min(rmssd_false):.2f} - {max(rmssd_false):.2f}")
        print(f"  RMSSD mean: {statistics.mean(rmssd_false):.2f}")
        actual_stages = defaultdict(int)
        for p in false_rem:
            actual_stages[p["actual"]] += 1
        for stage, count in actual_stages.items():
            print(f"  Actually {stage}: {count}")

    return {
        "accuracy": accuracy,
        "rem_sensitivity": rem_sensitivity,
        "rem_specificity": rem_specificity,
        "per_stage": per_stage,
        "confusion": confusion,
        "thresholds": {
            "rem_nrem": rem_nrem_threshold,
            "nrem_awake": nrem_awake_threshold,
        },
    }


if __name__ == "__main__":
    json_path = sys.argv[1] if len(sys.argv) > 1 else "notes/raw_sleep_data.json"
    simulate_classifier(json_path)
