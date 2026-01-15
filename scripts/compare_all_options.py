#!/usr/bin/env python3
"""Compare all awake detection approaches: A (time prior), B (transition prior), C (dynamic threshold)."""

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


def get_awake_prior(minutes):
    """Time-based probability of being awake (from data analysis)."""
    if minutes < 30:
        return 0.35
    if minutes < 60:
        return 0.01
    if minutes < 90:
        return 0.33
    if minutes < 330:
        return 0.10
    if minutes < 360:
        return 0.30
    return min(0.65, 0.30 + (minutes - 360) * 0.003)


TRANSITION_PROBS = {
    "awake": {"awake": 0.00, "nrem": 0.89, "rem": 0.11},
    "nrem": {"awake": 0.43, "nrem": 0.37, "rem": 0.20},
    "rem": {"awake": 0.49, "nrem": 0.51, "rem": 0.00},
}


def run_baseline(hr_samples, sessions, awake_thresh=3.0):
    """Baseline: Two-stage with fixed threshold, no priors."""
    CYCLE_LENGTH = 90
    REM_CONSECUTIVE_REQUIRED = 2
    AWAKE_CONSECUTIVE_REQUIRED = 1
    MAX_RECENT_HR = 20
    MAX_RMSSD_HISTORY = 10
    CV_THRESHOLD = 0.20

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
            actual = stage_rec["stage"]
            if actual in ["light", "deep"]:
                actual = "nrem"
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

                awake_signal = mean_diff > awake_thresh
                consecutive_awake_signals = (
                    consecutive_awake_signals + 1 if awake_signal else 0
                )
                is_awake = consecutive_awake_signals >= AWAKE_CONSECUTIVE_REQUIRED

                if is_awake:
                    predicted = "awake"
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
                        predicted = "nrem"
                        consecutive_rem_signals = 0
                    elif rem_score > 0.25:
                        consecutive_rem_signals += 1
                        predicted = (
                            "rem"
                            if consecutive_rem_signals >= REM_CONSECUTIVE_REQUIRED
                            else "nrem"
                        )
                    else:
                        consecutive_rem_signals = 0
                        predicted = "nrem"

                    if (
                        prev_predicted == "rem"
                        and predicted == "nrem"
                        and rem_score > 0.15
                    ):
                        predicted = "rem"

                confusion[actual][predicted] += 1
                prev_predicted = predicted

    return confusion


def run_option_a(hr_samples, sessions, awake_thresh=3.0, prior_weight=0.3):
    """Option A: Combine mean_diff signal with time-based awake prior."""
    CYCLE_LENGTH = 90
    REM_CONSECUTIVE_REQUIRED = 2
    MAX_RECENT_HR = 20
    MAX_RMSSD_HISTORY = 10
    CV_THRESHOLD = 0.20

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
        prev_predicted = "nrem"

        for stage_rec in session:
            actual = stage_rec["stage"]
            if actual in ["light", "deep"]:
                actual = "nrem"
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

                # Option A: Combine HR signal with time prior
                hr_awake_signal = min(
                    1.0, max(0, (mean_diff - 1.5) / 3.0)
                )  # Normalize to 0-1
                time_prior = get_awake_prior(minutes)
                combined_awake_score = (
                    1 - prior_weight
                ) * hr_awake_signal + prior_weight * time_prior

                is_awake = combined_awake_score > 0.35  # Tunable threshold

                if is_awake:
                    predicted = "awake"
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
                        predicted = "nrem"
                        consecutive_rem_signals = 0
                    elif rem_score > 0.25:
                        consecutive_rem_signals += 1
                        predicted = (
                            "rem"
                            if consecutive_rem_signals >= REM_CONSECUTIVE_REQUIRED
                            else "nrem"
                        )
                    else:
                        consecutive_rem_signals = 0
                        predicted = "nrem"

                    if (
                        prev_predicted == "rem"
                        and predicted == "nrem"
                        and rem_score > 0.15
                    ):
                        predicted = "rem"

                confusion[actual][predicted] += 1
                prev_predicted = predicted

    return confusion


