#!/usr/bin/env python3
"""
Hybrid classifier: ultradian rhythm timing + HR feature confirmation.
Primary signal: Are we in a REM window? (cycle-based)
Secondary signal: Does HR stability confirm REM? (CV-based)
"""

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


CYCLE_LENGTH = 90


def is_in_rem_window(minutes):
    if minutes < 70:
        return False, 0.0

    cycle = int(minutes / CYCLE_LENGTH)
    position_in_cycle = (minutes % CYCLE_LENGTH) / CYCLE_LENGTH

    rem_window_start = 0.65
    if position_in_cycle >= rem_window_start:
        rem_duration_factor = min(1.0, 0.3 + cycle * 0.15)
        return True, rem_duration_factor

    return False, 0.0


def get_rem_probability_from_time(minutes):
    if minutes < 70:
        return 0.0

    cycle = int(minutes / CYCLE_LENGTH)
    position_in_cycle = (minutes % CYCLE_LENGTH) / CYCLE_LENGTH

    base_prob = min(0.35, 0.10 + cycle * 0.08)

    if position_in_cycle >= 0.65:
        return base_prob * 2.0
    elif position_in_cycle >= 0.50:
        return base_prob * 1.3
    else:
        return base_prob * 0.3


class HybridClassifier:
    def __init__(self, cv_threshold=0.30, rem_time_weight=0.6, rem_cv_weight=0.4):
        self.cv_threshold = cv_threshold
        self.rem_time_weight = rem_time_weight
        self.rem_cv_weight = rem_cv_weight

        self.hrs = []
        self.rmssd_history = []
        self.prev_stage = "nrem"
        self.consecutive_rem_signals = 0

    def reset(self):
        self.hrs = []
        self.rmssd_history = []
        self.prev_stage = "nrem"
        self.consecutive_rem_signals = 0

    def add_hr(self, hr):
        self.hrs.append(hr)
        if len(self.hrs) > 15:
            self.hrs.pop(0)

        if len(self.hrs) >= 3:
            diffs_sq = [
                (self.hrs[i] - self.hrs[i - 1]) ** 2 for i in range(1, len(self.hrs))
            ]
            rmssd = math.sqrt(sum(diffs_sq) / len(diffs_sq))
            self.rmssd_history.append(rmssd)
            if len(self.rmssd_history) > 10:
                self.rmssd_history.pop(0)

    def get_cv(self):
        if len(self.rmssd_history) < 3:
            return 0.5
        mean_r = statistics.mean(self.rmssd_history)
        if mean_r < 0.1:
            return 0.5
        std_r = statistics.stdev(self.rmssd_history)
        return std_r / mean_r

    def classify(self, minutes):
        cv = self.get_cv()

        time_rem_prob = get_rem_probability_from_time(minutes)

        cv_rem_signal = 1.0 if cv < self.cv_threshold else 0.0
        if cv < self.cv_threshold * 0.7:
            cv_rem_signal = 1.5

        rem_score = (
            self.rem_time_weight * time_rem_prob
            + self.rem_cv_weight * cv_rem_signal * 0.5
        )

        if minutes < 70:
            predicted = "nrem"
        elif rem_score > 0.25:
            self.consecutive_rem_signals += 1
            if self.consecutive_rem_signals >= 2:
                predicted = "rem"
            else:
                predicted = "nrem"
        else:
            self.consecutive_rem_signals = 0

            if cv > 0.5 and len(self.hrs) >= 5:
                hr_std = statistics.stdev(self.hrs[-5:])
                if hr_std > 5:
                    predicted = "awake"
                else:
                    predicted = "nrem"
            else:
                predicted = "nrem"

        if self.prev_stage == "rem" and predicted != "rem":
            if rem_score > 0.15:
                predicted = "rem"

        self.prev_stage = predicted
        return predicted, rem_score, cv


