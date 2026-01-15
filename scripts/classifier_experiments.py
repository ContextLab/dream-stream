#!/usr/bin/env python3
"""
Experiment with different ML approaches for sleep stage classification.
Goal: Find the best way to classify REM vs NREM vs Awake from sparse HR data.
"""

import json
import sys
from datetime import datetime, timedelta
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


class KalmanFilter1D:
    """Simple 1D Kalman filter for HR smoothing."""

    def __init__(
        self, process_variance=0.1, measurement_variance=4.0, initial_estimate=50.0
    ):
        self.process_variance = process_variance
        self.measurement_variance = measurement_variance
        self.estimate = initial_estimate
        self.error_estimate = 1.0
        self.last_time = None

    def update(self, measurement, timestamp):
        if self.last_time is not None:
            dt = (timestamp - self.last_time).total_seconds() / 60.0
            self.error_estimate += self.process_variance * dt

        kalman_gain = self.error_estimate / (
            self.error_estimate + self.measurement_variance
        )
        self.estimate = self.estimate + kalman_gain * (measurement - self.estimate)
        self.error_estimate = (1 - kalman_gain) * self.error_estimate
        self.last_time = timestamp

        return self.estimate


class ExponentialMovingAverage:
    """EMA for streaming HR estimates."""

    def __init__(self, alpha=0.3):
        self.alpha = alpha
        self.value = None

    def update(self, measurement):
        if self.value is None:
            self.value = measurement
        else:
            self.value = self.alpha * measurement + (1 - self.alpha) * self.value
        return self.value


class AdaptiveRMSSD:
    """Compute RMSSD with adaptive windowing based on sample density."""

    def __init__(self, min_window=5, max_window=30, time_weight_decay=0.1):
        self.samples = []
        self.min_window = min_window
        self.max_window = max_window
        self.time_weight_decay = time_weight_decay

    def add_sample(self, hr, timestamp):
        self.samples.append({"hr": hr, "time": timestamp})
        if len(self.samples) > self.max_window:
            self.samples.pop(0)

    def compute(self, current_time):
        if len(self.samples) < 2:
            return 10.0

        weights = []
        hrs = []
        for s in self.samples:
            age_minutes = (current_time - s["time"]).total_seconds() / 60.0
            weight = math.exp(-self.time_weight_decay * age_minutes)
            weights.append(weight)
            hrs.append(s["hr"])

        if len(hrs) < 2:
            return 10.0

        weighted_diffs_sq = []
        for i in range(1, len(hrs)):
            diff = hrs[i] - hrs[i - 1]
            avg_weight = (weights[i] + weights[i - 1]) / 2
            weighted_diffs_sq.append(avg_weight * diff * diff)

        if not weighted_diffs_sq:
            return 10.0

        total_weight = sum(
            (weights[i] + weights[i - 1]) / 2 for i in range(1, len(weights))
        )
        if total_weight == 0:
            return 10.0

        return math.sqrt(sum(weighted_diffs_sq) / total_weight)


def compute_metrics(confusion):
    total = sum(sum(row.values()) for row in confusion.values())
    correct = sum(confusion[s][s] for s in ["awake", "nrem", "rem"])
    accuracy = correct / total if total > 0 else 0

    rem_tp = confusion["rem"]["rem"]
    rem_fn = confusion["rem"]["awake"] + confusion["rem"]["nrem"]
    rem_fp = confusion["awake"]["rem"] + confusion["nrem"]["rem"]
    rem_tn = (
        confusion["awake"]["awake"]
        + confusion["awake"]["nrem"]
        + confusion["nrem"]["awake"]
        + confusion["nrem"]["nrem"]
    )

    rem_sensitivity = rem_tp / (rem_tp + rem_fn) if (rem_tp + rem_fn) > 0 else 0
    rem_specificity = rem_tn / (rem_tn + rem_fp) if (rem_tn + rem_fp) > 0 else 0

    rem_precision = rem_tp / (rem_tp + rem_fp) if (rem_tp + rem_fp) > 0 else 0
    rem_f1 = (
        2 * rem_precision * rem_sensitivity / (rem_precision + rem_sensitivity)
        if (rem_precision + rem_sensitivity) > 0
        else 0
    )

    return {
        "accuracy": accuracy,
        "rem_sensitivity": rem_sensitivity,
        "rem_specificity": rem_specificity,
        "rem_precision": rem_precision,
        "rem_f1": rem_f1,
    }


