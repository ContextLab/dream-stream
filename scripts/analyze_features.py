#!/usr/bin/env python3
"""Analyze actual feature distributions by sleep stage to find optimal thresholds."""

import json
import sys
from datetime import datetime
from collections import defaultdict
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
        return None
    diffs_sq = [(hrs[i] - hrs[i - 1]) ** 2 for i in range(1, len(hrs))]
    return math.sqrt(sum(diffs_sq) / len(diffs_sq))


def main():
    json_path = sys.argv[1] if len(sys.argv) > 1 else "notes/raw_sleep_data.json"
    hr_samples, sleep_stages = load_data(json_path)

    print(f"Loaded {len(sleep_stages)} stages, {len(hr_samples)} HR samples")

    session_start = sleep_stages[0]["start"]

    WINDOW = 15
    features_by_stage = {"awake": [], "nrem": [], "rem": []}

    recent_hrs = []
    hr_idx = 0

    for stage_rec in sleep_stages:
        actual = stage_rec["stage"]
        start = stage_rec["start"]
        end = stage_rec["end"]

        stage_hr_samples = [hr for hr in hr_samples if start <= hr["time"] <= end]

        for hr in stage_hr_samples:
            recent_hrs.append(hr["bpm"])
            if len(recent_hrs) > WINDOW:
                recent_hrs.pop(0)

            if len(recent_hrs) >= 5:
                rmssd = compute_rmssd(recent_hrs)
                hr_std = statistics.stdev(recent_hrs)
                hr_mean = statistics.mean(recent_hrs)
                minutes = (hr["time"] - session_start).total_seconds() / 60

                features_by_stage[actual].append(
                    {
                        "rmssd": rmssd,
                        "std": hr_std,
                        "mean": hr_mean,
                        "minutes": minutes,
                        "hr": hr["bpm"],
                    }
                )

    print("\n" + "=" * 70)
    print("FEATURE DISTRIBUTIONS BY STAGE (window=15)")
    print("=" * 70)

    for stage in ["awake", "nrem", "rem"]:
        samples = features_by_stage[stage]
        if len(samples) < 10:
            print(f"\n{stage.upper()}: insufficient samples ({len(samples)})")
            continue

        rmssd_vals = [s["rmssd"] for s in samples if s["rmssd"] is not None]
        std_vals = [s["std"] for s in samples]
        mean_vals = [s["mean"] for s in samples]

        print(f"\n{stage.upper()} ({len(samples)} samples):")
        print(
            f"  RMSSD:  mean={statistics.mean(rmssd_vals):.2f}, std={statistics.stdev(rmssd_vals):.2f}, "
            f"min={min(rmssd_vals):.2f}, max={max(rmssd_vals):.2f}"
        )
        print(
            f"  HR Std: mean={statistics.mean(std_vals):.2f}, std={statistics.stdev(std_vals):.2f}, "
            f"min={min(std_vals):.2f}, max={max(std_vals):.2f}"
        )
        print(
            f"  HR:     mean={statistics.mean(mean_vals):.1f}, std={statistics.stdev(mean_vals):.1f}"
        )

        rmssd_sorted = sorted(rmssd_vals)
        std_sorted = sorted(std_vals)

        def percentile(arr, p):
            idx = int(len(arr) * p)
            return arr[min(idx, len(arr) - 1)]

        print(
            f"  RMSSD percentiles: P10={percentile(rmssd_sorted, 0.1):.2f}, P25={percentile(rmssd_sorted, 0.25):.2f}, "
            f"P50={percentile(rmssd_sorted, 0.5):.2f}, P75={percentile(rmssd_sorted, 0.75):.2f}, P90={percentile(rmssd_sorted, 0.9):.2f}"
        )
        print(
            f"  Std percentiles:   P10={percentile(std_sorted, 0.1):.2f}, P25={percentile(std_sorted, 0.25):.2f}, "
            f"P50={percentile(std_sorted, 0.5):.2f}, P75={percentile(std_sorted, 0.75):.2f}, P90={percentile(std_sorted, 0.9):.2f}"
        )

    print("\n" + "=" * 70)
    print("OVERLAP ANALYSIS")
    print("=" * 70)

    rem_rmssd = [s["rmssd"] for s in features_by_stage["rem"] if s["rmssd"]]
    nrem_rmssd = [s["rmssd"] for s in features_by_stage["nrem"] if s["rmssd"]]
    awake_rmssd = [s["rmssd"] for s in features_by_stage["awake"] if s["rmssd"]]

    rem_std = [s["std"] for s in features_by_stage["rem"]]
    nrem_std = [s["std"] for s in features_by_stage["nrem"]]
    awake_std = [s["std"] for s in features_by_stage["awake"]]

    print("\nRMSSD ranges:")
    print(f"  REM:   {min(rem_rmssd):.2f} - {max(rem_rmssd):.2f}")
    print(f"  NREM:  {min(nrem_rmssd):.2f} - {max(nrem_rmssd):.2f}")
    print(f"  Awake: {min(awake_rmssd):.2f} - {max(awake_rmssd):.2f}")

    print("\nHR Std ranges:")
    print(f"  REM:   {min(rem_std):.2f} - {max(rem_std):.2f}")
    print(f"  NREM:  {min(nrem_std):.2f} - {max(nrem_std):.2f}")
    print(f"  Awake: {min(awake_std):.2f} - {max(awake_std):.2f}")

    print("\n" + "=" * 70)
    print("THRESHOLD SWEEP: Find optimal thresholds")
    print("=" * 70)

    all_samples = []
    for stage, samples in features_by_stage.items():
        for s in samples:
            all_samples.append({"stage": stage, **s})

    best_f1 = 0
    best_params = None

    for rmssd_rem_thresh in [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]:
        for rmssd_awake_thresh in [4.0, 5.0, 6.0, 7.0, 8.0, 10.0]:
            if rmssd_awake_thresh <= rmssd_rem_thresh:
                continue

            confusion = {
                s: {"awake": 0, "nrem": 0, "rem": 0} for s in ["awake", "nrem", "rem"]
            }

            for s in all_samples:
                rmssd = s["rmssd"]
                minutes = s["minutes"]
                actual = s["stage"]

                if minutes < 70:
                    predicted = "awake" if rmssd > rmssd_awake_thresh else "nrem"
                elif rmssd < rmssd_rem_thresh:
                    predicted = "rem"
                elif rmssd > rmssd_awake_thresh:
                    predicted = "awake"
                else:
                    predicted = "nrem"

                confusion[actual][predicted] += 1

            rem_tp = confusion["rem"]["rem"]
            rem_fn = confusion["rem"]["awake"] + confusion["rem"]["nrem"]
            rem_fp = confusion["awake"]["rem"] + confusion["nrem"]["rem"]

            sens = rem_tp / (rem_tp + rem_fn) if (rem_tp + rem_fn) > 0 else 0
            prec = rem_tp / (rem_tp + rem_fp) if (rem_tp + rem_fp) > 0 else 0
            f1 = 2 * prec * sens / (prec + sens) if (prec + sens) > 0 else 0

            if f1 > best_f1:
                best_f1 = f1
                best_params = {
                    "rmssd_rem": rmssd_rem_thresh,
                    "rmssd_awake": rmssd_awake_thresh,
                    "sens": sens,
                    "prec": prec,
                    "f1": f1,
                }

    print(f"\nBest RMSSD thresholds (REM F1={best_f1 * 100:.1f}%):")
    print(f"  REM threshold:   < {best_params['rmssd_rem']}")
    print(f"  Awake threshold: > {best_params['rmssd_awake']}")
    print(f"  Sensitivity: {best_params['sens'] * 100:.1f}%")
    print(f"  Precision:   {best_params['prec'] * 100:.1f}%")

    print("\n" + "=" * 70)
    print("THRESHOLD SWEEP: HR Std")
    print("=" * 70)

    best_f1 = 0
    best_params = None

    for std_rem_thresh in [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]:
        for std_awake_thresh in [5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0]:
            if std_awake_thresh <= std_rem_thresh:
                continue

            confusion = {
                s: {"awake": 0, "nrem": 0, "rem": 0} for s in ["awake", "nrem", "rem"]
            }

            for s in all_samples:
                hr_std = s["std"]
                minutes = s["minutes"]
                actual = s["stage"]

                if minutes < 70:
                    predicted = "awake" if hr_std > std_awake_thresh else "nrem"
                elif hr_std < std_rem_thresh:
                    predicted = "rem"
                elif hr_std > std_awake_thresh:
                    predicted = "awake"
                else:
                    predicted = "nrem"

                confusion[actual][predicted] += 1

            rem_tp = confusion["rem"]["rem"]
            rem_fn = confusion["rem"]["awake"] + confusion["rem"]["nrem"]
            rem_fp = confusion["awake"]["rem"] + confusion["nrem"]["rem"]

            sens = rem_tp / (rem_tp + rem_fn) if (rem_tp + rem_fn) > 0 else 0
            prec = rem_tp / (rem_tp + rem_fp) if (rem_tp + rem_fp) > 0 else 0
            f1 = 2 * prec * sens / (prec + sens) if (prec + sens) > 0 else 0

            if f1 > best_f1:
                best_f1 = f1
                best_params = {
                    "std_rem": std_rem_thresh,
                    "std_awake": std_awake_thresh,
                    "sens": sens,
                    "prec": prec,
                    "f1": f1,
                }

    print(f"\nBest HR Std thresholds (REM F1={best_f1 * 100:.1f}%):")
    print(f"  REM threshold:   < {best_params['std_rem']}")
    print(f"  Awake threshold: > {best_params['std_awake']}")
    print(f"  Sensitivity: {best_params['sens'] * 100:.1f}%")
    print(f"  Precision:   {best_params['prec'] * 100:.1f}%")


if __name__ == "__main__":
    main()
