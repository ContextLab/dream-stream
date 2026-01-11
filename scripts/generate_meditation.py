#!/usr/bin/env python3
"""
Meditation Audio Generation Script for dream_stream

Generates meditation audio with:
- TTS narration using Edge TTS
- Timed pauses between sections
- Extended music-only sections
- Ambient music background with chord progressions
- Music intro with fade-in
- 10-minute outro with gradual fade-out

Usage:
    python scripts/generate_meditation.py --meditation
    python scripts/generate_meditation.py --volume-test
    python scripts/generate_meditation.py --all
"""

import argparse
import asyncio
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

try:
    import edge_tts
except ImportError:
    print("Installing edge-tts...")
    subprocess.run([sys.executable, "-m", "pip", "install", "edge-tts"], check=True)
    import edge_tts

try:
    import numpy as np
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "numpy"], check=True)
    import numpy as np

try:
    import soundfile as sf
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "soundfile"], check=True)
    import soundfile as sf

PROJECT_ROOT = Path(__file__).parent.parent
OUTPUT_DIR = PROJECT_ROOT / "public" / "audio"
CACHE_DIR = PROJECT_ROOT / ".audio_cache"

VOICE = "en-GB-SoniaNeural"
RATE = "-30%"
PITCH = "-15Hz"

SAMPLE_RATE = 44100
MUSIC_VOLUME_NARRATION = 0.18
MUSIC_VOLUME_PAUSE = 0.28
MUSIC_VOLUME_MUSIC_ONLY = 0.35
INTRO_DURATION_SEC = 30.0
INTRO_FADE_SEC = 10.0
OUTRO_DURATION_SEC = 600.0
OUTRO_FADE_SEC = 600.0

# Meditation-specific music theme (calming, sleep-inducing)
MEDITATION_THEME = {
    "description": "Calming meditation pads for sleep induction",
    "base_freq": 432,  # 432Hz tuning for relaxation
    "chord_progression": [
        "Cmaj9",
        "Am11",
        "Fmaj9",
        "Gsus2",
        "Em9",
        "Dm11",
        "Bbmaj7",
        "Cmaj9",
    ],
    "tempo_bpm": 40,  # Very slow for meditation
    "instrument": "ethereal_pad",
    "add_shimmer": True,
    "add_sub_bass": True,
}

# Chord frequencies (same as generate_music.py)
CHORD_FREQUENCIES = {
    "C": [130.81, 164.81, 196.00],
    "Cmaj7": [130.81, 164.81, 196.00, 246.94],
    "Cmaj9": [130.81, 164.81, 196.00, 246.94, 293.66],
    "Dm": [146.83, 174.61, 220.00],
    "Dm7": [146.83, 174.61, 220.00, 261.63],
    "Dm9": [146.83, 174.61, 220.00, 261.63, 329.63],
    "Dm11": [146.83, 174.61, 220.00, 261.63, 329.63, 392.00],
    "Em": [164.81, 196.00, 246.94],
    "Em7": [164.81, 196.00, 246.94, 293.66],
    "Em9": [164.81, 196.00, 246.94, 293.66, 369.99],
    "Em11": [164.81, 196.00, 246.94, 293.66, 369.99, 440.00],
    "F": [174.61, 220.00, 261.63],
    "Fmaj7": [174.61, 220.00, 261.63, 329.63],
    "Fmaj9": [174.61, 220.00, 261.63, 329.63, 392.00],
    "Fm9": [174.61, 207.65, 261.63, 311.13, 392.00],
    "G": [196.00, 246.94, 293.66],
    "G6": [196.00, 246.94, 293.66, 329.63],
    "G7": [196.00, 246.94, 293.66, 174.61],
    "Gsus2": [196.00, 220.00, 293.66],
    "Gsus4": [196.00, 261.63, 293.66],
    "Am": [220.00, 261.63, 329.63],
    "Am7": [220.00, 261.63, 329.63, 196.00],
    "Am9": [220.00, 261.63, 329.63, 196.00, 246.94],
    "Am11": [220.00, 261.63, 329.63, 196.00, 246.94, 293.66],
    "Bbmaj7": [233.08, 293.66, 349.23, 220.00],
    "Bbmaj9": [233.08, 293.66, 349.23, 220.00, 261.63],
    "Bm7": [246.94, 293.66, 369.99, 220.00],
    "Dbmaj7": [138.59, 174.61, 207.65, 261.63],
    "Abmaj9": [207.65, 261.63, 311.13, 196.00, 233.08],
    "Eb6": [155.56, 196.00, 233.08, 261.63],
    "Gm11": [196.00, 233.08, 293.66, 174.61, 220.00, 261.63],
    "Asus4": [220.00, 293.66, 329.63],
    "E": [164.81, 207.65, 246.94],
    "E7sus4": [164.81, 220.00, 246.94, 293.66],
    "D": [146.83, 185.00, 220.00],
}


