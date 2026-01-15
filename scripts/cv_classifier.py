#!/usr/bin/env python3
"""
CV-based classifier using RMSSD stability + temporal priors + Markov transitions.
Key insight: REM has MORE STABLE RMSSD (lower CV) than NREM.
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


TRANSITION_PROBS = {
    "awake": {"awake": 0.01, "nrem": 0.89, "rem": 0.10},
    "nrem": {"awake": 0.43, "nrem": 0.37, "rem": 0.20},
    "rem": {"awake": 0.49, "nrem": 0.51, "rem": 0.00},
}


def get_cycle_rem_prior(minutes_since_start):
    cycle = int(minutes_since_start / 90)
    if minutes_since_start < 60:
        return 0.0
    elif cycle == 0:
        return 0.05
    elif cycle == 1:
        return 0.12
    elif cycle == 2:
        return 0.17
    elif cycle == 3:
        return 0.26
    else:
        return 0.30


class RMSSDTracker:
    def __init__(self, window=15, cv_window=10):
        self.hrs = []
        self.rmssd_history = []
        self.window = window
        self.cv_window = cv_window

    def add(self, hr):
        self.hrs.append(hr)
        if len(self.hrs) > self.window:
            self.hrs.pop(0)

        if len(self.hrs) >= 3:
            diffs_sq = [
                (self.hrs[i] - self.hrs[i - 1]) ** 2 for i in range(1, len(self.hrs))
            ]
            rmssd = math.sqrt(sum(diffs_sq) / len(diffs_sq))
            self.rmssd_history.append(rmssd)
            if len(self.rmssd_history) > self.cv_window:
                self.rmssd_history.pop(0)

    def get_rmssd(self):
        if not self.rmssd_history:
            return 5.0
        return self.rmssd_history[-1]

    def get_cv(self):
        if len(self.rmssd_history) < 3:
            return 0.5
        mean_rmssd = statistics.mean(self.rmssd_history)
        if mean_rmssd < 0.1:
            return 0.5
        std_rmssd = statistics.stdev(self.rmssd_history)
        return std_rmssd / mean_rmssd


def run_cv_classifier(hr_samples, sleep_stages, cv_rem_threshold=0.35, verbose=False):
    sessions = identify_sessions(sleep_stages)

    confusion = {
        s: {t: 0 for t in ["awake", "nrem", "rem"]} for s in ["awake", "nrem", "rem"]
    }
    all_predictions = []

    for session in sessions:
        if len(session) < 5:
            continue

        session_start = session[0]["start"]
        tracker = RMSSDTracker(window=15, cv_window=10)
        prev_stage = "nrem"

        for stage_rec in session:
            actual = stage_rec["stage"]
            start = stage_rec["start"]
            end = stage_rec["end"]

            stage_hrs = [hr for hr in hr_samples if start <= hr["time"] <= end]

            for hr in stage_hrs:
                tracker.add(hr["bpm"])

                minutes = (hr["time"] - session_start).total_seconds() / 60
                cv = tracker.get_cv()
                rmssd = tracker.get_rmssd()
                cycle_rem_prior = get_cycle_rem_prior(minutes)

                scores = {}

                if minutes < 60:
                    scores["rem"] = 0.0
                else:
                    rem_score = 0.0
                    if cv < cv_rem_threshold:
                        rem_score += 0.4 * (1 - cv / cv_rem_threshold)
                    rem_score += cycle_rem_prior * 0.4
                    rem_score += TRANSITION_PROBS[prev_stage]["rem"] * 0.2
                    scores["rem"] = rem_score

                nrem_score = 0.3
                if cv >= cv_rem_threshold:
                    nrem_score += 0.2
                if minutes < 60:
                    nrem_score += 0.3
                nrem_score += TRANSITION_PROBS[prev_stage]["nrem"] * 0.2
                scores["nrem"] = nrem_score

                awake_score = 0.1
                if rmssd > 5.0:
                    awake_score += 0.2
                if cv > 0.6:
                    awake_score += 0.2
                awake_score += TRANSITION_PROBS[prev_stage]["awake"] * 0.2
                scores["awake"] = awake_score

                predicted = max(scores, key=scores.get)

                confusion[actual][predicted] += 1
                all_predictions.append(
                    {
                        "actual": actual,
                        "predicted": predicted,
                        "cv": cv,
                        "rmssd": rmssd,
                        "minutes": minutes,
                        "scores": scores.copy(),
                    }
                )

                prev_stage = predicted

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
    print("CV THRESHOLD SWEEP")
    print("=" * 70)

    best_f1 = 0
    best_threshold = 0
    best_result = None

    for cv_thresh in [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60]:
        result = run_cv_classifier(hr_samples, sleep_stages, cv_rem_threshold=cv_thresh)

        print(f"\nCV threshold={cv_thresh:.2f}:")
        print(f"  Accuracy:        {result['accuracy'] * 100:.1f}%")
        print(f"  REM Sensitivity: {result['rem_sensitivity'] * 100:.1f}%")
        print(f"  REM Specificity: {result['rem_specificity'] * 100:.1f}%")
        print(f"  REM Precision:   {result['rem_precision'] * 100:.1f}%")
        print(f"  REM F1:          {result['rem_f1'] * 100:.1f}%")

        if result["rem_f1"] > best_f1:
            best_f1 = result["rem_f1"]
            best_threshold = cv_thresh
            best_result = result

    print("\n" + "=" * 70)
    print(f"BEST RESULT: CV threshold={best_threshold}")
    print("=" * 70)

    if best_result:
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
        print("REM DETECTION ANALYSIS")
        print("=" * 70)

        rem_preds = [p for p in best_result["predictions"] if p["actual"] == "rem"]
        correct_rem = [p for p in rem_preds if p["predicted"] == "rem"]
        missed_rem = [p for p in rem_preds if p["predicted"] != "rem"]

        print(f"\nCorrect REM: {len(correct_rem)} samples")
        if correct_rem:
            cvs = [p["cv"] for p in correct_rem]
            print(
                f"  CV range: {min(cvs):.2f} - {max(cvs):.2f}, mean={statistics.mean(cvs):.2f}"
            )

        print(f"\nMissed REM: {len(missed_rem)} samples")
        if missed_rem:
            cvs = [p["cv"] for p in missed_rem]
            print(
                f"  CV range: {min(cvs):.2f} - {max(cvs):.2f}, mean={statistics.mean(cvs):.2f}"
            )
            as_nrem = sum(1 for p in missed_rem if p["predicted"] == "nrem")
            as_awake = sum(1 for p in missed_rem if p["predicted"] == "awake")
            print(f"  Classified as NREM: {as_nrem}, as Awake: {as_awake}")

        false_rem = [
            p
            for p in best_result["predictions"]
            if p["predicted"] == "rem" and p["actual"] != "rem"
        ]
        print(f"\nFalse REM: {len(false_rem)} samples")
        if false_rem:
            cvs = [p["cv"] for p in false_rem]
            print(
                f"  CV range: {min(cvs):.2f} - {max(cvs):.2f}, mean={statistics.mean(cvs):.2f}"
            )
            from_nrem = sum(1 for p in false_rem if p["actual"] == "nrem")
            from_awake = sum(1 for p in false_rem if p["actual"] == "awake")
            print(f"  Actually NREM: {from_nrem}, actually Awake: {from_awake}")


if __name__ == "__main__":
    main()
