#!/usr/bin/env python3
"""
Hidden Markov Model classifier with Viterbi decoding.
Uses learned emission probabilities and transition matrix from actual data.
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


STATES = ["awake", "nrem", "rem"]

TRANSITION_MATRIX = {
    "awake": {"awake": 0.01, "nrem": 0.89, "rem": 0.10},
    "nrem": {"awake": 0.43, "nrem": 0.37, "rem": 0.20},
    "rem": {"awake": 0.49, "nrem": 0.51, "rem": 0.001},
}

INITIAL_PROBS = {"awake": 0.3, "nrem": 0.7, "rem": 0.0}


def gaussian_pdf(x, mu, sigma):
    if sigma < 0.01:
        sigma = 0.01
    return math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * math.sqrt(2 * math.pi))


class HMMClassifier:
    def __init__(self):
        self.cv_params = {
            "awake": {"mu": 0.40, "sigma": 0.25},
            "nrem": {"mu": 0.45, "sigma": 0.30},
            "rem": {"mu": 0.20, "sigma": 0.15},
        }
        self.rmssd_params = {
            "awake": {"mu": 3.5, "sigma": 2.0},
            "nrem": {"mu": 3.0, "sigma": 2.5},
            "rem": {"mu": 2.5, "sigma": 1.5},
        }

    def learn_from_data(self, hr_samples, sleep_stages):
        feature_data = {s: {"cv": [], "rmssd": []} for s in STATES}

        sessions = identify_sessions(sleep_stages)

        for session in sessions:
            if len(session) < 5:
                continue

            hrs = []
            rmssd_history = []

            for stage_rec in session:
                actual = stage_rec["stage"]
                start = stage_rec["start"]
                end = stage_rec["end"]

                stage_hrs = [hr for hr in hr_samples if start <= hr["time"] <= end]

                for hr in stage_hrs:
                    hrs.append(hr["bpm"])
                    if len(hrs) > 15:
                        hrs.pop(0)

                    if len(hrs) >= 3:
                        diffs_sq = [
                            (hrs[i] - hrs[i - 1]) ** 2 for i in range(1, len(hrs))
                        ]
                        rmssd = math.sqrt(sum(diffs_sq) / len(diffs_sq))
                        rmssd_history.append(rmssd)
                        if len(rmssd_history) > 10:
                            rmssd_history.pop(0)

                        if len(rmssd_history) >= 3:
                            mean_rmssd = statistics.mean(rmssd_history)
                            std_rmssd = statistics.stdev(rmssd_history)
                            cv = std_rmssd / mean_rmssd if mean_rmssd > 0.1 else 0.5

                            feature_data[actual]["cv"].append(cv)
                            feature_data[actual]["rmssd"].append(rmssd)

        print("Learned emission parameters:")
        for state in STATES:
            if len(feature_data[state]["cv"]) >= 5:
                cv_vals = feature_data[state]["cv"]
                rmssd_vals = feature_data[state]["rmssd"]

                self.cv_params[state] = {
                    "mu": statistics.mean(cv_vals),
                    "sigma": max(0.05, statistics.stdev(cv_vals)),
                }
                self.rmssd_params[state] = {
                    "mu": statistics.mean(rmssd_vals),
                    "sigma": max(0.5, statistics.stdev(rmssd_vals)),
                }

                print(
                    f"  {state}: CV={self.cv_params[state]['mu']:.2f}+/-{self.cv_params[state]['sigma']:.2f}, "
                    f"RMSSD={self.rmssd_params[state]['mu']:.2f}+/-{self.rmssd_params[state]['sigma']:.2f} "
                    f"(n={len(cv_vals)})"
                )

    def emission_prob(self, state, cv, rmssd, minutes):
        p_cv = gaussian_pdf(
            cv, self.cv_params[state]["mu"], self.cv_params[state]["sigma"]
        )
        p_rmssd = gaussian_pdf(
            rmssd, self.rmssd_params[state]["mu"], self.rmssd_params[state]["sigma"]
        )

        time_factor = 1.0
        if state == "rem":
            if minutes < 60:
                time_factor = 0.001
            elif minutes < 90:
                time_factor = 0.3
            else:
                cycle = int(minutes / 90)
                time_factor = min(1.5, 0.5 + cycle * 0.25)

        return p_cv * p_rmssd * time_factor + 1e-10

    def viterbi(self, observations):
        T = len(observations)
        if T == 0:
            return []

        V = [{} for _ in range(T)]
        path = {}

        for state in STATES:
            V[0][state] = math.log(INITIAL_PROBS[state] + 1e-10) + math.log(
                self.emission_prob(
                    state,
                    observations[0]["cv"],
                    observations[0]["rmssd"],
                    observations[0]["minutes"],
                )
            )
            path[state] = [state]

        for t in range(1, T):
            newpath = {}

            for curr_state in STATES:
                emission = self.emission_prob(
                    curr_state,
                    observations[t]["cv"],
                    observations[t]["rmssd"],
                    observations[t]["minutes"],
                )

                best_prob = float("-inf")
                best_prev = None

                for prev_state in STATES:
                    trans_prob = TRANSITION_MATRIX[prev_state][curr_state]
                    prob = (
                        V[t - 1][prev_state]
                        + math.log(trans_prob + 1e-10)
                        + math.log(emission)
                    )

                    if prob > best_prob:
                        best_prob = prob
                        best_prev = prev_state

                V[t][curr_state] = best_prob
                newpath[curr_state] = path[best_prev] + [curr_state]

            path = newpath

        final_state = max(STATES, key=lambda s: V[T - 1][s])
        return path[final_state]


def run_hmm_classifier(hr_samples, sleep_stages, learn=True):
    hmm = HMMClassifier()

    if learn:
        hmm.learn_from_data(hr_samples, sleep_stages)

    sessions = identify_sessions(sleep_stages)

    confusion = {s: {t: 0 for t in STATES} for s in STATES}

    for session in sessions:
        if len(session) < 5:
            continue

        session_start = session[0]["start"]

        observations = []
        actuals = []
        hrs = []
        rmssd_history = []

        for stage_rec in session:
            actual = stage_rec["stage"]
            start = stage_rec["start"]
            end = stage_rec["end"]

            stage_hrs = [hr for hr in hr_samples if start <= hr["time"] <= end]

            for hr in stage_hrs:
                hrs.append(hr["bpm"])
                if len(hrs) > 15:
                    hrs.pop(0)

                if len(hrs) >= 3:
                    diffs_sq = [(hrs[i] - hrs[i - 1]) ** 2 for i in range(1, len(hrs))]
                    rmssd = math.sqrt(sum(diffs_sq) / len(diffs_sq))
                    rmssd_history.append(rmssd)
                    if len(rmssd_history) > 10:
                        rmssd_history.pop(0)

                    if len(rmssd_history) >= 3:
                        mean_rmssd = statistics.mean(rmssd_history)
                        std_rmssd = statistics.stdev(rmssd_history)
                        cv = std_rmssd / mean_rmssd if mean_rmssd > 0.1 else 0.5

                        minutes = (hr["time"] - session_start).total_seconds() / 60

                        observations.append(
                            {"cv": cv, "rmssd": rmssd, "minutes": minutes}
                        )
                        actuals.append(actual)

        if len(observations) < 10:
            continue

        predicted_sequence = hmm.viterbi(observations)

        for actual, predicted in zip(actuals, predicted_sequence):
            confusion[actual][predicted] += 1

    total = sum(sum(row.values()) for row in confusion.values())
    correct = sum(confusion[s][s] for s in STATES)
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
    }


def main():
    json_path = sys.argv[1] if len(sys.argv) > 1 else "notes/raw_sleep_data.json"
    hr_samples, sleep_stages = load_data(json_path)

    print(f"Data: {len(sleep_stages)} stages, {len(hr_samples)} HR samples")

    print("\n" + "=" * 70)
    print("HMM CLASSIFIER WITH VITERBI DECODING")
    print("=" * 70)

    result = run_hmm_classifier(hr_samples, sleep_stages, learn=True)

    print("\nConfusion Matrix:")
    print("              Predicted:  Awake    NREM     REM")
    for actual in STATES:
        row = result["confusion"][actual]
        print(
            f"  Actual {actual:5s}:        {row['awake']:5d}   {row['nrem']:5d}   {row['rem']:5d}"
        )

    print(f"\nMetrics:")
    print(f"  Accuracy:        {result['accuracy'] * 100:.1f}%")
    print(f"  REM Sensitivity: {result['rem_sensitivity'] * 100:.1f}%")
    print(f"  REM Specificity: {result['rem_specificity'] * 100:.1f}%")
    print(f"  REM Precision:   {result['rem_precision'] * 100:.1f}%")
    print(f"  REM F1:          {result['rem_f1'] * 100:.1f}%")


if __name__ == "__main__":
    main()