def run_option_b(hr_samples, sessions, awake_thresh=3.0):
    """Option B: Use transition probabilities to adjust predictions."""
    CYCLE_LENGTH = 90
    REM_CONSECUTIVE_REQUIRED = 2
    AWAKE_CONSECUTIVE_REQUIRED = 1
    MAX_RECENT_HR = 20
    MAX_RMSSD_HISTORY = 10
    CV_THRESHOLD = 0.20

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
            actual = stage_rec["stage"]
            if actual in ["light", "deep"]:
                actual = "nrem"
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

                awake_signal = mean_diff > awake_thresh
                consecutive_awake_signals = (
                    consecutive_awake_signals + 1 if awake_signal else 0
                )
                raw_awake = consecutive_awake_signals >= AWAKE_CONSECUTIVE_REQUIRED

                # Calculate raw prediction first
                if raw_awake:
                    raw_predicted = "awake"
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

                # Option B: Apply transition probability filter
                trans_prob = TRANSITION_PROBS[prev_predicted][raw_predicted]

                if trans_prob < 0.15:  # Very unlikely transition
                    # Override with most likely transition from prev state
                    best_next = max(
                        TRANSITION_PROBS[prev_predicted].items(), key=lambda x: x[1]
                    )[0]
                    if best_next != raw_predicted:
                        predicted = best_next
                    else:
                        predicted = raw_predicted
                else:
                    predicted = raw_predicted

                # REM hysteresis still applies
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

                if predicted != "awake":
                    consecutive_awake_signals = 0
                if predicted != "rem":
                    consecutive_rem_signals = 0

                confusion[actual][predicted] += 1
                prev_predicted = predicted

    return confusion


def run_option_c(hr_samples, sessions, base_thresh=3.0):
    """Option C: Dynamic threshold based on time-based awake prior."""
    CYCLE_LENGTH = 90
    REM_CONSECUTIVE_REQUIRED = 2
    AWAKE_CONSECUTIVE_REQUIRED = 1
    MAX_RECENT_HR = 20
    MAX_RMSSD_HISTORY = 10
    CV_THRESHOLD = 0.20

    def get_dynamic_threshold(minutes):
        prior = get_awake_prior(minutes)
        if prior > 0.25:
            return base_thresh - 0.5
        if prior < 0.05:
            return base_thresh + 1.0
        return base_thresh

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
            actual = stage_rec["stage"]
            if actual in ["light", "deep"]:
                actual = "nrem"
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
                awake_signal = mean_diff > dynamic_thresh
                consecutive_awake_signals = (
                    consecutive_awake_signals + 1 if awake_signal else 0
                )
                is_awake = consecutive_awake_signals >= AWAKE_CONSECUTIVE_REQUIRED

                if is_awake:
                    predicted = "awake"
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
                        predicted = "nrem"
                        consecutive_rem_signals = 0
                    elif rem_score > 0.25:
                        consecutive_rem_signals += 1
                        predicted = (
                            "rem"
                            if consecutive_rem_signals >= REM_CONSECUTIVE_REQUIRED
                            else "nrem"
                        )
                    else:
                        consecutive_rem_signals = 0
                        predicted = "nrem"

                    if (
                        prev_predicted == "rem"
                        and predicted == "nrem"
                        and rem_score > 0.15
                    ):
                        predicted = "rem"

                confusion[actual][predicted] += 1
                prev_predicted = predicted

    return confusion