def ensure_cache_dir():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def generate_silence_samples(duration_seconds: float) -> np.ndarray:
    """Generate silence as numpy array"""
    return np.zeros(int(duration_seconds * SAMPLE_RATE))


def scale_frequencies(freqs: list, base_freq: float) -> list:
    ratio = base_freq / 440.0
    return [f * ratio for f in freqs]


def generate_adsr_envelope(
    duration: float,
    attack: float = 0.1,
    decay: float = 0.2,
    sustain: float = 0.7,
    release: float = 0.3,
) -> np.ndarray:
    samples = int(SAMPLE_RATE * duration)
    envelope = np.zeros(samples)

    attack_samples = int(SAMPLE_RATE * min(attack, duration * 0.25))
    decay_samples = int(SAMPLE_RATE * min(decay, duration * 0.15))
    release_samples = int(SAMPLE_RATE * min(release, duration * 0.25))
    sustain_samples = max(0, samples - attack_samples - decay_samples - release_samples)

    idx = 0
    if attack_samples > 0:
        envelope[idx : idx + attack_samples] = np.linspace(0, 1, attack_samples)
        idx += attack_samples
    if decay_samples > 0:
        envelope[idx : idx + decay_samples] = np.linspace(1, sustain, decay_samples)
        idx += decay_samples
    if sustain_samples > 0:
        envelope[idx : idx + sustain_samples] = sustain
        idx += sustain_samples
    if release_samples > 0 and idx < samples:
        remaining = samples - idx
        envelope[idx:] = np.linspace(sustain, 0, remaining)

    return envelope


