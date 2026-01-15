#!/usr/bin/env python3
"""Analyze temporal patterns and feature stability by sleep stage."""

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


def identify_sleep_sessions(sleep_stages, gap_hours=4):
    """Split stages into separate sleep sessions based on time gaps."""
    if not sleep_stages:
        return []

    sessions = []
    current_session = [sleep_stages[0]]

    for i in range(1, len(sleep_stages)):
        gap = (
            sleep_stages[i]["start"] - sleep_stages[i - 1]["end"]
        ).total_seconds() / 3600
        if gap > gap_hours:
            sessions.append(current_session)
            current_session = []
        current_session.append(sleep_stages[i])

    if current_session:
        sessions.append(current_session)

    return sessions


def main():
    json_path = sys.argv[1] if len(sys.argv) > 1 else "notes/raw_sleep_data.json"
    hr_samples, sleep_stages = load_data(json_path)

    print(f"Loaded {len(sleep_stages)} stages, {len(hr_samples)} HR samples")

    sessions = identify_sleep_sessions(sleep_stages)
    print(f"Identified {len(sessions)} sleep sessions")

    print("\n" + "=" * 70)
    print("REM EPISODE CHARACTERISTICS")
    print("=" * 70)

    rem_episodes = []
    for session in sessions:
        session_start = session[0]["start"]
        for stage in session:
            if stage["stage"] == "rem":
                duration = (stage["end"] - stage["start"]).total_seconds() / 60
                time_into_session = (
                    stage["start"] - session_start
                ).total_seconds() / 60
                rem_episodes.append(
                    {
                        "duration": duration,
                        "time_into_session": time_into_session,
                    }
                )

    print(f"\nTotal REM episodes: {len(rem_episodes)}")
    if rem_episodes:
        durations = [e["duration"] for e in rem_episodes]
        times = [e["time_into_session"] for e in rem_episodes]

        print(
            f"Duration: mean={statistics.mean(durations):.1f}min, std={statistics.stdev(durations):.1f}, "
            f"min={min(durations):.1f}, max={max(durations):.1f}"
        )
        print(
            f"Time into session: mean={statistics.mean(times):.0f}min, std={statistics.stdev(times):.0f}, "
            f"min={min(times):.0f}, max={max(times):.0f}"
        )

        early_rem = [e for e in rem_episodes if e["time_into_session"] < 60]
        mid_rem = [e for e in rem_episodes if 60 <= e["time_into_session"] < 180]
        late_rem = [e for e in rem_episodes if e["time_into_session"] >= 180]
        print(
            f"\nREM by timing: early (<60min)={len(early_rem)}, mid (60-180min)={len(mid_rem)}, late (>180min)={len(late_rem)}"
        )

    print("\n" + "=" * 70)
    print("STAGE DURATION ANALYSIS")
    print("=" * 70)

    for stage_type in ["awake", "nrem", "rem"]:
        durations = []
        for stage in sleep_stages:
            if stage["stage"] == stage_type:
                dur = (stage["end"] - stage["start"]).total_seconds() / 60
                durations.append(dur)

        if len(durations) >= 2:
            print(
                f"\n{stage_type.upper()} episode durations ({len(durations)} episodes):"
            )
            print(f"  Mean: {statistics.mean(durations):.1f} min")
            print(f"  Std:  {statistics.stdev(durations):.1f} min")
            print(f"  Min:  {min(durations):.1f} min")
            print(f"  Max:  {max(durations):.1f} min")

            sorted_dur = sorted(durations)

            def pct(arr, p):
                return arr[min(int(len(arr) * p), len(arr) - 1)]

            print(
                f"  Percentiles: P25={pct(sorted_dur, 0.25):.1f}, P50={pct(sorted_dur, 0.5):.1f}, P75={pct(sorted_dur, 0.75):.1f}"
            )

    print("\n" + "=" * 70)
    print("STAGE TRANSITION PATTERNS")
    print("=" * 70)

    transitions = defaultdict(lambda: defaultdict(int))
    for session in sessions:
        for i in range(1, len(session)):
            prev = session[i - 1]["stage"]
            curr = session[i]["stage"]
            transitions[prev][curr] += 1

    print("\nTransition counts:")
    for from_stage in ["awake", "nrem", "rem"]:
        for to_stage in ["awake", "nrem", "rem"]:
            count = transitions[from_stage][to_stage]
            print(f"  {from_stage} -> {to_stage}: {count}")

    print("\nTransition probabilities:")
    for from_stage in ["awake", "nrem", "rem"]:
        total = sum(transitions[from_stage].values())
        if total > 0:
            print(f"  From {from_stage}:")
            for to_stage in ["awake", "nrem", "rem"]:
                prob = transitions[from_stage][to_stage] / total
                print(f"    -> {to_stage}: {prob * 100:.1f}%")

    print("\n" + "=" * 70)
    print("HR STABILITY ANALYSIS (variance of RMSSD over time)")
    print("=" * 70)

    WINDOW = 15

    hr_by_time = {s["time"]: s["bpm"] for s in hr_samples}

    for session in sessions[:3]:
        session_start = session[0]["start"]
        print(f"\nSession starting {session_start.strftime('%Y-%m-%d %H:%M')}")

        rmssd_by_stage = {"awake": [], "nrem": [], "rem": []}
        recent_hrs = []

        for stage in session:
            stage_type = stage["stage"]
            start = stage["start"]
            end = stage["end"]

            stage_hrs = [s for s in hr_samples if start <= s["time"] <= end]

            for hr in stage_hrs:
                recent_hrs.append(hr["bpm"])
                if len(recent_hrs) > WINDOW:
                    recent_hrs.pop(0)

                if len(recent_hrs) >= 3:
                    diffs_sq = [
                        (recent_hrs[i] - recent_hrs[i - 1]) ** 2
                        for i in range(1, len(recent_hrs))
                    ]
                    rmssd = math.sqrt(sum(diffs_sq) / len(diffs_sq))
                    rmssd_by_stage[stage_type].append(rmssd)

        for stage_type in ["awake", "nrem", "rem"]:
            vals = rmssd_by_stage[stage_type]
            if len(vals) >= 3:
                mean_rmssd = statistics.mean(vals)
                std_rmssd = statistics.stdev(vals)
                cv = std_rmssd / mean_rmssd if mean_rmssd > 0 else 0
                print(
                    f"  {stage_type.upper()}: mean_RMSSD={mean_rmssd:.2f}, std={std_rmssd:.2f}, CV={cv:.2f} (n={len(vals)})"
                )

    print("\n" + "=" * 70)
    print("ULTRADIAN CYCLE ANALYSIS")
    print("=" * 70)

    CYCLE_LENGTH = 90

    for session in sessions[:3]:
        session_start = session[0]["start"]
        session_end = session[-1]["end"]
        session_duration = (session_end - session_start).total_seconds() / 60

        print(
            f"\nSession: {session_start.strftime('%Y-%m-%d %H:%M')} (duration: {session_duration:.0f} min)"
        )

        cycles = int(session_duration / CYCLE_LENGTH) + 1

        for cycle_num in range(min(cycles, 6)):
            cycle_start_min = cycle_num * CYCLE_LENGTH
            cycle_end_min = (cycle_num + 1) * CYCLE_LENGTH

            cycle_stages = {"awake": 0, "nrem": 0, "rem": 0}

            for stage in session:
                stage_start_min = (stage["start"] - session_start).total_seconds() / 60
                stage_end_min = (stage["end"] - session_start).total_seconds() / 60

                overlap_start = max(stage_start_min, cycle_start_min)
                overlap_end = min(stage_end_min, cycle_end_min)

                if overlap_end > overlap_start:
                    cycle_stages[stage["stage"]] += overlap_end - overlap_start

            total = sum(cycle_stages.values())
            if total > 0:
                pcts = {s: cycle_stages[s] / total * 100 for s in cycle_stages}
                print(
                    f"  Cycle {cycle_num + 1} ({cycle_start_min:.0f}-{cycle_end_min:.0f}min): "
                    f"Awake={pcts['awake']:.0f}%, NREM={pcts['nrem']:.0f}%, REM={pcts['rem']:.0f}%"
                )


if __name__ == "__main__":
    main()
