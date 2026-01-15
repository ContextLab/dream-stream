#!/usr/bin/env python3
"""
Analyze HR patterns during different sleep stages from Fitbit data.
Goal: Find physiological markers that distinguish REM from NREM.
"""

import json
import sys
from datetime import datetime
from collections import defaultdict
import statistics


def parse_time(time_str):
    try:
        return datetime.fromisoformat(time_str.replace("Z", "+00:00"))
    except ValueError:
        return None


def analyze_data(json_path):
    with open(json_path) as f:
        data = json.load(f)

    print(f"Sleep stages: {len(data['sleepStages'])}")
    print(f"HR samples: {len(data['hrSamples'])}")
    print()

    # Convert HR samples to a lookup by minute
    hr_by_minute = {}
    for sample in data["hrSamples"]:
        t = parse_time(sample["time"])
        if t is None:
            continue
        key = t.replace(second=0, microsecond=0)
        hr_by_minute[key] = sample["bpm"]

    # Analyze HR within each sleep stage
    stage_hrs = defaultdict(list)
    stage_hr_diffs = defaultdict(list)  # Successive differences for HRV proxy

    # Map stages to 3-class
    stage_map = {"awake": "awake", "light": "nrem", "deep": "nrem", "rem": "rem"}

    for stage_record in data["sleepStages"]:
        stage = stage_map.get(stage_record["stage"], "unknown")
        if stage == "unknown":
            continue

        start = parse_time(stage_record["startTime"])
        end = parse_time(stage_record["endTime"])

        # Find all HR samples in this stage
        current = start.replace(second=0, microsecond=0)
        prev_hr = None
        while current <= end:
            if current in hr_by_minute:
                hr = hr_by_minute[current]
                stage_hrs[stage].append(hr)
                if prev_hr is not None:
                    stage_hr_diffs[stage].append(abs(hr - prev_hr))
                prev_hr = hr
            current = (
                current.replace(minute=current.minute + 1)
                if current.minute < 59
                else current.replace(hour=current.hour + 1, minute=0)
            )

    print("=" * 60)
    print("HR Statistics by Sleep Stage (3-class)")
    print("=" * 60)

    for stage in ["awake", "nrem", "rem"]:
        hrs = stage_hrs[stage]
        diffs = stage_hr_diffs[stage]

        if len(hrs) < 5:
            print(f"\n{stage.upper()}: Insufficient data ({len(hrs)} samples)")
            continue

        print(f"\n{stage.upper()} ({len(hrs)} samples):")
        print(f"  HR Mean: {statistics.mean(hrs):.1f} bpm")
        print(f"  HR Std:  {statistics.stdev(hrs):.1f} bpm")
        print(f"  HR Min:  {min(hrs)} bpm")
        print(f"  HR Max:  {max(hrs)} bpm")
        print(f"  HR Range: {max(hrs) - min(hrs)} bpm")

        if len(diffs) >= 2:
            print(
                f"  HR Diff Mean: {statistics.mean(diffs):.2f} bpm (successive differences)"
            )
            print(f"  HR Diff Std:  {statistics.stdev(diffs):.2f} bpm")
            # RMSSD proxy
            rmssd = (sum(d**2 for d in diffs) / len(diffs)) ** 0.5
            print(f"  RMSSD proxy: {rmssd:.2f} bpm")

        # Percentiles
        hrs_sorted = sorted(hrs)
        p10 = hrs_sorted[int(len(hrs) * 0.1)]
        p25 = hrs_sorted[int(len(hrs) * 0.25)]
        p50 = hrs_sorted[int(len(hrs) * 0.5)]
        p75 = hrs_sorted[int(len(hrs) * 0.75)]
        p90 = hrs_sorted[int(len(hrs) * 0.9)]
        print(f"  Percentiles: P10={p10}, P25={p25}, P50={p50}, P75={p75}, P90={p90}")

    # Look for patterns in HR transitions
    print("\n" + "=" * 60)
    print("HR Change Analysis (looking for transition patterns)")
    print("=" * 60)

    # Analyze HR changes around stage transitions
    stages_sorted = sorted(data["sleepStages"], key=lambda x: x["startTime"])

    transitions = defaultdict(list)
    for i in range(1, len(stages_sorted)):
        prev_stage = stage_map.get(stages_sorted[i - 1]["stage"], "unknown")
        curr_stage = stage_map.get(stages_sorted[i]["stage"], "unknown")

        if prev_stage == "unknown" or curr_stage == "unknown":
            continue

        # Get HR at transition point
        transition_time = parse_time(stages_sorted[i]["startTime"]).replace(
            second=0, microsecond=0
        )

        # Get HR in 5 min before and after
        hr_before = []
        hr_after = []
        for offset in range(-5, 0):
            t = transition_time.replace(minute=(transition_time.minute + offset) % 60)
            if offset < 0 and transition_time.minute + offset < 0:
                t = t.replace(
                    hour=t.hour - 1, minute=60 + offset + transition_time.minute
                )
            if t in hr_by_minute:
                hr_before.append(hr_by_minute[t])

        for offset in range(0, 5):
            t = transition_time.replace(minute=(transition_time.minute + offset) % 60)
            if transition_time.minute + offset >= 60:
                t = t.replace(
                    hour=t.hour + 1, minute=offset - (60 - transition_time.minute)
                )
            if t in hr_by_minute:
                hr_after.append(hr_by_minute[t])

        if hr_before and hr_after:
            change = statistics.mean(hr_after) - statistics.mean(hr_before)
            transitions[f"{prev_stage}->{curr_stage}"].append(change)

    print("\nAverage HR change at transitions:")
    for trans, changes in sorted(transitions.items()):
        if len(changes) >= 3:
            print(f"  {trans}: {statistics.mean(changes):+.1f} bpm (n={len(changes)})")

    # Look at HR variance in sliding windows
    print("\n" + "=" * 60)
    print("Sliding Window HR Variance Analysis")
    print("=" * 60)

    # For each stage, compute variance in 10-minute windows
    for stage in ["awake", "nrem", "rem"]:
        variances = []
        for stage_record in data["sleepStages"]:
            if stage_map.get(stage_record["stage"]) != stage:
                continue

            start = parse_time(stage_record["startTime"])
            end = parse_time(stage_record["endTime"])
            duration_min = (end - start).total_seconds() / 60

            if duration_min < 10:
                continue

            # Get HR samples in this stage
            hrs_in_stage = []
            current = start.replace(second=0, microsecond=0)
            while current <= end:
                if current in hr_by_minute:
                    hrs_in_stage.append(hr_by_minute[current])
                current = (
                    current.replace(minute=current.minute + 1)
                    if current.minute < 59
                    else current.replace(hour=current.hour + 1, minute=0)
                )

            if len(hrs_in_stage) >= 5:
                variances.append(statistics.variance(hrs_in_stage))

        if variances:
            print(f"\n{stage.upper()} HR Variance (within continuous epochs):")
            print(f"  Mean variance: {statistics.mean(variances):.2f}")
            print(f"  Median variance: {statistics.median(variances):.2f}")
            if len(variances) >= 2:
                print(f"  Variance std: {statistics.stdev(variances):.2f}")


if __name__ == "__main__":
    json_path = sys.argv[1] if len(sys.argv) > 1 else "notes/raw_sleep_data.json"
    analyze_data(json_path)