def generate_ethereal_pad(freq: float, duration: float) -> np.ndarray:
    """Airy, floating pad with chorus-like detuning"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    tone = np.zeros_like(t)

    for detune_cents in [-12, -5, 0, 5, 12]:
        detune_ratio = 2 ** (detune_cents / 1200)
        phase = np.random.uniform(0, 2 * np.pi)
        tone += 0.2 * np.sin(2 * np.pi * freq * detune_ratio * t + phase)

    tone += 0.08 * np.sin(2 * np.pi * freq * 2 * t)
    tone += 0.04 * np.sin(2 * np.pi * freq * 3 * t)

    lfo1 = 0.9 + 0.1 * np.sin(2 * np.pi * 0.13 * t)
    lfo2 = 0.95 + 0.05 * np.sin(2 * np.pi * 0.07 * t + 1.5)
    tone *= lfo1 * lfo2

    envelope = generate_adsr_envelope(
        duration, attack=3.0, decay=1.5, sustain=0.75, release=3.0
    )

    return tone * envelope


def generate_shimmer_for_chord(chord_freqs: list, duration: float) -> np.ndarray:
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    shimmer = np.zeros_like(t)

    for base_freq in chord_freqs[:3]:
        for octave_mult in [4, 5, 6]:
            freq = base_freq * octave_mult + np.random.uniform(-5, 5)
            phase = np.random.uniform(0, 2 * np.pi)
            amp = np.random.uniform(0.005, 0.015)
            mod_freq = np.random.uniform(0.03, 0.1)
            mod = 0.5 + 0.5 * np.sin(2 * np.pi * mod_freq * t + phase)
            shimmer += amp * np.sin(2 * np.pi * freq * t + phase) * mod

    envelope = generate_adsr_envelope(
        duration, attack=2.0, decay=1.0, sustain=0.7, release=2.0
    )

    return shimmer * envelope


def generate_sub_bass_for_chord(root_freq: float, duration: float) -> np.ndarray:
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    sub_freq = root_freq / 2
    while sub_freq > 80:
        sub_freq /= 2
    while sub_freq < 40:
        sub_freq *= 2

    sub = 0.12 * np.sin(2 * np.pi * sub_freq * t)
    sub += 0.04 * np.sin(2 * np.pi * sub_freq * 2 * t)

    envelope = generate_adsr_envelope(
        duration, attack=1.5, decay=0.5, sustain=0.85, release=1.5
    )

    return sub * envelope


def generate_chord(
    chord_name: str,
    duration: float,
    base_freq: float,
    config: dict,
) -> np.ndarray:
    if chord_name not in CHORD_FREQUENCIES:
        chord_name = list(CHORD_FREQUENCIES.keys())[0]

    freqs = scale_frequencies(CHORD_FREQUENCIES[chord_name], base_freq)
    samples = int(SAMPLE_RATE * duration)

    chord = np.zeros(samples)

    for freq in freqs:
        tone = generate_ethereal_pad(freq, duration)
        if len(tone) < samples:
            tone = np.pad(tone, (0, samples - len(tone)))
        elif len(tone) > samples:
            tone = tone[:samples]
        chord += tone

    chord /= len(freqs)

    return chord


def generate_music_track(duration_seconds: float) -> np.ndarray:
    """Generate meditation music with chord progressions"""
    config = MEDITATION_THEME
    base_freq = config["base_freq"]
    progression = config["chord_progression"]
    tempo = config["tempo_bpm"]

    samples = int(SAMPLE_RATE * duration_seconds)
    track = np.zeros(samples)

    chord_duration = 60.0 / tempo * 8
    total_chords = int(duration_seconds / chord_duration) + 1

    print(f"    Chord progression: {' -> '.join(progression[:4])}...")
    print(f"    Generating {total_chords} chord changes...")

    for i in range(total_chords):
        chord_name = progression[i % len(progression)]
        start_sample = int(i * chord_duration * SAMPLE_RATE)

        if start_sample >= samples:
            break

        remaining_duration = min(
            chord_duration * 1.3, (samples - start_sample) / SAMPLE_RATE
        )

        chord = generate_chord(chord_name, remaining_duration, base_freq, config)

        end_sample = min(start_sample + len(chord), samples)
        chord_len = end_sample - start_sample
        track[start_sample:end_sample] += chord[:chord_len]

    if config.get("add_shimmer") or config.get("add_sub_bass"):
        print("    Adding shimmer and sub-bass layers...")
        for i in range(total_chords):
            chord_name = progression[i % len(progression)]
            start_sample = int(i * chord_duration * SAMPLE_RATE)

            if start_sample >= samples:
                break

            remaining_duration = min(
                chord_duration * 1.3, (samples - start_sample) / SAMPLE_RATE
            )
            chord_freqs = scale_frequencies(
                CHORD_FREQUENCIES.get(chord_name, [220, 261, 329]), base_freq
            )

            if config.get("add_shimmer"):
                shimmer = generate_shimmer_for_chord(chord_freqs, remaining_duration)
                end_sample = min(start_sample + len(shimmer), samples)
                track[start_sample:end_sample] += shimmer[: end_sample - start_sample]

            if config.get("add_sub_bass"):
                root_freq = chord_freqs[0]
                sub = generate_sub_bass_for_chord(root_freq, remaining_duration)
                end_sample = min(start_sample + len(sub), samples)
                track[start_sample:end_sample] += sub[: end_sample - start_sample]

    evolution = 0.7 + 0.3 * np.sin(
        2 * np.pi * (0.5 / duration_seconds) * np.linspace(0, duration_seconds, samples)
    )
    track *= evolution

    max_val = np.max(np.abs(track))
    if max_val > 0:
        track = track / max_val * 0.85

    return track


async def generate_tts_to_wav(text: str, output_path: Path):
    """Generate TTS audio and convert to WAV"""
    mp3_path = output_path.with_suffix(".mp3")
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
    await communicate.save(str(mp3_path))

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(mp3_path),
            "-ar",
            str(SAMPLE_RATE),
            "-ac",
            "1",
            str(output_path),
        ],
        check=True,
        capture_output=True,
    )
    mp3_path.unlink(missing_ok=True)


def load_wav_mono(path: Path) -> np.ndarray:
    """Load WAV file as mono numpy array"""
    data, sr = sf.read(str(path))
    if len(data.shape) > 1:
        data = np.mean(data, axis=1)
    if sr != SAMPLE_RATE:
        import warnings

        warnings.warn(f"Sample rate mismatch: {sr} vs {SAMPLE_RATE}")
    return data


def parse_meditation_segments(content: str) -> list:
    """Parse meditation content with different marker types"""
    segments = []
    remaining = content.strip()

    pause_pattern = r"\[PAUSE:(\d+)s\]"
    music_pattern = r"\[MUSIC:(\d+)m\]"

    while remaining:
        pause_match = re.search(pause_pattern, remaining)
        music_match = re.search(music_pattern, remaining)

        next_marker = None
        next_pos = len(remaining)

        if pause_match and pause_match.start() < next_pos:
            next_marker = ("pause", pause_match)
            next_pos = pause_match.start()

        if music_match and music_match.start() < next_pos:
            next_marker = ("music", music_match)
            next_pos = music_match.start()

        if next_pos > 0:
            text = remaining[:next_pos].strip()
            if text:
                segments.append({"type": "narration", "text": text})

        if next_marker:
            marker_type, match = next_marker
            if marker_type == "pause":
                duration = int(match.group(1))
                segments.append({"type": "pause", "duration_seconds": duration})
            elif marker_type == "music":
                duration = int(match.group(1)) * 60
                segments.append({"type": "music", "duration_seconds": duration})
            remaining = remaining[match.end() :].strip()
        else:
            break

    return segments


async def generate_meditation_audio(
    output_id: str,
    content: str,
    output_subdir: str = "meditation",
    apply_fades: bool = True,
):
    """Generate meditation audio with music"""
    output_dir = OUTPUT_DIR / output_subdir
    output_dir.mkdir(parents=True, exist_ok=True)

    work_dir = CACHE_DIR / output_id
    work_dir.mkdir(parents=True, exist_ok=True)

    segments = parse_meditation_segments(content)

    print(f"  Parsed {len(segments)} segments")

    narration_parts = []
    volume_regions = []
    current_time = 0.0

    print(f"  Adding {INTRO_DURATION_SEC}s music intro...")
    narration_parts.append(
        {
            "type": "silence",
            "data": generate_silence_samples(INTRO_DURATION_SEC),
            "start_time": current_time,
            "duration": INTRO_DURATION_SEC,
        }
    )
    volume_regions.append(
        (current_time, current_time + INTRO_DURATION_SEC, MUSIC_VOLUME_MUSIC_ONLY)
    )
    current_time += INTRO_DURATION_SEC

    segment_idx = 0
    for seg in segments:
        segment_idx += 1

        if seg["type"] == "narration":
            wav_path = work_dir / f"segment_{segment_idx:03d}.wav"
            word_count = len(seg["text"].split())
            print(f"  [{segment_idx}] Generating narration ({word_count} words)...")
            await generate_tts_to_wav(seg["text"], wav_path)

            audio_data = load_wav_mono(wav_path)
            duration = len(audio_data) / SAMPLE_RATE

            narration_parts.append(
                {
                    "type": "narration",
                    "data": audio_data,
                    "start_time": current_time,
                    "duration": duration,
                }
            )
            volume_regions.append(
                (current_time, current_time + duration, MUSIC_VOLUME_NARRATION)
            )
            current_time += duration
            wav_path.unlink(missing_ok=True)

        elif seg["type"] == "pause":
            duration = seg["duration_seconds"]
            print(f"  [{segment_idx}] Adding {duration}s pause...")

            narration_parts.append(
                {
                    "type": "silence",
                    "data": generate_silence_samples(duration),
                    "start_time": current_time,
                    "duration": duration,
                }
            )
            volume_regions.append(
                (current_time, current_time + duration, MUSIC_VOLUME_PAUSE)
            )
            current_time += duration

        elif seg["type"] == "music":
            duration = seg["duration_seconds"]
            print(f"  [{segment_idx}] Adding {duration // 60}m music-only section...")

            narration_parts.append(
                {
                    "type": "silence",
                    "data": generate_silence_samples(duration),
                    "start_time": current_time,
                    "duration": duration,
                }
            )
            volume_regions.append(
                (current_time, current_time + duration, MUSIC_VOLUME_MUSIC_ONLY)
            )
            current_time += duration

    print(f"  Adding {OUTRO_DURATION_SEC / 60:.0f}m music outro with gradual fade...")
    narration_parts.append(
        {
            "type": "silence",
            "data": generate_silence_samples(OUTRO_DURATION_SEC),
            "start_time": current_time,
            "duration": OUTRO_DURATION_SEC,
        }
    )
    volume_regions.append(
        (current_time, current_time + OUTRO_DURATION_SEC, MUSIC_VOLUME_MUSIC_ONLY)
    )
    current_time += OUTRO_DURATION_SEC

    total_duration = current_time
    total_samples = int(total_duration * SAMPLE_RATE)

    print(f"  Total duration: {total_duration / 60:.1f} min")
    print(f"  Generating music track with chord progressions...")
    music = generate_music_track(total_duration)

    print(f"  Creating volume envelope...")
    volume_envelope = np.ones(total_samples) * MUSIC_VOLUME_NARRATION
    for start, end, volume in volume_regions:
        start_sample = int(start * SAMPLE_RATE)
        end_sample = min(int(end * SAMPLE_RATE), total_samples)

        transition_samples = int(0.5 * SAMPLE_RATE)

        if end_sample - start_sample > 2 * transition_samples:
            volume_envelope[
                start_sample + transition_samples : end_sample - transition_samples
            ] = volume

            for i in range(transition_samples):
                t = i / transition_samples
                if start_sample + i < total_samples:
                    prev_vol = volume_envelope[start_sample + i]
                    volume_envelope[start_sample + i] = prev_vol + t * (
                        volume - prev_vol
                    )
                if end_sample - transition_samples + i < total_samples:
                    volume_envelope[end_sample - transition_samples + i] = (
                        volume + t * (MUSIC_VOLUME_NARRATION - volume)
                    )
        else:
            volume_envelope[start_sample:end_sample] = volume

    print(f"  Assembling narration track...")
    narration = np.zeros(total_samples)
    for part in narration_parts:
        start_sample = int(part["start_time"] * SAMPLE_RATE)
        end_sample = start_sample + len(part["data"])
        if end_sample <= total_samples:
            narration[start_sample:end_sample] = part["data"]

    print(f"  Mixing narration with music...")
    music_scaled = music[:total_samples] * volume_envelope[: len(music)]
    mixed = narration + music_scaled

    if apply_fades:
        print(f"  Applying intro fade in...")
        fade_in_samples = int(INTRO_FADE_SEC * SAMPLE_RATE)
        fade_in = np.linspace(0, 1, fade_in_samples)
        mixed[:fade_in_samples] *= fade_in

        print(f"  Applying outro gradual fade ({OUTRO_FADE_SEC / 60:.0f} min)...")
        fade_out_samples = int(OUTRO_FADE_SEC * SAMPLE_RATE)
        fade_out = np.linspace(1, 0, fade_out_samples)
        mixed[-fade_out_samples:] *= fade_out

    max_val = np.max(np.abs(mixed))
    if max_val > 0.95:
        mixed = mixed / max_val * 0.95

    combined_wav = work_dir / "combined.wav"
    sf.write(str(combined_wav), mixed, SAMPLE_RATE)

    full_opus = output_dir / f"{output_id}_full.opus"
    print(f"  Converting to Opus...")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(combined_wav),
            "-c:a",
            "libopus",
            "-b:a",
            "80k",
            str(full_opus),
        ],
        check=True,
        capture_output=True,
    )

    combined_wav.unlink(missing_ok=True)
    try:
        work_dir.rmdir()
    except OSError:
        pass

    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "quiet",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            str(full_opus),
        ],
        capture_output=True,
        text=True,
    )
    duration = float(result.stdout.strip()) if result.stdout.strip() else 0

    print(f"  Output: {full_opus}")
    print(f"  Duration: {duration / 60:.1f} min")
    print(f"  Size: {full_opus.stat().st_size / 1024:.1f} KB")

    return {"id": output_id, "path": str(full_opus), "duration_seconds": duration}


async def generate_volume_test():
    """Generate volume test audio: 5s music + voice + 5s music (no fades)"""
    output_dir = OUTPUT_DIR / "test"
    output_dir.mkdir(parents=True, exist_ok=True)

    work_dir = CACHE_DIR / "volume-test"
    work_dir.mkdir(parents=True, exist_ok=True)

    print("Generating volume test audio...")

    voice_wav = work_dir / "voice.wav"
    print("  Generating voice...")
    await generate_tts_to_wav("My voice is your dream guide.", voice_wav)
    voice_data = load_wav_mono(voice_wav)
    voice_duration = len(voice_data) / SAMPLE_RATE
    voice_wav.unlink(missing_ok=True)

    intro_duration = 5.0
    outro_duration = 5.0
    total_duration = intro_duration + voice_duration + outro_duration
    total_samples = int(total_duration * SAMPLE_RATE)

    print(f"  Generating {total_duration:.1f}s of music with chord progressions...")
    np.random.seed(123)
    music = generate_music_track(total_duration)

    volume_envelope = np.ones(total_samples) * MUSIC_VOLUME_MUSIC_ONLY
    voice_start = int(intro_duration * SAMPLE_RATE)
    voice_end = voice_start + len(voice_data)
    volume_envelope[voice_start:voice_end] = MUSIC_VOLUME_NARRATION

    narration = np.zeros(total_samples)
    narration[voice_start:voice_end] = voice_data

    music_scaled = music * volume_envelope
    mixed = narration + music_scaled

    max_val = np.max(np.abs(mixed))
    if max_val > 0.95:
        mixed = mixed / max_val * 0.95

    combined_wav = work_dir / "combined.wav"
    sf.write(str(combined_wav), mixed, SAMPLE_RATE)

    full_opus = output_dir / "volume_test.opus"
    print("  Converting to Opus...")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(combined_wav),
            "-c:a",
            "libopus",
            "-b:a",
            "80k",
            str(full_opus),
        ],
        check=True,
        capture_output=True,
    )

    combined_wav.unlink(missing_ok=True)
    try:
        work_dir.rmdir()
    except OSError:
        pass

    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "quiet",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            str(full_opus),
        ],
        capture_output=True,
        text=True,
    )
    duration = float(result.stdout.strip()) if result.stdout.strip() else 0

    print(f"  Output: {full_opus}")
    print(f"  Duration: {duration:.1f}s")

    return full_opus


SLEEP_MEDITATION_CONTENT = """Welcome to this gentle journey into sleep. Find a comfortable position and allow your body to settle. There is nothing you need to do right now except breathe and let go.