def run_experiment(hr_samples, sleep_stages, classifier_fn, name):
    """Run a classification experiment and return metrics."""
    confusion = {
        "awake": {"awake": 0, "nrem": 0, "rem": 0},
        "nrem": {"awake": 0, "nrem": 0, "rem": 0},
        "rem": {"awake": 0, "nrem": 0, "rem": 0},
    }

    session_start = sleep_stages[0]["start"]

    for stage_rec in sleep_stages:
        actual = stage_rec["stage"]
        start = stage_rec["start"]
        end = stage_rec["end"]

        stage_hr_samples = [hr for hr in hr_samples if start <= hr["time"] <= end]

        for hr in stage_hr_samples:
            minutes = (hr["time"] - session_start).total_seconds() / 60
            predicted = classifier_fn(hr["bpm"], hr["time"], minutes)
            confusion[actual][predicted] += 1

    metrics = compute_metrics(confusion)

    print(f"\n{'=' * 60}")
    print(f"EXPERIMENT: {name}")
    print(f"{'=' * 60}")
    print(f"Accuracy:        {metrics['accuracy'] * 100:5.1f}%")
    print(f"REM Sensitivity: {metrics['rem_sensitivity'] * 100:5.1f}% (recall)")
    print(f"REM Specificity: {metrics['rem_specificity'] * 100:5.1f}%")
    print(f"REM Precision:   {metrics['rem_precision'] * 100:5.1f}%")
    print(f"REM F1 Score:    {metrics['rem_f1'] * 100:5.1f}%")

    return metrics


