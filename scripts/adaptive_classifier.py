#!/usr/bin/env python3
"""Adaptive classifier that learns thresholds and priors from user's sleep data."""

import json
import math
import statistics
from datetime import datetime
from collections import defaultdict


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


def normalize_stage(stage):
    return "nrem" if stage in ["light", "deep"] else stage


def learn_parameters(hr_samples, sessions):
    """Learn all parameters from the training data."""

    time_bins = defaultdict(lambda: {"awake": 0, "nrem": 0, "rem": 0, "total": 0})
    transitions = defaultdict(lambda: defaultdict(int))
    mean_diffs_by_stage = {"awake": [], "nrem": [], "rem": []}

    MAX_RECENT_HR = 20

    for session in sessions:
        if len(session) < 5:
            continue

        session_start = session[0]["start"]
        recent_hrs = []
        prev_stage = None

        for stage_rec in session:
            actual = normalize_stage(stage_rec["stage"])
            start, end = stage_rec["start"], stage_rec["end"]

            if prev_stage is not None:
                transitions[prev_stage][actual] += 1
            prev_stage = actual

            stage_hrs = sorted(
                [hr for hr in hr_samples if start <= hr["time"] <= end],
                key=lambda x: x["time"],
            )

            for hr in stage_hrs:
                recent_hrs.append(hr["bpm"])
                if len(recent_hrs) > MAX_RECENT_HR:
                    recent_hrs.pop(0)

                minutes = (hr["time"] - session_start).total_seconds() / 60
                bin_idx = int(minutes // 30)

                duration_contribution = 1
                time_bins[bin_idx][actual] += duration_contribution
                time_bins[bin_idx]["total"] += duration_contribution

                if len(recent_hrs) >= 2:
                    diffs = [
                        abs(recent_hrs[i] - recent_hrs[i - 1])
                        for i in range(1, len(recent_hrs))
                    ]
                    mean_diff = statistics.mean(diffs[-10:]) if len(diffs) >= 1 else 0
                    mean_diffs_by_stage[actual].append(mean_diff)

    learned_awake_prior = {}
    for bin_idx in sorted(time_bins.keys()):
        if time_bins[bin_idx]["total"] > 0:
            learned_awake_prior[bin_idx] = (
                time_bins[bin_idx]["awake"] / time_bins[bin_idx]["total"]
            )
        else:
            learned_awake_prior[bin_idx] = 0.1

    learned_transitions = {}
    for from_stage in ["awake", "nrem", "rem"]:
        total = sum(transitions[from_stage].values())
        learned_transitions[from_stage] = {}
        for to_stage in ["awake", "nrem", "rem"]:
            if total > 0:
                learned_transitions[from_stage][to_stage] = (
                    transitions[from_stage][to_stage] / total
                )
            else:
                learned_transitions[from_stage][to_stage] = 0.33

    awake_diffs = mean_diffs_by_stage["awake"]
    sleep_diffs = mean_diffs_by_stage["nrem"] + mean_diffs_by_stage["rem"]

    if awake_diffs and sleep_diffs:
        awake_mean = statistics.mean(awake_diffs)
        sleep_mean = statistics.mean(sleep_diffs)
        awake_std = statistics.stdev(awake_diffs) if len(awake_diffs) > 1 else 1.0
        sleep_std = statistics.stdev(sleep_diffs) if len(sleep_diffs) > 1 else 1.0

        sleep_p75 = (
            sorted(sleep_diffs)[int(len(sleep_diffs) * 0.75)] if sleep_diffs else 2.0
        )
        awake_p25 = (
            sorted(awake_diffs)[int(len(awake_diffs) * 0.25)] if awake_diffs else 3.0
        )

        learned_threshold = (sleep_p75 + awake_p25) / 2

        min_threshold = sleep_mean + 1.0 * sleep_std
        learned_threshold = max(min_threshold, learned_threshold)
    else:
        learned_threshold = 3.0

    return {
        "awake_prior": learned_awake_prior,
        "transitions": learned_transitions,
        "mean_diff_threshold": learned_threshold,
        "awake_mean_diff": statistics.mean(awake_diffs) if awake_diffs else 5.0,
        "sleep_mean_diff": statistics.mean(sleep_diffs) if sleep_diffs else 1.5,
    }


def run_adaptive_classifier(
    hr_samples,
    sessions,
    params,
    use_time_prior=True,
    use_transitions=True,
    use_dynamic_thresh=True,
):
    """Run classifier with learned parameters."""

    CYCLE_LENGTH = 90
    REM_CONSECUTIVE_REQUIRED = 2
    AWAKE_CONSECUTIVE_REQUIRED = 1
    MAX_RECENT_HR = 20
    MAX_RMSSD_HISTORY = 10
    CV_THRESHOLD = 0.20

    base_threshold = params["mean_diff_threshold"]
    learned_priors = params["awake_prior"]
    learned_trans = params["transitions"]

    def get_learned_awake_prior(minutes):
        bin_idx = int(minutes // 30)
        if bin_idx in learned_priors:
            return learned_priors[bin_idx]
        closest = (
            min(learned_priors.keys(), key=lambda x: abs(x - bin_idx))
            if learned_priors
            else 0
        )
        return learned_priors.get(closest, 0.1)

    def get_dynamic_threshold(minutes):
        if not use_dynamic_thresh:
            return base_threshold
        prior = get_learned_awake_prior(minutes)
        if prior > 0.25:
            return base_threshold * 0.85
        if prior < 0.05:
            return base_threshold * 1.3
        return base_threshold

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
            actual = normalize_stage(stage_rec["stage"])
            start, end = stage_rec["start"], stage_rec["end"]
            stage_hrs = sorted(
                [hr for hr in hr_samples if start <= hr["time"] <= end],
                key=lambda x: x["time"],
            )

            for hr in stage_hrs:
                recent_hrs.append(hr["bpm"])
                if len(recent_hrs) > MAX_RECENT_HR:
                    recent_hrs.pop(0)

                mean_diff = 0
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

                rmssd_history.append(rmssd)
                if len(rmssd_history) > MAX_RMSSD_HISTORY:
                    rmssd_history.pop(0)

                minutes = (hr["time"] - session_start).total_seconds() / 60

                if len(rmssd_history) >= 3:
                    mean_rmssd = statistics.mean(rmssd_history)
                    cv = (
                        math.sqrt(
                            sum((v - mean_rmssd) ** 2 for v in rmssd_history)
                            / len(rmssd_history)
                        )
                        / mean_rmssd
                        if mean_rmssd > 0.1
                        else 0.5
                    )
                else:
                    cv = 0.5

                dynamic_thresh = get_dynamic_threshold(minutes)

                if use_time_prior:
                    hr_signal = min(
                        1.0, max(0, (mean_diff - dynamic_thresh + 1.5) / 3.0)
                    )
                    time_prior = get_learned_awake_prior(minutes)
                    awake_score = 0.7 * hr_signal + 0.3 * time_prior
                    raw_awake = awake_score > 0.4
                else:
                    awake_signal = mean_diff > dynamic_thresh
                    consecutive_awake_signals = (
                        consecutive_awake_signals + 1 if awake_signal else 0
                    )
                    raw_awake = consecutive_awake_signals >= AWAKE_CONSECUTIVE_REQUIRED

                if raw_awake:
                    raw_predicted = "awake"
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

                    cv_rem_signal = 1.0 if cv < CV_THRESHOLD else 0.0
                    strong_cv = cv < CV_THRESHOLD * 0.7
                    rem_score = (
                        0.5 * time_rem_prob
                        + 0.5 * cv_rem_signal * 0.5
                        + (0.15 if strong_cv else 0)
                    )

                    if minutes < 70:
                        raw_predicted = "nrem"
                        consecutive_rem_signals = 0
                    elif rem_score > 0.25:
                        consecutive_rem_signals += 1
                        raw_predicted = (
                            "rem"
                            if consecutive_rem_signals >= REM_CONSECUTIVE_REQUIRED
                            else "nrem"
                        )
                    else:
                        consecutive_rem_signals = 0
                        raw_predicted = "nrem"

                if use_transitions:
                    trans_prob = learned_trans[prev_predicted][raw_predicted]
                    if trans_prob < 0.12:
                        best_next = max(
                            learned_trans[prev_predicted].items(), key=lambda x: x[1]
                        )[0]
                        predicted = best_next
                    else:
                        predicted = raw_predicted
                else:
                    predicted = raw_predicted

                if prev_predicted == "rem" and predicted == "nrem":
                    if minutes >= 70:
                        cycle = int(minutes / CYCLE_LENGTH)
                        pos = (minutes % CYCLE_LENGTH) / CYCLE_LENGTH
                        base_prob = min(0.35, 0.10 + cycle * 0.08)
                        time_rem_prob = (
                            base_prob * 2.0 if pos >= 0.65 else base_prob * 0.3
                        )
                        cv_rem_signal = 1.0 if cv < CV_THRESHOLD else 0.0
                        rem_score = 0.5 * time_rem_prob + 0.5 * cv_rem_signal * 0.5
                        if rem_score > 0.15:
                            predicted = "rem"

                if not use_time_prior and predicted != "awake":
                    consecutive_awake_signals = 0

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
        "confusion": confusion,
    }


def main():
    hr_samples, sleep_stages = load_data()
    sessions = identify_sessions(sleep_stages)

    print("=" * 100)
    print("ADAPTIVE CLASSIFIER - Learning Parameters from User Data")
    print("=" * 100)

    params = learn_parameters(hr_samples, sessions)

    print("\nLEARNED PARAMETERS:")
    print(f"  Mean diff threshold: {params['mean_diff_threshold']:.2f}")
    print(f"  Awake mean_diff: {params['awake_mean_diff']:.2f}")
    print(f"  Sleep mean_diff: {params['sleep_mean_diff']:.2f}")

    print("\n  Learned transition probabilities:")
    for from_s in ["awake", "nrem", "rem"]:
        probs = [
            f"{to_s}:{params['transitions'][from_s][to_s]:.2f}"
            for to_s in ["awake", "nrem", "rem"]
        ]
        print(f"    {from_s} -> {', '.join(probs)}")

    print("\n  Learned awake prior by time (30-min bins):")
    for bin_idx in sorted(params["awake_prior"].keys())[:12]:
        print(
            f"    {bin_idx * 30}-{(bin_idx + 1) * 30} min: {params['awake_prior'][bin_idx] * 100:.1f}%"
        )

    print("\n" + "=" * 100)
    print("COMPARING CONFIGURATIONS WITH LEARNED PARAMETERS")
    print("=" * 100)

    configs = [
        ("Baseline (learned thresh only)", False, False, False),
        ("+ Dynamic thresh", False, False, True),
        ("+ Time prior", True, False, True),
        ("+ Transitions", False, True, True),
        ("Full adaptive (A+B+C)", True, True, True),
    ]

    print(
        f"\n{'Config':<35} {'REM Sens':<10} {'Awake Sens':<12} {'Awake Prec':<12} {'Overall':<10}"
    )
    print("-" * 85)

    results = []
    for name, use_time, use_trans, use_dyn in configs:
        conf = run_adaptive_classifier(
            hr_samples, sessions, params, use_time, use_trans, use_dyn
        )
        m = calc_metrics(conf)
        results.append((name, m))
        print(
            f"{name:<35} {m['rem_sens'] * 100:<10.1f} {m['awake_sens'] * 100:<12.1f} {m['awake_prec'] * 100:<12.1f} {m['accuracy'] * 100:<10.1f}"
        )

    print("\n" + "=" * 100)
    print("BEST CONFIGURATION")
    print("=" * 100)

    valid = [(n, m) for n, m in results if m["rem_sens"] >= 0.75]
    if valid:
        best = max(valid, key=lambda x: x[1]["awake_sens"])
        print(f"\n{best[0]}:")
        m = best[1]
        print(
            f"  REM: {m['rem_sens'] * 100:.1f}%, Awake: {m['awake_sens'] * 100:.1f}% sens / {m['awake_prec'] * 100:.1f}% prec"
        )
        print(f"  Confusion: {m['confusion']}")


if __name__ == "__main__":
    main()
