#!/usr/bin/env python3
"""
Enhanced Sleep Classifier v2 - Based on Fitbit Takeout Analysis

Key findings from personal data analysis:
1. max_diff is best for wake detection (4.13 wake vs 3.02 sleep)
2. hr_range is best for REM vs NREM (5.48 vs 10.85)
3. std_hr is good secondary for REM vs NREM (1.55 vs 3.21)
4. mean_diff alone is NOT good for wake (0.80 vs 0.88)

New approach: Two-stage with max_diff for wake, hr_range/std_hr for REM
"""

import json
from collections import defaultdict
from pathlib import Path

DATA_PATH = Path("/Users/jmanning/dream-stream/notes/fitbit_merged_training_data.json")
RAW_DATA_PATH = Path("/Users/jmanning/dream-stream/notes/raw_sleep_data.json")


def load_health_connect_data():
    """Load data from Health Connect (Android)."""
    with open(RAW_DATA_PATH) as f:
        return json.load(f)


def load_fitbit_data():
    """Load merged Fitbit Takeout data."""
    with open(DATA_PATH) as f:
        return json.load(f)


def compute_features(hr_window: list) -> dict:
    """Compute all features from HR window."""
    if len(hr_window) < 10:
        return {}

    hrs = [
        h if isinstance(h, (int, float)) else h.get("hr", h.get("beatsPerMinute", 0))
        for h in hr_window
    ]
    hrs = [h for h in hrs if h > 0]

    if len(hrs) < 10:
        return {}

    mean_hr = sum(hrs) / len(hrs)

    diffs = [abs(hrs[i] - hrs[i - 1]) for i in range(1, len(hrs))]
    mean_diff = sum(diffs) / len(diffs)
    max_diff = max(diffs)

    hr_range = max(hrs) - min(hrs)

    variance = sum((h - mean_hr) ** 2 for h in hrs) / len(hrs)
    std_hr = variance**0.5

    sq_diffs = [(hrs[i] - hrs[i - 1]) ** 2 for i in range(1, len(hrs))]
    rmssd = (sum(sq_diffs) / len(sq_diffs)) ** 0.5

    return {
        "mean_hr": mean_hr,
        "mean_diff": mean_diff,
        "max_diff": max_diff,
        "hr_range": hr_range,
        "std_hr": std_hr,
        "rmssd": rmssd,
    }


def get_awake_prior(minutes_since_start: float) -> float:
    """Time-based prior for awake probability."""
    if minutes_since_start < 30:
        return 0.40
    if minutes_since_start < 60:
        return 0.05
    if minutes_since_start < 90:
        return 0.35
    if minutes_since_start < 330:
        return 0.10
    if minutes_since_start < 360:
        return 0.30
    return min(0.65, 0.30 + (minutes_since_start - 360) * 0.003)


