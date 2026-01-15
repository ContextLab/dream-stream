#!/usr/bin/env python3
"""
Debug classifier - outputs intermediate values for exact comparison with TypeScript.
"""

import json
import sys
from datetime import datetime
import statistics
import math


def parse_time(time_str):
    try:
        return datetime.fromisoformat(time_str.replace("Z", "+00:00"))
    except ValueError:
        return None


def load_data(json_path):
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


def compute_rmssd(hrs):
    if len(hrs) < 2:
        return 10.0
    diffs_sq = [(hrs[i] - hrs[i - 1]) ** 2 for i in range(1, len(hrs))]
    return math.sqrt(sum(diffs_sq) / len(diffs_sq))


def compute_cv(values):
    if len(values) < 3:
        return 0.5
    mean_val = sum(values) / len(values)
    if mean_val < 0.1:
        return 0.5
    variance = sum((v - mean_val) ** 2 for v in values) / len(values)
    return math.sqrt(variance) / mean_val


def get_time_rem_prob(minutes):
    if minutes < 70:
        return 0.0
    cycle = int(minutes / 90)
    position = (minutes % 90) / 90
    base_prob = min(0.35, 0.10 + cycle * 0.08)
    if position >= 0.65:
        return base_prob * 2.0
    else:
        return base_prob * 0.3


CV_THRESHOLD = 0.20
REM_CONSECUTIVE_REQUIRED = 2


def main():
    json_path = sys.argv[1] if len(sys.argv) > 1 else "notes/raw_sleep_data.json"
    hr_samples, sleep_stages = load_data(json_path)

    print(f"Loaded {len(hr_samples)} HR samples, {len(sleep_stages)} sleep stages")
    print(f"First HR: {hr_samples[0]}")
    print(f"First stage: {sleep_stages[0]}")
    print()

    sessions = []
    current = [sleep_stages[0]]
    for i in range(1, len(sleep_stages)):
        gap = (
            sleep_stages[i]["start"] - sleep_stages[i - 1]["end"]
        ).total_seconds() / 3600
        if gap > 4:
            sessions.append(current)
            current = []
        current.append(sleep_stages[i])
    if current:
        sessions.append(current)

    print(f"Found {len(sessions)} sessions")

    session = sessions[0]
    session_start = session[0]["start"]
    print(f"\nProcessing first session starting {session_start}")
    print(f"Session has {len(session)} stages")

    recent_hrs = []
    rmssd_history = []
    consecutive_rem_signals = 0
    prev_stage = "nrem"

    MAX_RECENT = 20
    MAX_RMSSD_HISTORY = 10

    sample_count = 0
    rem_predictions = 0
    actual_rem = 0
    correct_rem = 0

    print("\n" + "=" * 100)
    print("STEP-BY-STEP DEBUG (first 50 samples with REM potential)")
    print("=" * 100)

    debug_count = 0

    for stage_rec in session:
        actual = stage_rec["stage"]
        start = stage_rec["start"]
        end = stage_rec["end"]

        matching_hr = [hr for hr in hr_samples if start <= hr["time"] <= end]
        matching_hr.sort(key=lambda x: x["time"])

        for hr in matching_hr:
            recent_hrs.append(hr["bpm"])
            if len(recent_hrs) > MAX_RECENT:
                recent_hrs.pop(0)

            rmssd = compute_rmssd(recent_hrs)
            rmssd_history.append(rmssd)
            if len(rmssd_history) > MAX_RMSSD_HISTORY:
                rmssd_history.pop(0)

            minutes = (hr["time"] - session_start).total_seconds() / 60
            cv = compute_cv(rmssd_history)
            time_rem_prob = get_time_rem_prob(minutes)

            cv_rem_signal = 1.0 if cv < CV_THRESHOLD else 0.0
            strong_cv = cv < CV_THRESHOLD * 0.7

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
                hr_std = statistics.stdev(recent_hrs) if len(recent_hrs) >= 3 else 0
                if cv > 0.5 and hr_std > 5:
                    predicted = "awake"
                else:
                    predicted = "nrem"

            if prev_stage == "rem" and predicted != "rem" and rem_score > 0.15:
                predicted = "rem"

            sample_count += 1
            if predicted == "rem":
                rem_predictions += 1
            if actual == "rem":
                actual_rem += 1
                if predicted == "rem":
                    correct_rem += 1

            if minutes >= 70 and debug_count < 50:
                print(
                    f"\nSample {sample_count}: actual={actual}, minutes={minutes:.1f}"
                )
                print(
                    f"  recent_hrs ({len(recent_hrs)}): last 5 = {recent_hrs[-5:] if len(recent_hrs) >= 5 else recent_hrs}"
                )
                print(f"  rmssd={rmssd:.4f}")
                print(
                    f"  rmssd_history ({len(rmssd_history)}): {[f'{x:.3f}' for x in rmssd_history]}"
                )
                print(f"  cv={cv:.4f}")
                print(f"  time_rem_prob={time_rem_prob:.4f}")
                print(f"  cv_rem_signal={cv_rem_signal}, strong_cv={strong_cv}")
                print(f"  rem_score={rem_score:.4f}")
                print(f"  consecutive_rem_signals={consecutive_rem_signals}")
                print(f"  predicted={predicted}")
                debug_count += 1

            prev_stage = predicted

    print("\n" + "=" * 100)
    print("SUMMARY")
    print("=" * 100)
    print(f"Total samples: {sample_count}")
    print(f"Actual REM samples: {actual_rem}")
    print(f"REM predictions: {rem_predictions}")
    print(f"Correct REM: {correct_rem}")
    if actual_rem > 0:
        print(f"REM Sensitivity: {correct_rem / actual_rem * 100:.1f}%")


if __name__ == "__main__":
    main()