[PAUSE:15s]

Let your eyes close softly. Take a slow, deep breath in through your nose.

[PAUSE:10s]

Hold it gently.

[PAUSE:5s]

And release through your mouth with a soft sigh. Feel your body sink a little deeper into your bed.

[PAUSE:15s]

Take another deep breath in... filling your lungs completely.

[PAUSE:10s]

And as you exhale, let any remaining tension from the day flow out of you like water.

[PAUSE:15s]

One more deep breath... breathing in peace and calm.

[PAUSE:10s]

And breathing out anything that no longer serves you.

[PAUSE:30s]

Now let your breathing return to its natural rhythm. There's no need to control it. Simply notice each breath as it comes and goes, like gentle waves on a shore.

[PAUSE:20s]

With each exhale, you become more relaxed. With each breath, you drift a little closer to the peaceful realm of sleep.

[PAUSE:30s]

Now we'll gently relax each part of your body, starting from the top of your head and flowing down to your toes. There's no effort required. Simply bring your awareness to each area, and let it soften.

[PAUSE:30s]

Bring your attention to your forehead. Notice any tension there.

[PAUSE:10s]

As you breathe out, let your forehead smooth and relax. Feel it soften like butter melting in warm sunlight.

[PAUSE:15s]

Let this relaxation flow down to your eyes. Your eyelids become heavy and soft. The tiny muscles around your eyes release and let go.