def get_rem_propensity(minutes_since_start: float) -> float:
    """Time-based prior for REM probability."""
    if minutes_since_start < 70:
        return 0.02
    if minutes_since_start < 90:
        return 0.10

    cycle = int(minutes_since_start // 90)
    position_in_cycle = (minutes_since_start % 90) / 90

    base = min(0.35, 0.10 + cycle * 0.06)
    if position_in_cycle > 0.65:
        return base * 2.0
    return base * 0.5


class EnhancedClassifierV2:
    """Two-stage classifier with learned thresholds."""

    def __init__(self):
        self.max_diff_threshold = 3.5
        self.hr_range_threshold = 7.5
        self.std_hr_threshold = 2.0
        self.consecutive_awake = 0
        self.consecutive_rem = 0
        self.prev_stage = "awake"

    def learn_thresholds(self, samples: list):
        """Learn optimal thresholds from labeled data."""
        wake_features = []
        sleep_features = []
        rem_features = []
        nrem_features = []

        window_size = 20
        for i in range(window_size, len(samples)):
            window = samples[i - window_size : i]
            sample = samples[i]

            hrs = [s.get("hr", s.get("beatsPerMinute", 0)) for s in window]
            features = compute_features(hrs)
            if not features:
                continue

            stage = sample.get("stage", sample.get("sleepStage", ""))
            stage_lower = stage.lower()

            if "wake" in stage_lower or "awake" in stage_lower:
                wake_features.append(features)
            else:
                sleep_features.append(features)

            if "rem" in stage_lower:
                rem_features.append(features)
            elif "light" in stage_lower or "deep" in stage_lower:
                nrem_features.append(features)

        if wake_features and sleep_features:
            wake_max_diffs = sorted([f["max_diff"] for f in wake_features])
            sleep_max_diffs = sorted([f["max_diff"] for f in sleep_features])

            wake_p25 = wake_max_diffs[len(wake_max_diffs) // 4]
            sleep_p75 = sleep_max_diffs[3 * len(sleep_max_diffs) // 4]
            self.max_diff_threshold = (wake_p25 + sleep_p75) / 2

            print(f"Learned max_diff threshold: {self.max_diff_threshold:.2f}")
            print(f"  wake p25: {wake_p25:.2f}, sleep p75: {sleep_p75:.2f}")

        if rem_features and nrem_features:
            rem_ranges = sorted([f["hr_range"] for f in rem_features])
            nrem_ranges = sorted([f["hr_range"] for f in nrem_features])

            rem_p75 = rem_ranges[3 * len(rem_ranges) // 4]
            nrem_p25 = nrem_ranges[len(nrem_ranges) // 4]
            self.hr_range_threshold = (rem_p75 + nrem_p25) / 2

            rem_stds = sorted([f["std_hr"] for f in rem_features])
            nrem_stds = sorted([f["std_hr"] for f in nrem_features])

            rem_std_p75 = rem_stds[3 * len(rem_stds) // 4]
            nrem_std_p25 = nrem_stds[len(nrem_stds) // 4]
            self.std_hr_threshold = (rem_std_p75 + nrem_std_p25) / 2

            print(f"Learned hr_range threshold: {self.hr_range_threshold:.2f}")
            print(f"Learned std_hr threshold: {self.std_hr_threshold:.2f}")

    def classify(self, features: dict, minutes_since_start: float) -> str:
        """Classify sleep stage from features."""
        if not features:
            return self.prev_stage

        awake_prior = get_awake_prior(minutes_since_start)
        rem_propensity = get_rem_propensity(minutes_since_start)

        max_diff = features.get("max_diff", 0)
        hr_range = features.get("hr_range", 0)
        std_hr = features.get("std_hr", 0)
        mean_diff = features.get("mean_diff", 0)

        dynamic_max_diff_thresh = self.max_diff_threshold
        if awake_prior > 0.25:
            dynamic_max_diff_thresh *= 0.8
        elif awake_prior < 0.05:
            dynamic_max_diff_thresh *= 1.3

        awake_signal = max_diff / dynamic_max_diff_thresh
        awake_score = 0.6 * min(1.0, awake_signal) + 0.4 * awake_prior

        is_awake = awake_score > 0.55

        if is_awake:
            self.consecutive_awake += 1
        else:
            self.consecutive_awake = 0

        if self.consecutive_awake >= 1:
            self.consecutive_rem = 0
            self.prev_stage = "awake"
            return "awake"

        if minutes_since_start < 70:
            self.prev_stage = "nrem"
            return "nrem"

        rem_score = 0.0

        if hr_range < self.hr_range_threshold:
            rem_score += 0.3
        if std_hr < self.std_hr_threshold:
            rem_score += 0.2

        rem_score += 0.3 * rem_propensity

        if mean_diff < 0.7:
            rem_score += 0.1

        if rem_score > 0.4:
            self.consecutive_rem += 1
        else:
            self.consecutive_rem = 0

        if self.consecutive_rem >= 2:
            self.prev_stage = "rem"
            return "rem"

        if self.prev_stage == "rem" and rem_score > 0.3:
            return "rem"

        self.prev_stage = "nrem"
        return "nrem"


def run_validation(classifier, samples: list) -> dict:
    """Run leave-one-out style validation."""
    sessions = identify_sessions(samples)

    confusion = {
        "awake": {"awake": 0, "nrem": 0, "rem": 0},
        "nrem": {"awake": 0, "nrem": 0, "rem": 0},
        "rem": {"awake": 0, "nrem": 0, "rem": 0},
    }

    total = 0
    correct = 0
    window_size = 20

    for session in sessions:
        if len(session) < 50:
            continue

        classifier.consecutive_awake = 0
        classifier.consecutive_rem = 0
        classifier.prev_stage = "awake"

        session_start = session[0].get("minutes_since_sleep_start", 0)

        for i in range(window_size, len(session)):
            window = session[i - window_size : i]
            sample = session[i]

            hrs = [s.get("hr", s.get("beatsPerMinute", 0)) for s in window]
            features = compute_features(hrs)

            minutes = sample.get("minutes_since_sleep_start", 0) - session_start
            predicted = classifier.classify(features, minutes)

            actual_raw = sample.get("stage", sample.get("sleepStage", ""))
            actual = map_to_3class(actual_raw)

            if actual in confusion and predicted in confusion[actual]:
                confusion[actual][predicted] += 1
                total += 1
                if actual == predicted:
                    correct += 1

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

    awake_total = sum(confusion["awake"].values())
    awake_correct = confusion["awake"]["awake"]
    awake_sens = awake_correct / awake_total if awake_total > 0 else 0

    return {
        "accuracy": correct / total if total > 0 else 0,
        "rem_sensitivity": rem_sens,
        "rem_specificity": rem_spec,
        "awake_sensitivity": awake_sens,
        "confusion": confusion,
        "total_samples": total,
    }


def identify_sessions(samples: list) -> list:
    """Split samples into separate sleep sessions."""
    if not samples:
        return []

    sessions = []
    current = [samples[0]]

    for i in range(1, len(samples)):
        prev_min = samples[i - 1].get("minutes_since_sleep_start", 0)
        curr_min = samples[i].get("minutes_since_sleep_start", 0)

        if curr_min < prev_min - 10:
            if len(current) > 20:
                sessions.append(current)
            current = []
        current.append(samples[i])

    if len(current) > 20:
        sessions.append(current)

    return sessions


def map_to_3class(stage: str) -> str:
    """Map Fitbit stage to 3-class."""
    s = stage.lower()
    if "wake" in s or "awake" in s:
        return "awake"
    if "rem" in s:
        return "rem"
    return "nrem"


def main():
    print("=" * 60)
    print("ENHANCED CLASSIFIER V2 - VALIDATION")
    print("=" * 60)

    print("\n[1] Loading Fitbit Takeout data...")
    data = load_fitbit_data()
    samples = data["merged_samples"]
    print(f"    Loaded {len(samples)} samples")

    print("\n[2] Learning thresholds from data...")
    classifier = EnhancedClassifierV2()
    classifier.learn_thresholds(samples)

    print("\n[3] Running validation...")
    results = run_validation(classifier, samples)

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"Total samples: {results['total_samples']}")
    print(f"Overall accuracy: {results['accuracy'] * 100:.1f}%")
    print(f"REM sensitivity: {results['rem_sensitivity'] * 100:.1f}%")
    print(f"REM specificity: {results['rem_specificity'] * 100:.1f}%")
    print(f"Awake sensitivity: {results['awake_sensitivity'] * 100:.1f}%")

    print("\nConfusion Matrix:")
    print(f"{'':>12} {'Pred Awake':>12} {'Pred NREM':>12} {'Pred REM':>12}")
    for actual in ["awake", "nrem", "rem"]:
        row = f"Actual {actual}:"
        for pred in ["awake", "nrem", "rem"]:
            row += f" {results['confusion'][actual][pred]:>11}"
        print(row)

    print("\n" + "=" * 60)
    print("COMPARISON WITH CURRENT CLASSIFIER")
    print("=" * 60)
    print("Current:  REM sens=81.7%, Awake sens=15.5%")
    print(
        f"Enhanced: REM sens={results['rem_sensitivity'] * 100:.1f}%, Awake sens={results['awake_sensitivity'] * 100:.1f}%"
    )


if __name__ == "__main__":
    main()