def run_hybrid_classifier(
    hr_samples, sleep_stages, cv_threshold=0.30, rem_time_weight=0.6, rem_cv_weight=0.4
):
    sessions = identify_sessions(sleep_stages)

    confusion = {
        s: {t: 0 for t in ["awake", "nrem", "rem"]} for s in ["awake", "nrem", "rem"]
    }
    all_predictions = []

    for session in sessions:
        if len(session) < 5:
            continue

        session_start = session[0]["start"]
        classifier = HybridClassifier(cv_threshold, rem_time_weight, rem_cv_weight)

        for stage_rec in session:
            actual = stage_rec["stage"]
            start = stage_rec["start"]
            end = stage_rec["end"]

            stage_hrs = [hr for hr in hr_samples if start <= hr["time"] <= end]

            for hr in stage_hrs:
                classifier.add_hr(hr["bpm"])
                minutes = (hr["time"] - session_start).total_seconds() / 60
                predicted, rem_score, cv = classifier.classify(minutes)

                confusion[actual][predicted] += 1
                all_predictions.append(
                    {
                        "actual": actual,
                        "predicted": predicted,
                        "rem_score": rem_score,
                        "cv": cv,
                        "minutes": minutes,
                    }
                )

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

    rem_sens = rem_tp / (rem_tp + rem_fn) if (rem_tp + rem_fn) > 0 else 0
    rem_spec = rem_tn / (rem_tn + rem_fp) if (rem_tn + rem_fp) > 0 else 0
    rem_prec = rem_tp / (rem_tp + rem_fp) if (rem_tp + rem_fp) > 0 else 0
    rem_f1 = (
        2 * rem_prec * rem_sens / (rem_prec + rem_sens)
        if (rem_prec + rem_sens) > 0
        else 0
    )

    return {
        "accuracy": accuracy,
        "rem_sensitivity": rem_sens,
        "rem_specificity": rem_spec,
        "rem_precision": rem_prec,
        "rem_f1": rem_f1,
        "confusion": confusion,
        "predictions": all_predictions,
    }


def main():
    json_path = sys.argv[1] if len(sys.argv) > 1 else "notes/raw_sleep_data.json"
    hr_samples, sleep_stages = load_data(json_path)

    print(f"Data: {len(sleep_stages)} stages, {len(hr_samples)} HR samples")

    print("\n" + "=" * 70)
    print("HYBRID CLASSIFIER PARAMETER SWEEP")
    print("=" * 70)

    best_f1 = 0
    best_params = None
    best_result = None

    for cv_thresh in [0.20, 0.25, 0.30, 0.35, 0.40]:
        for time_weight in [0.4, 0.5, 0.6, 0.7, 0.8]:
            cv_weight = 1.0 - time_weight

            result = run_hybrid_classifier(
                hr_samples,
                sleep_stages,
                cv_threshold=cv_thresh,
                rem_time_weight=time_weight,
                rem_cv_weight=cv_weight,
            )

            if result["rem_f1"] > best_f1:
                best_f1 = result["rem_f1"]
                best_params = {"cv_thresh": cv_thresh, "time_weight": time_weight}
                best_result = result

    print(
        f"\nBest parameters: CV_thresh={best_params['cv_thresh']}, time_weight={best_params['time_weight']}"
    )
    print(f"\nConfusion Matrix:")
    print("              Predicted:  Awake    NREM     REM")
    for actual in ["awake", "nrem", "rem"]:
        row = best_result["confusion"][actual]
        print(
            f"  Actual {actual:5s}:        {row['awake']:5d}   {row['nrem']:5d}   {row['rem']:5d}"
        )

    print(f"\nMetrics:")
    print(f"  Accuracy:        {best_result['accuracy'] * 100:.1f}%")
    print(f"  REM Sensitivity: {best_result['rem_sensitivity'] * 100:.1f}%")
    print(f"  REM Specificity: {best_result['rem_specificity'] * 100:.1f}%")
    print(f"  REM Precision:   {best_result['rem_precision'] * 100:.1f}%")
    print(f"  REM F1:          {best_result['rem_f1'] * 100:.1f}%")

    print("\n" + "=" * 70)
    print("COMPARISON: All tested approaches")
    print("=" * 70)

    approaches = [
        ("Simple RMSSD (baseline)", 29.9, 82.3, 21.9),
        ("CV-based (thresh=0.55)", 34.1, 50.0, 67.0),
        ("HMM Viterbi", 2.8, 1.5, 98.1),
        (
            f"Hybrid (cv={best_params['cv_thresh']}, tw={best_params['time_weight']})",
            best_result["rem_f1"] * 100,
            best_result["rem_sensitivity"] * 100,
            best_result["rem_specificity"] * 100,
        ),
    ]

    print(f"\n{'Approach':<40} {'F1':>8} {'Sens':>8} {'Spec':>8}")
    print("-" * 70)
    for name, f1, sens, spec in approaches:
        print(f"{name:<40} {f1:>7.1f}% {sens:>7.1f}% {spec:>7.1f}%")


if __name__ == "__main__":
    main()