[PAUSE:15s]

Feel your cheeks relax. Your jaw unclenches, your teeth part slightly. Let your tongue rest loosely in your mouth.

[PAUSE:10s]

Your whole face is soft and peaceful.

[PAUSE:30s]

This wave of relaxation flows into your neck. Feel the muscles on the sides and back of your neck release their grip.

[PAUSE:10s]

Your head feels heavier, sinking deeper into your pillow.

[PAUSE:15s]

Your shoulders drop away from your ears. Let them fall, releasing the weight of the day.

[PAUSE:10s]

Any burdens you've been carrying can be set down now. You don't need them anymore tonight.

[PAUSE:30s]

Feel the relaxation spreading across your upper back, between your shoulder blades. These muscles that work so hard to support you can finally rest.

[PAUSE:15s]

The warmth flows down your spine, vertebra by vertebra.

[PAUSE:10s]

Your middle back softens.

[PAUSE:10s]

Your lower back releases into the bed beneath you.

[PAUSE:30s]

Bring your awareness to your chest. Feel it rise and fall with each easy breath. Your heart beats steadily, peacefully, asking nothing of you.

[PAUSE:15s]

Your stomach softens. Release any tightness you've been holding there.

[PAUSE:10s]

Let your belly be soft and relaxed, rising and falling gently with your breath.