def main():
    json_path = sys.argv[1] if len(sys.argv) > 1 else "notes/raw_sleep_data.json"
    hr_samples, sleep_stages = load_data(json_path)

    print(f"Data: {len(sleep_stages)} sleep stages, {len(hr_samples)} HR samples")

    session_start = sleep_stages[0]["start"]
    FIRST_REM_LATENCY = 70

    results = {}

    # Experiment 1: Simple RMSSD with fixed window
    print("\n" + "=" * 70)
    print("EXPERIMENT 1: Simple RMSSD (baseline)")
    print("=" * 70)

    for window_size in [5, 10, 15, 20, 30]:
        recent_hrs = []

        def simple_rmssd_classifier(hr, timestamp, minutes):
            recent_hrs.append(hr)
            if len(recent_hrs) > window_size:
                recent_hrs.pop(0)

            if len(recent_hrs) < 2:
                return "nrem"

            diffs_sq = [
                (recent_hrs[i] - recent_hrs[i - 1]) ** 2
                for i in range(1, len(recent_hrs))
            ]
            rmssd = math.sqrt(sum(diffs_sq) / len(diffs_sq))

            if minutes < FIRST_REM_LATENCY:
                return "awake" if rmssd > 6.0 else "nrem"

            if rmssd < 3.5:
                return "rem"
            elif rmssd < 6.0:
                return "nrem"
            else:
                return "awake"

        recent_hrs = []
        metrics = run_experiment(
            hr_samples,
            sleep_stages,
            simple_rmssd_classifier,
            f"Simple RMSSD (window={window_size})",
        )
        results[f"simple_rmssd_w{window_size}"] = metrics

    # Experiment 2: Kalman-filtered HR + RMSSD
    print("\n" + "=" * 70)
    print("EXPERIMENT 2: Kalman Filter + RMSSD")
    print("=" * 70)

    for process_var in [0.05, 0.1, 0.2, 0.5]:
        kalman = KalmanFilter1D(process_variance=process_var, measurement_variance=4.0)
        filtered_hrs = []

        def kalman_classifier(hr, timestamp, minutes):
            filtered = kalman.update(hr, timestamp)
            filtered_hrs.append(filtered)
            if len(filtered_hrs) > 20:
                filtered_hrs.pop(0)

            if len(filtered_hrs) < 2:
                return "nrem"

            diffs_sq = [
                (filtered_hrs[i] - filtered_hrs[i - 1]) ** 2
                for i in range(1, len(filtered_hrs))
            ]
            rmssd = math.sqrt(sum(diffs_sq) / len(diffs_sq))

            if minutes < FIRST_REM_LATENCY:
                return "awake" if rmssd > 5.0 else "nrem"

            if rmssd < 2.5:
                return "rem"
            elif rmssd < 5.0:
                return "nrem"
            else:
                return "awake"

        kalman = KalmanFilter1D(process_variance=process_var)
        filtered_hrs = []
        metrics = run_experiment(
            hr_samples,
            sleep_stages,
            kalman_classifier,
            f"Kalman (process_var={process_var})",
        )
        results[f"kalman_pv{process_var}"] = metrics

    # Experiment 3: Adaptive time-weighted RMSSD
    print("\n" + "=" * 70)
    print("EXPERIMENT 3: Adaptive Time-Weighted RMSSD")
    print("=" * 70)

    for decay in [0.05, 0.1, 0.2]:
        adaptive = AdaptiveRMSSD(time_weight_decay=decay)

        def adaptive_classifier(hr, timestamp, minutes):
            adaptive.add_sample(hr, timestamp)
            rmssd = adaptive.compute(timestamp)

            if minutes < FIRST_REM_LATENCY:
                return "awake" if rmssd > 6.0 else "nrem"

            if rmssd < 3.5:
                return "rem"
            elif rmssd < 6.0:
                return "nrem"
            else:
                return "awake"

        adaptive = AdaptiveRMSSD(time_weight_decay=decay)
        metrics = run_experiment(
            hr_samples,
            sleep_stages,
            adaptive_classifier,
            f"Adaptive RMSSD (decay={decay})",
        )
        results[f"adaptive_d{decay}"] = metrics

    # Experiment 4: HR standard deviation instead of RMSSD
    print("\n" + "=" * 70)
    print("EXPERIMENT 4: HR Standard Deviation")
    print("=" * 70)

    for window_size in [10, 20, 30]:
        recent_hrs = []

        def std_classifier(hr, timestamp, minutes):
            recent_hrs.append(hr)
            if len(recent_hrs) > window_size:
                recent_hrs.pop(0)

            if len(recent_hrs) < 3:
                return "nrem"

            hr_std = statistics.stdev(recent_hrs)

            if minutes < FIRST_REM_LATENCY:
                return "awake" if hr_std > 8.0 else "nrem"

            if hr_std < 4.0:
                return "rem"
            elif hr_std < 8.0:
                return "nrem"
            else:
                return "awake"

        recent_hrs = []
        metrics = run_experiment(
            hr_samples,
            sleep_stages,
            std_classifier,
            f"HR Std Dev (window={window_size})",
        )
        results[f"std_w{window_size}"] = metrics

    # Experiment 5: Combined features with voting
    print("\n" + "=" * 70)
    print("EXPERIMENT 5: Combined Features (RMSSD + Std + Mean)")
    print("=" * 70)

    recent_hrs = []
    ema = ExponentialMovingAverage(alpha=0.2)

    def combined_classifier(hr, timestamp, minutes):
        smoothed = ema.update(hr)
        recent_hrs.append(hr)
        if len(recent_hrs) > 20:
            recent_hrs.pop(0)

        if len(recent_hrs) < 3:
            return "nrem"

        hr_mean = statistics.mean(recent_hrs)
        hr_std = statistics.stdev(recent_hrs)
        diffs_sq = [
            (recent_hrs[i] - recent_hrs[i - 1]) ** 2 for i in range(1, len(recent_hrs))
        ]
        rmssd = math.sqrt(sum(diffs_sq) / len(diffs_sq))

        votes = {"awake": 0, "nrem": 0, "rem": 0}

        if minutes < FIRST_REM_LATENCY:
            votes["nrem"] += 2

        if rmssd < 3.0:
            votes["rem"] += 2
        elif rmssd < 5.0:
            votes["nrem"] += 1
        else:
            votes["awake"] += 1

        if hr_std < 4.0:
            votes["rem"] += 1
        elif hr_std < 7.0:
            votes["nrem"] += 1
        else:
            votes["awake"] += 1

        if abs(hr - smoothed) > 5:
            votes["awake"] += 1

        return max(votes, key=votes.get)

    recent_hrs = []
    ema = ExponentialMovingAverage(alpha=0.2)
    metrics = run_experiment(
        hr_samples, sleep_stages, combined_classifier, "Combined Features"
    )
    results["combined"] = metrics

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY: Best Results by Metric")
    print("=" * 70)

    best_f1 = max(results.items(), key=lambda x: x[1]["rem_f1"])
    best_sens = max(results.items(), key=lambda x: x[1]["rem_sensitivity"])
    best_spec = max(results.items(), key=lambda x: x[1]["rem_specificity"])
    best_acc = max(results.items(), key=lambda x: x[1]["accuracy"])

    print(f"\nBest REM F1:          {best_f1[0]} = {best_f1[1]['rem_f1'] * 100:.1f}%")
    print(
        f"Best REM Sensitivity: {best_sens[0]} = {best_sens[1]['rem_sensitivity'] * 100:.1f}%"
    )
    print(
        f"Best REM Specificity: {best_spec[0]} = {best_spec[1]['rem_specificity'] * 100:.1f}%"
    )
    print(f"Best Accuracy:        {best_acc[0]} = {best_acc[1]['accuracy'] * 100:.1f}%")

    print("\n" + "=" * 70)
    print("TOP 5 BY REM F1 SCORE")
    print("=" * 70)

    sorted_by_f1 = sorted(results.items(), key=lambda x: x[1]["rem_f1"], reverse=True)[
        :5
    ]
    for name, m in sorted_by_f1:
        print(
            f"{name:30s}  F1={m['rem_f1'] * 100:5.1f}%  Sens={m['rem_sensitivity'] * 100:5.1f}%  Spec={m['rem_specificity'] * 100:5.1f}%"
        )


if __name__ == "__main__":
    main()
