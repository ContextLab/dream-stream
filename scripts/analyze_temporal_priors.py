#!/usr/bin/env python3
"""Analyze temporal patterns in sleep data for classifier priors."""

import json
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

    sleep_stages = []
    for stage in data["sleepStages"]:
        start = parse_time(stage["startTime"])
        end = parse_time(stage["endTime"])
        if start and end:
            sleep_stages.append({"stage": stage["stage"], "start": start, "end": end})
    sleep_stages.sort(key=lambda x: x["start"])
    return sleep_stages


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
    if stage in ["light", "deep"]:
        return "nrem"
    return stage


def main():
    sleep_stages = load_data()
    sessions = identify_sessions(sleep_stages)

    print(f"Total sessions: {len(sessions)}")
    print(f"Total stages: {len(sleep_stages)}")

    # 1. Stage distribution by minutes since sleep start (30-min bins)
    print("\n" + "=" * 80)
    print("1. STAGE DISTRIBUTION BY TIME SINCE SLEEP START (30-min bins)")
    print("=" * 80)

    time_bins = defaultdict(lambda: {"awake": 0, "nrem": 0, "rem": 0, "total": 0})

    for session in sessions:
        if len(session) < 5:
            continue
        session_start = session[0]["start"]

        for stage_rec in session:
            stage = normalize_stage(stage_rec["stage"])
            duration_min = (stage_rec["end"] - stage_rec["start"]).total_seconds() / 60
            minutes_since_start = (
                stage_rec["start"] - session_start
            ).total_seconds() / 60

            # Bin into 30-minute intervals
            bin_idx = int(minutes_since_start // 30)
            time_bins[bin_idx][stage] += duration_min
            time_bins[bin_idx]["total"] += duration_min

    print(
        f"\n{'Bin (min)':<12} {'Awake %':<10} {'NREM %':<10} {'REM %':<10} {'Total min':<10}"
    )
    print("-" * 52)
    for bin_idx in sorted(time_bins.keys()):
        if bin_idx > 16:  # 8 hours max
            break
        data = time_bins[bin_idx]
        if data["total"] > 0:
            awake_pct = 100 * data["awake"] / data["total"]
            nrem_pct = 100 * data["nrem"] / data["total"]
            rem_pct = 100 * data["rem"] / data["total"]
            bin_label = f"{bin_idx * 30}-{(bin_idx + 1) * 30}"
            print(
                f"{bin_label:<12} {awake_pct:<10.1f} {nrem_pct:<10.1f} {rem_pct:<10.1f} {data['total']:<10.1f}"
            )

    # 2. Stage distribution by time of day (hour bins)
    print("\n" + "=" * 80)
    print("2. STAGE DISTRIBUTION BY TIME OF DAY (hourly)")
    print("=" * 80)

    hour_bins = defaultdict(lambda: {"awake": 0, "nrem": 0, "rem": 0, "total": 0})

    for stage_rec in sleep_stages:
        stage = normalize_stage(stage_rec["stage"])
        duration_min = (stage_rec["end"] - stage_rec["start"]).total_seconds() / 60
        hour = stage_rec["start"].hour

        hour_bins[hour][stage] += duration_min
        hour_bins[hour]["total"] += duration_min

    print(
        f"\n{'Hour':<8} {'Awake %':<10} {'NREM %':<10} {'REM %':<10} {'Total min':<10}"
    )
    print("-" * 48)
    for hour in range(24):
        data = hour_bins[hour]
        if data["total"] > 0:
            awake_pct = 100 * data["awake"] / data["total"]
            nrem_pct = 100 * data["nrem"] / data["total"]
            rem_pct = 100 * data["rem"] / data["total"]
            print(
                f"{hour:02d}:00    {awake_pct:<10.1f} {nrem_pct:<10.1f} {rem_pct:<10.1f} {data['total']:<10.1f}"
            )

    # 3. Stage transition probabilities (Markov chain)
    print("\n" + "=" * 80)
    print("3. STAGE TRANSITION PROBABILITIES")
    print("=" * 80)

    transitions = defaultdict(lambda: defaultdict(int))

    for session in sessions:
        if len(session) < 5:
            continue
        for i in range(1, len(session)):
            from_stage = normalize_stage(session[i - 1]["stage"])
            to_stage = normalize_stage(session[i]["stage"])
            transitions[from_stage][to_stage] += 1

    header = "From \\ To"
    print(f"\n{header:<10} {'awake':<10} {'nrem':<10} {'rem':<10}")
    print("-" * 40)
    for from_stage in ["awake", "nrem", "rem"]:
        total = sum(transitions[from_stage].values())
        if total > 0:
            awake_p = transitions[from_stage]["awake"] / total
            nrem_p = transitions[from_stage]["nrem"] / total
            rem_p = transitions[from_stage]["rem"] / total
            print(f"{from_stage:<10} {awake_p:<10.2f} {nrem_p:<10.2f} {rem_p:<10.2f}")

    # 4. Awake duration patterns
    print("\n" + "=" * 80)
    print("4. AWAKE EPISODE PATTERNS")
    print("=" * 80)

    awake_durations = []
    awake_by_time = defaultdict(list)

    for session in sessions:
        session_start = session[0]["start"]
        for stage_rec in session:
            if stage_rec["stage"] == "awake":
                duration = (stage_rec["end"] - stage_rec["start"]).total_seconds() / 60
                minutes_in = (stage_rec["start"] - session_start).total_seconds() / 60
                awake_durations.append(duration)

                # Bin by time since start
                if minutes_in < 60:
                    awake_by_time["0-60"].append(duration)
                elif minutes_in < 180:
                    awake_by_time["60-180"].append(duration)
                elif minutes_in < 300:
                    awake_by_time["180-300"].append(duration)
                else:
                    awake_by_time["300+"].append(duration)

    if awake_durations:
        print(f"\nTotal awake episodes: {len(awake_durations)}")
        print(f"Mean duration: {sum(awake_durations) / len(awake_durations):.1f} min")
        print(
            f"Median duration: {sorted(awake_durations)[len(awake_durations) // 2]:.1f} min"
        )
        print(f"Max duration: {max(awake_durations):.1f} min")

        print(f"\nAwake episodes by time since sleep start:")
        for period, durations in sorted(awake_by_time.items()):
            if durations:
                print(
                    f"  {period} min: {len(durations)} episodes, mean {sum(durations) / len(durations):.1f} min"
                )

    # 5. Summary recommendations
    print("\n" + "=" * 80)
    print("5. RECOMMENDED PRIORS FOR CLASSIFIER")
    print("=" * 80)

    print("""
Based on the data:

1. TIME-SINCE-START PRIOR for Awake:
   - First 30 min: Higher awake probability (sleep onset)
   - Last hour: Higher awake probability (natural wake)
   - Middle of night: Lower awake probability

2. TIME-OF-DAY PRIOR:
   - 4-7 AM: REM more likely (circadian REM peak)
   - 10 PM - 1 AM: NREM/deep more likely
   - Morning hours: Awake more likely

3. TRANSITION PRIOR (Markov):
   - If previous = awake, likely to stay awake or transition to nrem
   - If previous = rem, rarely transitions directly to deep/nrem without light
   - Awake → REM direct transition is very rare
""")


if __name__ == "__main__":
    main()