[PAUSE:30s]

Now feel the relaxation flowing down your arms. Your upper arms grow heavy.

[PAUSE:10s]

Your elbows release.

[PAUSE:10s]

Your forearms become soft and loose.

[PAUSE:15s]

This peaceful feeling flows into your wrists, your hands, your palms.

[PAUSE:10s]

Feel each finger relax, one by one. Thumb.

[PAUSE:5s]

Index finger.

[PAUSE:5s]

Middle finger.

[PAUSE:5s]

Ring finger.

[PAUSE:5s]

Pinky.

[PAUSE:10s]

Your hands are completely at rest.

[PAUSE:30s]

Bring your attention to your hips. Feel them sink into the mattress. Any tension stored here melts away with each breath.

[PAUSE:15s]

The relaxation flows into your thighs. Feel the large muscles in your upper legs become heavy and soft. They've carried you through this day, and now they can rest.

[PAUSE:15s]

Your knees relax.

[PAUSE:10s]

Your calves soften.

[PAUSE:10s]

The muscles in your shins let go.

[PAUSE:15s]

Finally, feel this wave of peace wash over your ankles, the tops of your feet, and your soles.

[PAUSE:10s]

Each toe relaxes... one by one... until your entire foot is soft and warm.

[PAUSE:30s]

Your whole body is now deeply relaxed. From the top of your head to the tips of your toes, you are at peace.