def run_option_abc(hr_samples, sessions, base_thresh=3.0, prior_weight=0.2):
    """Option A+B+C: Combine all three approaches."""
    CYCLE_LENGTH = 90
    REM_CONSECUTIVE_REQUIRED = 2
    MAX_RECENT_HR = 20
    MAX_RMSSD_HISTORY = 10
    CV_THRESHOLD = 0.20

    def get_dynamic_threshold(minutes):
        prior = get_awake_prior(minutes)
        if prior > 0.25:
            return base_thresh - 0.5
        if prior < 0.05:
            return base_thresh + 1.0
        return base_thresh

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
        prev_predicted = "nrem"

        for stage_rec in session:
            actual = stage_rec["stage"]
            if actual in ["light", "deep"]:
                actual = "nrem"
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

                # Option C: Dynamic threshold
                dynamic_thresh = get_dynamic_threshold(minutes)

                # Option A: Combine HR signal with time prior
                hr_awake_signal = min(
                    1.0, max(0, (mean_diff - dynamic_thresh + 1.5) / 3.0)
                )
                time_prior = get_awake_prior(minutes)
                combined_awake_score = (
                    1 - prior_weight
                ) * hr_awake_signal + prior_weight * time_prior

                raw_awake = combined_awake_score > 0.4

                if raw_awake:
                    raw_predicted = "awake"
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

                # Option B: Transition filter
                trans_prob = TRANSITION_PROBS[prev_predicted][raw_predicted]
                if trans_prob < 0.12:
                    best_next = max(
                        TRANSITION_PROBS[prev_predicted].items(), key=lambda x: x[1]
                    )[0]
                    predicted = best_next
                else:
                    predicted = raw_predicted

                # REM hysteresis
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

                if predicted != "rem":
                    consecutive_rem_signals = 0

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
    print("COMPARISON OF ALL AWAKE DETECTION APPROACHES")
    print("=" * 100)

    results = []

    # Baseline (fixed threshold, no priors)
    for thresh in [2.5, 3.0, 3.5]:
        conf = run_baseline(hr_samples, sessions, awake_thresh=thresh)
        m = calc_metrics(conf)
        results.append(("Baseline", f"thresh={thresh}", m))

    # Option A (time prior as probability modifier)
    for weight in [0.2, 0.3, 0.4]:
        conf = run_option_a(hr_samples, sessions, awake_thresh=3.0, prior_weight=weight)
        m = calc_metrics(conf)
        results.append(("Option A", f"weight={weight}", m))

    # Option B (transition priors)
    for thresh in [2.5, 3.0, 3.5]:
        conf = run_option_b(hr_samples, sessions, awake_thresh=thresh)
        m = calc_metrics(conf)
        results.append(("Option B", f"thresh={thresh}", m))

    # Option C (dynamic threshold)
    for base in [2.5, 3.0, 3.5]:
        conf = run_option_c(hr_samples, sessions, base_thresh=base)
        m = calc_metrics(conf)
        results.append(("Option C", f"base={base}", m))

    # Option A+B+C combined
    for weight in [0.15, 0.2, 0.25]:
        conf = run_option_abc(
            hr_samples, sessions, base_thresh=3.0, prior_weight=weight
        )
        m = calc_metrics(conf)
        results.append(("A+B+C", f"weight={weight}", m))

    print(
        f"\n{'Option':<12} {'Params':<15} {'REM Sens':<10} {'Awake Sens':<12} {'Awake Prec':<12} {'Overall':<10}"
    )
    print("-" * 75)

    for option, params, m in results:
        print(
            f"{option:<12} {params:<15} {m['rem_sens'] * 100:<10.1f} {m['awake_sens'] * 100:<12.1f} {m['awake_prec'] * 100:<12.1f} {m['accuracy'] * 100:<10.1f}"
        )

    print("\n" + "=" * 100)
    print("BEST CONFIG PER APPROACH (optimizing for REM >= 75%)")
    print("=" * 100)

    for approach in ["Baseline", "Option A", "Option B", "Option C", "A+B+C"]:
        approach_results = [
            r for r in results if r[0] == approach and r[2]["rem_sens"] >= 0.75
        ]
        if approach_results:
            best = max(approach_results, key=lambda x: x[2]["awake_sens"])
            m = best[2]
            print(f"\n{approach} ({best[1]}):")
            print(
                f"  REM: {m['rem_sens'] * 100:.1f}%, Awake: {m['awake_sens'] * 100:.1f}% sens / {m['awake_prec'] * 100:.1f}% prec"
            )


if __name__ == "__main__":
    main()