[PAUSE:10s]

You are safe.

[PAUSE:10s]

You are held.

[PAUSE:30s]

As you drift now toward sleep, know that your dreams await you. They will unfold naturally, bringing whatever your mind needs tonight.

[PAUSE:20s]

There is nothing more you need to do. Just breathe... and let go... and allow sleep to take you gently into its embrace.

[PAUSE:30s]

Rest now. Sleep peacefully. Sweet dreams.

[MUSIC:30m]"""


async def main():
    parser = argparse.ArgumentParser(
        description="Generate meditation audio for dream_stream"
    )
    parser.add_argument(
        "--meditation", action="store_true", help="Generate sleep meditation"
    )
    parser.add_argument(
        "--volume-test", action="store_true", help="Generate volume test audio"
    )
    parser.add_argument(
        "--all", action="store_true", help="Generate all meditation audio"
    )
    args = parser.parse_args()

    if not any([args.meditation, args.volume_test, args.all]):
        parser.print_help()
        sys.exit(1)

    print("=" * 60)
    print("dream_stream Meditation Audio Generator")
    print("=" * 60)

    ensure_cache_dir()

    if args.volume_test or args.all:
        print("\n--- Volume Test ---")
        await generate_volume_test()

    if args.meditation or args.all:
        print("\n--- Sleep Meditation ---")
        await generate_meditation_audio(
            output_id="sleep-meditation",
            content=SLEEP_MEDITATION_CONTENT,
            output_subdir="meditation",
            apply_fades=True,
        )

    print("\n" + "=" * 60)
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
