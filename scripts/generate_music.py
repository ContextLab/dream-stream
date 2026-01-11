#!/usr/bin/env python3
"""
Ambient Music Generation Script for Dream Stream

Generates evolving ambient background music for dream playback using procedural
synthesis with musical structure: chord progressions, unique instruments per theme,
and dynamic volume that responds to narration pauses.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

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
OUTPUT_DIR = PROJECT_ROOT / "public" / "audio" / "music"
DREAMS_DIR = PROJECT_ROOT / "public" / "audio" / "dreams"
DREAM_DATA_PATH = PROJECT_ROOT / "lib" / "dreamData.ts"

SAMPLE_RATE = 44100

MUSIC_VOLUME_BASE = 0.22
MUSIC_VOLUME_PAUSE = 0.30
FADE_DURATION = 15.0
PAUSE_DURATION_MS = 45000

MUSIC_THEMES = {
    "ambient": {
        "description": "Ethereal floating pads - airy, dreamlike",
        "base_freq": 432,
        "chord_progression": [
            "Cmaj9",
            "Am11",
            "Fmaj9",
            "Gsus4",
            "Em9",
            "Dm11",
            "Bbmaj7",
            "Gsus2",
        ],
        "tempo_bpm": 50,
        "instrument": "ethereal_pad",
        "add_shimmer": True,
        "add_sub_bass": True,
    },
    "piano": {
        "description": "Gentle piano with soft mallets and bells",
        "base_freq": 440,
        "chord_progression": [
            "Am9",
            "Fmaj7",
            "C",
            "G6",
            "Dm9",
            "Am7",
            "Fmaj9",
            "E7sus4",
        ],
        "tempo_bpm": 65,
        "instrument": "soft_piano",
        "add_bells": True,
        "add_pad_layer": True,
    },
    "nature": {
        "description": "Organic textures with wind, water, and earth tones",
        "base_freq": 432,
        "chord_progression": [
            "Em11",
            "Cmaj9",
            "G6",
            "D",
            "Am9",
            "Em7",
            "Bm7",
            "Cmaj7",
        ],
        "tempo_bpm": 45,
        "instrument": "organic_tone",
        "add_nature_sounds": True,
        "add_breath": True,
    },
    "cosmic": {
        "description": "Deep space drones with vast reverberant textures",
        "base_freq": 432,
        "chord_progression": [
            "Dm9",
            "Bbmaj9",
            "Gm11",
            "Asus4",
            "Fm9",
            "Dbmaj7",
            "Abmaj9",
            "Eb6",
        ],
        "tempo_bpm": 35,
        "instrument": "space_drone",
        "add_cosmic_sweep": True,
        "add_deep_pulse": True,
    },
    "binaural": {
        "description": "Theta-wave entrainment with gentle carriers",
        "base_freq": 432,
        "chord_progression": [
            "C",
            "Am",
            "F",
            "G",
            "Dm",
            "Am",
            "E",
            "Am",
        ],
        "tempo_bpm": 40,
        "instrument": "binaural_carrier",
        "beat_frequency": 6.0,
        "add_theta_pulse": True,
    },
    "silence": {
        "description": "Near-silence with barely perceptible tones",
        "base_freq": 432,
        "chord_progression": ["C", "Am"],
        "tempo_bpm": 30,
        "instrument": "whisper_tone",
    },
}

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


def generate_soft_piano(freq: float, duration: float) -> np.ndarray:
    """Soft felt piano with rounded attack"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    tone = np.zeros_like(t)

    harmonics = [1, 2, 3, 4, 5, 6, 7, 8]
    amps = [1.0, 0.6, 0.3, 0.2, 0.1, 0.05, 0.025, 0.01]
    decays = [0.8, 1.2, 1.8, 2.2, 2.8, 3.2, 3.5, 4.0]

    for h, a, d in zip(harmonics, amps, decays):
        decay_env = np.exp(-t * d)
        slight_detune = 1 + np.random.uniform(-0.001, 0.001)
        tone += a * np.sin(2 * np.pi * freq * h * slight_detune * t) * decay_env

    envelope = generate_adsr_envelope(
        duration, attack=0.08, decay=0.4, sustain=0.25, release=1.0
    )

    return tone * envelope * 0.5


def generate_organic_tone(freq: float, duration: float) -> np.ndarray:
    """Warm, breathy tone like a wooden flute"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    tone = np.zeros_like(t)

    tone += 0.5 * np.sin(2 * np.pi * freq * t)
    tone += 0.25 * np.sin(2 * np.pi * freq * 2 * t)
    tone += 0.1 * np.sin(2 * np.pi * freq * 3 * t)

    breath = np.random.randn(len(t)) * 0.02
    from scipy import signal

    b, a = signal.butter(
        2, [freq * 0.8, min(freq * 3, 8000)], btype="band", fs=SAMPLE_RATE
    )
    breath = signal.lfilter(b, a, breath)
    tone += breath

    vibrato_rate = 4.5 + np.random.uniform(-0.5, 0.5)
    vibrato_depth = 0.003
    vibrato = 1 + vibrato_depth * np.sin(2 * np.pi * vibrato_rate * t)
    tone_with_vibrato = np.zeros_like(t)
    for i, (samp, vib) in enumerate(zip(tone, vibrato)):
        tone_with_vibrato[i] = samp * vib

    envelope = generate_adsr_envelope(
        duration, attack=0.5, decay=0.3, sustain=0.7, release=1.0
    )

    return tone_with_vibrato * envelope * 0.6


def generate_space_drone(freq: float, duration: float) -> np.ndarray:
    """Deep, vast space drone with slow evolution"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    drone = np.zeros_like(t)

    drone += 0.4 * np.sin(2 * np.pi * freq * t)
    drone += 0.5 * np.sin(2 * np.pi * freq * 0.5 * t)
    drone += 0.3 * np.sin(2 * np.pi * freq * 0.25 * t)

    slow_wobble = 1.5 * np.sin(2 * np.pi * 0.02 * t)
    drone += 0.15 * np.sin(2 * np.pi * (freq * 0.5 + slow_wobble) * t)

    high_shimmer = 0.03 * np.sin(2 * np.pi * freq * 5 * t)
    shimmer_mod = 0.5 + 0.5 * np.sin(2 * np.pi * 0.08 * t)
    drone += high_shimmer * shimmer_mod

    envelope = generate_adsr_envelope(
        duration, attack=5.0, decay=2.0, sustain=0.85, release=5.0
    )

    return drone * envelope


def generate_binaural_carrier(
    freq: float, duration: float, beat_freq: float = 6.0
) -> np.ndarray:
    """Binaural beat carrier (returns stereo)"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    left = 0.4 * np.sin(2 * np.pi * freq * t)
    right = 0.4 * np.sin(2 * np.pi * (freq + beat_freq) * t)

    pad = np.zeros_like(t)
    pad += 0.15 * np.sin(2 * np.pi * freq * 0.5 * t)
    pad += 0.1 * np.sin(2 * np.pi * freq * 0.25 * t)

    envelope = generate_adsr_envelope(
        duration, attack=2.0, decay=1.0, sustain=0.8, release=2.0
    )

    left = (left + pad) * envelope
    right = (right + pad) * envelope

    return np.column_stack([left, right])


def generate_whisper_tone(freq: float, duration: float) -> np.ndarray:
    """Barely audible tone"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    tone = 0.02 * np.sin(2 * np.pi * freq * t)

    envelope = generate_adsr_envelope(
        duration, attack=5.0, decay=2.0, sustain=0.5, release=5.0
    )

    return tone * envelope


def generate_shimmer_for_chord(chord_freqs: list, duration: float) -> np.ndarray:
    """High frequency shimmering texture based on chord tones"""
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
    """Deep sub-bass following chord root"""
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


def generate_bells_layer(
    chord_freqs: list, duration: float, tempo: float
) -> np.ndarray:
    """Gentle bell/chime accents"""
    samples = int(SAMPLE_RATE * duration)
    bells = np.zeros(samples)

    note_interval = 60.0 / tempo * 2
    num_notes = int(duration / note_interval)

    for i in range(num_notes):
        if np.random.random() > 0.4:
            continue

        freq = np.random.choice(chord_freqs) * 2
        start = int(i * note_interval * SAMPLE_RATE)
        bell_dur = min(3.0, (samples - start) / SAMPLE_RATE)

        if bell_dur < 0.5:
            continue

        t = np.linspace(0, bell_dur, int(SAMPLE_RATE * bell_dur), endpoint=False)

        bell = 0.03 * np.sin(2 * np.pi * freq * t) * np.exp(-t * 1.5)
        bell += 0.02 * np.sin(2 * np.pi * freq * 2.4 * t) * np.exp(-t * 2.0)
        bell += 0.01 * np.sin(2 * np.pi * freq * 5.2 * t) * np.exp(-t * 3.0)

        end = min(start + len(bell), samples)
        bells[start:end] += bell[: end - start]

    return bells


def generate_nature_sounds(duration: float) -> np.ndarray:
    """Wind and subtle water textures"""
    samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, samples, endpoint=False)

    from scipy import signal

    wind = np.random.randn(samples) * 0.08
    b, a = signal.butter(3, [80, 600], btype="band", fs=SAMPLE_RATE)
    wind = signal.lfilter(b, a, wind)

    gust1 = 0.4 + 0.6 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.03 * t))
    gust2 = 0.6 + 0.4 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.017 * t + 1.2))
    wind *= gust1 * gust2

    water = np.zeros(samples)
    num_drops = int(duration * 1.5)
    for _ in range(num_drops):
        pos = np.random.randint(0, samples - 8000)
        drop_freq = np.random.uniform(1200, 2500)
        drop_len = np.random.randint(3000, 8000)
        drop_t = np.linspace(0, drop_len / SAMPLE_RATE, drop_len)
        drop = 0.015 * np.sin(2 * np.pi * drop_freq * drop_t) * np.exp(-drop_t * 6)
        water[pos : pos + drop_len] += drop

    return wind * 0.25 + water


def generate_breath_layer(duration: float) -> np.ndarray:
    """Soft breathing texture"""
    samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, samples, endpoint=False)

    from scipy import signal

    breath = np.random.randn(samples) * 0.03
    b, a = signal.butter(2, 800, btype="low", fs=SAMPLE_RATE)
    breath = signal.lfilter(b, a, breath)

    breath_rate = 0.12
    mod = 0.3 + 0.7 * (0.5 + 0.5 * np.sin(2 * np.pi * breath_rate * t))

    return breath * mod


def generate_cosmic_sweep(duration: float, base_freq: float) -> np.ndarray:
    """Slow frequency sweeps through space"""
    samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, samples, endpoint=False)

    sweep = np.zeros(samples)

    for _ in range(4):
        start_mult = np.random.uniform(1, 3)
        end_mult = np.random.uniform(1, 3)
        start_freq = base_freq * start_mult
        end_freq = base_freq * end_mult

        freq_curve = np.linspace(start_freq, end_freq, samples)
        phase = np.cumsum(2 * np.pi * freq_curve / SAMPLE_RATE)

        amp = np.random.uniform(0.02, 0.04)
        sweep += amp * np.sin(phase)

    envelope = generate_adsr_envelope(
        duration, attack=3.0, decay=1.0, sustain=0.8, release=3.0
    )

    return sweep * envelope


def generate_deep_pulse(duration: float, base_freq: float) -> np.ndarray:
    """Deep rhythmic pulse"""
    samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, samples, endpoint=False)

    pulse_freq = base_freq / 8
    pulse = 0.1 * np.sin(2 * np.pi * pulse_freq * t)

    mod = 0.5 + 0.5 * np.sin(2 * np.pi * 0.1 * t)

    return pulse * mod


def generate_theta_pulse(duration: float) -> np.ndarray:
    """Subtle theta rhythm pulse"""
    samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, samples, endpoint=False)

    theta_freq = 6.0
    pulse = 0.03 * np.sin(2 * np.pi * theta_freq * t)

    envelope = 0.7 + 0.3 * np.sin(2 * np.pi * 0.05 * t)

    return pulse * envelope


def generate_chord(
    chord_name: str,
    duration: float,
    base_freq: float,
    config: dict,
) -> np.ndarray:
    """Generate a full chord with the theme's instrument"""
    if chord_name not in CHORD_FREQUENCIES:
        chord_name = list(CHORD_FREQUENCIES.keys())[0]

    freqs = scale_frequencies(CHORD_FREQUENCIES[chord_name], base_freq)
    samples = int(SAMPLE_RATE * duration)

    instrument = config.get("instrument", "ethereal_pad")
    beat_freq = config.get("beat_frequency", 6.0)

    instruments = {
        "ethereal_pad": generate_ethereal_pad,
        "soft_piano": generate_soft_piano,
        "organic_tone": generate_organic_tone,
        "space_drone": generate_space_drone,
        "whisper_tone": generate_whisper_tone,
    }

    is_binaural = instrument == "binaural_carrier"

    if is_binaural:
        chord = np.zeros((samples, 2))
        for freq in freqs[:2]:
            tone = generate_binaural_carrier(freq, duration, beat_freq)
            if len(tone) < samples:
                tone = np.pad(tone, ((0, samples - len(tone)), (0, 0)))
            elif len(tone) > samples:
                tone = tone[:samples]
            chord += tone / 2
    else:
        chord = np.zeros(samples)
        gen_func = instruments.get(instrument, generate_ethereal_pad)

        for freq in freqs:
            tone = gen_func(freq, duration)
            if len(tone) < samples:
                tone = np.pad(tone, (0, samples - len(tone)))
            elif len(tone) > samples:
                tone = tone[:samples]
            chord += tone

        chord /= len(freqs)

    return chord


def generate_music_track(
    theme: str,
    duration_seconds: float,
) -> np.ndarray:
    """Generate a complete music track with evolving structure"""
    if theme not in MUSIC_THEMES:
        theme = "ambient"

    config = MUSIC_THEMES[theme]
    base_freq = config["base_freq"]
    progression = config["chord_progression"]
    tempo = config["tempo_bpm"]

    samples = int(SAMPLE_RATE * duration_seconds)

    is_binaural = config.get("instrument") == "binaural_carrier"
    if is_binaural:
        track = np.zeros((samples, 2))
    else:
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

        if is_binaural:
            end_sample = min(start_sample + len(chord), samples)
            chord_len = end_sample - start_sample
            track[start_sample:end_sample] += chord[:chord_len]
        else:
            end_sample = min(start_sample + len(chord), samples)
            chord_len = end_sample - start_sample
            track[start_sample:end_sample] += chord[:chord_len]

    if not is_binaural:
        if config.get("add_shimmer") or config.get("add_sub_bass"):
            print("    Adding chord-following shimmer/sub-bass...")
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
                    shimmer = generate_shimmer_for_chord(
                        chord_freqs, remaining_duration
                    )
                    end_sample = min(start_sample + len(shimmer), samples)
                    track[start_sample:end_sample] += shimmer[
                        : end_sample - start_sample
                    ]

                if config.get("add_sub_bass"):
                    root_freq = chord_freqs[0]
                    sub = generate_sub_bass_for_chord(root_freq, remaining_duration)
                    end_sample = min(start_sample + len(sub), samples)
                    track[start_sample:end_sample] += sub[: end_sample - start_sample]

        if config.get("add_bells"):
            print("    Adding bell accents...")
            chord_freqs = CHORD_FREQUENCIES.get(progression[0], [220, 261, 329])
            bells = generate_bells_layer(
                scale_frequencies(chord_freqs, base_freq), duration_seconds, tempo
            )
            track += bells[: len(track)]

        if config.get("add_pad_layer"):
            print("    Adding chord-following pad layer...")
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

                pad_freq = chord_freqs[0] * 0.5
                pad = generate_ethereal_pad(pad_freq, remaining_duration) * 0.25
                end_sample = min(start_sample + len(pad), samples)
                track[start_sample:end_sample] += pad[: end_sample - start_sample]

        if config.get("add_nature_sounds"):
            print("    Adding nature sounds...")
            nature = generate_nature_sounds(duration_seconds)
            track += nature[: len(track)]

        if config.get("add_breath"):
            print("    Adding breath texture...")
            breath = generate_breath_layer(duration_seconds)
            track += breath[: len(track)]

        if config.get("add_cosmic_sweep"):
            print("    Adding cosmic sweeps...")
            sweep = generate_cosmic_sweep(duration_seconds, base_freq)
            track += sweep[: len(track)]

        if config.get("add_deep_pulse"):
            print("    Adding deep pulse...")
            pulse = generate_deep_pulse(duration_seconds, base_freq)
            track += pulse[: len(track)]

        if config.get("add_theta_pulse"):
            print("    Adding theta pulse...")
            theta = generate_theta_pulse(duration_seconds)
            track += theta[: len(track)]

    if is_binaural:
        evolution = 0.7 + 0.3 * np.sin(
            2
            * np.pi
            * (0.5 / duration_seconds)
            * np.linspace(0, duration_seconds, samples)
        )
        track[:, 0] *= evolution
        track[:, 1] *= evolution
    else:
        evolution = 0.7 + 0.3 * np.sin(
            2
            * np.pi
            * (0.5 / duration_seconds)
            * np.linspace(0, duration_seconds, samples)
        )
        track *= evolution

    if is_binaural:
        max_val = np.max(np.abs(track))
    else:
        max_val = np.max(np.abs(track))

    if max_val > 0:
        track = track / max_val * 0.85

    return track


def detect_pause_regions(narration_path: Path) -> list:
    """Detect pause regions in narration (where audio is silent)"""
    try:
        data, sr = sf.read(str(narration_path))
        if data.ndim > 1:
            data = np.mean(data, axis=1)

        window_size = int(sr * 0.5)
        hop_size = int(sr * 0.1)

        pauses = []
        silence_threshold = 0.01

        i = 0
        in_pause = False
        pause_start = 0

        while i < len(data) - window_size:
            window_rms = np.sqrt(np.mean(data[i : i + window_size] ** 2))

            if window_rms < silence_threshold:
                if not in_pause:
                    in_pause = True
                    pause_start = i / sr
            else:
                if in_pause:
                    pause_end = i / sr
                    if pause_end - pause_start > 5.0:
                        pauses.append((pause_start, pause_end))
                    in_pause = False

            i += hop_size

        if in_pause:
            pause_end = len(data) / sr
            if pause_end - pause_start > 5.0:
                pauses.append((pause_start, pause_end))

        return pauses
    except Exception as e:
        print(f"  Warning: Could not detect pauses: {e}")
        return []


def create_volume_envelope(
    duration_seconds: float,
    pause_regions: list,
    fade_in: float = FADE_DURATION,
    fade_out: float = FADE_DURATION,
) -> np.ndarray:
    """Create volume envelope with fade in/out and pause boosts"""
    samples = int(SAMPLE_RATE * duration_seconds)
    envelope = np.ones(samples) * MUSIC_VOLUME_BASE

    fade_in_samples = int(SAMPLE_RATE * fade_in)
    fade_out_samples = int(SAMPLE_RATE * fade_out)

    if fade_in_samples > 0 and fade_in_samples < samples:
        envelope[:fade_in_samples] = np.linspace(0, MUSIC_VOLUME_BASE, fade_in_samples)

    if fade_out_samples > 0 and fade_out_samples < samples:
        envelope[-fade_out_samples:] = np.linspace(
            MUSIC_VOLUME_BASE, 0, fade_out_samples
        )

    transition_time = 2.0
    transition_samples = int(SAMPLE_RATE * transition_time)

    for pause_start, pause_end in pause_regions:
        start_sample = int(pause_start * SAMPLE_RATE)
        end_sample = int(pause_end * SAMPLE_RATE)

        fade_up_start = max(0, start_sample - transition_samples)
        fade_up_end = min(samples, start_sample + transition_samples)
        if fade_up_end > fade_up_start:
            envelope[fade_up_start:fade_up_end] = np.linspace(
                MUSIC_VOLUME_BASE, MUSIC_VOLUME_PAUSE, fade_up_end - fade_up_start
            )

        envelope[start_sample:end_sample] = MUSIC_VOLUME_PAUSE

        fade_down_start = end_sample
        fade_down_end = min(samples, end_sample + transition_samples)
        if fade_down_end > fade_down_start:
            envelope[fade_down_start:fade_down_end] = np.linspace(
                MUSIC_VOLUME_PAUSE, MUSIC_VOLUME_BASE, fade_down_end - fade_down_start
            )

    return envelope


def mix_narration_with_music(
    narration_path: Path,
    music: np.ndarray,
    volume_envelope: np.ndarray,
) -> np.ndarray:
    """Mix narration with background music using dynamic volume envelope"""
    narration_data, narration_sr = sf.read(str(narration_path))

    if narration_sr != SAMPLE_RATE:
        from scipy import signal

        num_samples = int(len(narration_data) * SAMPLE_RATE / narration_sr)
        narration_data = signal.resample(narration_data, num_samples)

    if narration_data.ndim > 1:
        narration_data = np.mean(narration_data, axis=1)

    is_stereo_music = music.ndim > 1

    narration_samples = len(narration_data)

    lead_samples = int(FADE_DURATION * SAMPLE_RATE)
    tail_samples = int(FADE_DURATION * SAMPLE_RATE)
    total_samples = lead_samples + narration_samples + tail_samples

    if is_stereo_music:
        if len(music) < total_samples:
            repeats = (total_samples // len(music)) + 1
            music = np.tile(music, (repeats, 1))[:total_samples]
        else:
            music = music[:total_samples]

        if len(volume_envelope) < total_samples:
            volume_envelope = np.pad(
                volume_envelope,
                (0, total_samples - len(volume_envelope)),
                constant_values=0,
            )
        else:
            volume_envelope = volume_envelope[:total_samples]

        music[:, 0] *= volume_envelope
        music[:, 1] *= volume_envelope

        narration_stereo = np.column_stack(
            [
                np.concatenate(
                    [np.zeros(lead_samples), narration_data, np.zeros(tail_samples)]
                ),
                np.concatenate(
                    [np.zeros(lead_samples), narration_data, np.zeros(tail_samples)]
                ),
            ]
        )

        mixed = narration_stereo + music
    else:
        if len(music) < total_samples:
            repeats = (total_samples // len(music)) + 1
            music = np.tile(music, repeats)[:total_samples]
        else:
            music = music[:total_samples]

        if len(volume_envelope) < total_samples:
            volume_envelope = np.pad(
                volume_envelope,
                (0, total_samples - len(volume_envelope)),
                constant_values=0,
            )
        else:
            volume_envelope = volume_envelope[:total_samples]

        music *= volume_envelope

        narration_padded = np.concatenate(
            [
                np.zeros(lead_samples),
                narration_data,
                np.zeros(tail_samples),
            ]
        )

        mixed = narration_padded + music

    max_val = np.max(np.abs(mixed))
    if max_val > 0.95:
        mixed = mixed / max_val * 0.95

    return mixed


def convert_to_opus(wav_path: Path, opus_path: Path, bitrate: str = "96k") -> bool:
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(wav_path),
                "-c:a",
                "libopus",
                "-b:a",
                bitrate,
                str(opus_path),
            ],
            check=True,
            capture_output=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"  FFmpeg error: {e.stderr.decode()}")
        return False


def get_audio_duration(path: Path) -> float:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "quiet",
                "-show_entries",
                "format=duration",
                "-of",
                "csv=p=0",
                str(path),
            ],
            capture_output=True,
            text=True,
        )
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def get_dream_theme(dream_id: str) -> str:
    """Get the music theme for a dream from dreamData.ts"""
    try:
        content = DREAM_DATA_PATH.read_text()

        dreams = re.findall(
            r"\{\s*title:\s*['\"]([^'\"]+)['\"],\s*music:\s*['\"]([^'\"]+)['\"]",
            content,
        )

        dream_num = int(dream_id.replace("dream-", ""))
        if 1 <= dream_num <= len(dreams):
            return dreams[dream_num - 1][1]
    except Exception:
        pass

    return "ambient"


def generate_for_dream(dream_id: str, theme=None):
    """Generate music and combined audio for a specific dream"""
    narration_path = DREAMS_DIR / f"{dream_id}_full.opus"

    if not narration_path.exists():
        print(f"  Error: Narration not found: {narration_path}")
        return None

    if theme is None:
        theme = get_dream_theme(dream_id)

    if theme not in MUSIC_THEMES:
        print(f"  Warning: Unknown theme '{theme}', using 'ambient'")
        theme = "ambient"

    narration_duration = get_audio_duration(narration_path)
    if narration_duration <= 0:
        print(f"  Error: Could not get duration for {narration_path}")
        return None

    total_duration = narration_duration + (2 * FADE_DURATION)

    print(f"  Narration: {narration_duration:.1f}s ({narration_duration / 60:.1f} min)")
    print(f"  Total with fades: {total_duration:.1f}s")
    print(f"  Theme: {theme} - {MUSIC_THEMES[theme]['description']}")

    print(f"  Detecting pause regions...")
    pauses = detect_pause_regions(narration_path)
    print(f"  Found {len(pauses)} pause regions")

    adjusted_pauses = [
        (start + FADE_DURATION, end + FADE_DURATION) for start, end in pauses
    ]

    print(f"  Generating music track...")
    music = generate_music_track(theme, total_duration)

    print(f"  Creating volume envelope...")
    volume_envelope = create_volume_envelope(total_duration, adjusted_pauses)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    music_wav = OUTPUT_DIR / f"{dream_id}_music.wav"
    sf.write(str(music_wav), music, SAMPLE_RATE)

    music_opus = OUTPUT_DIR / f"{dream_id}_music.opus"
    print(f"  Converting music to Opus...")
    convert_to_opus(music_wav, music_opus)
    music_wav.unlink(missing_ok=True)

    print(
        f"  Mixing narration with music (base {MUSIC_VOLUME_BASE * 100:.0f}%, pause {MUSIC_VOLUME_PAUSE * 100:.0f}%)..."
    )
    mixed = mix_narration_with_music(narration_path, music, volume_envelope)

    combined_wav = DREAMS_DIR / f"{dream_id}_combined.wav"
    sf.write(str(combined_wav), mixed, SAMPLE_RATE)

    combined_opus = DREAMS_DIR / f"{dream_id}_combined.opus"
    print(f"  Converting combined audio to Opus...")
    convert_to_opus(combined_wav, combined_opus, bitrate="80k")
    combined_wav.unlink(missing_ok=True)

    preview_duration = 120.0
    print(f"  Creating 2-minute preview with music...")
    preview_opus = DREAMS_DIR / f"{dream_id}_preview.opus"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(combined_opus),
            "-t",
            str(preview_duration),
            "-c:a",
            "libopus",
            "-b:a",
            "64k",
            str(preview_opus),
        ],
        check=True,
        capture_output=True,
    )

    music_size = music_opus.stat().st_size if music_opus.exists() else 0
    combined_size = combined_opus.stat().st_size if combined_opus.exists() else 0
    preview_size = preview_opus.stat().st_size if preview_opus.exists() else 0

    return {
        "dream_id": dream_id,
        "theme": theme,
        "narration_duration": narration_duration,
        "total_duration": total_duration,
        "pause_count": len(pauses),
        "music_path": f"audio/music/{dream_id}_music.opus",
        "music_size_bytes": music_size,
        "combined_path": f"audio/dreams/{dream_id}_combined.opus",
        "combined_size_bytes": combined_size,
        "preview_path": f"audio/dreams/{dream_id}_preview.opus",
        "preview_size_bytes": preview_size,
    }


def get_all_dream_ids() -> list:
    """Get list of all dream IDs from dreamData.ts"""
    try:
        content = DREAM_DATA_PATH.read_text()
        dreams = re.findall(
            r"\{\s*title:\s*['\"]([^'\"]+)['\"],\s*music:\s*['\"]([^'\"]+)['\"]",
            content,
        )
        return [f"dream-{i + 1}" for i in range(len(dreams))]
    except Exception:
        return []


def main():
    parser = argparse.ArgumentParser(
        description="Generate ambient music for Dream Stream"
    )
    parser.add_argument(
        "--dream", help="Generate music for this dream ID (e.g., dream-1)"
    )
    parser.add_argument(
        "--all", action="store_true", help="Generate music for all dreams"
    )
    parser.add_argument("--theme", help="Override music theme")
    parser.add_argument(
        "--list-themes", action="store_true", help="List available themes"
    )
    parser.add_argument(
        "--duration", type=float, help="Override duration in seconds (standalone mode)"
    )
    args = parser.parse_args()

    if args.list_themes:
        print("\nAvailable music themes:\n")
        for name, config in MUSIC_THEMES.items():
            print(f"  {name:<12} {config['description']}")
            print(
                f"              Chords: {' -> '.join(config['chord_progression'][:4])}"
            )
            print(f"              Instrument: {config['instrument']}")
            print()
        return

    print("=" * 60)
    print("Dream Stream Music Generator")
    print("=" * 60)
    print(f"\nSettings:")
    print(f"  Base volume: {MUSIC_VOLUME_BASE * 100:.0f}%")
    print(f"  Pause volume: {MUSIC_VOLUME_PAUSE * 100:.0f}%")
    print(f"  Fade duration: {FADE_DURATION}s")

    if args.all:
        dream_ids = get_all_dream_ids()
        print(f"\nGenerating music for all {len(dream_ids)} dreams...")
        print("=" * 60)

        results = []
        total_size = 0

        for i, dream_id in enumerate(dream_ids, 1):
            print(f"\n[{i}/{len(dream_ids)}] {dream_id}")
            print("-" * 40)

            narration_path = DREAMS_DIR / f"{dream_id}_full.opus"
            if not narration_path.exists():
                print(f"  Skipping: narration not found")
                continue

            result = generate_for_dream(dream_id, args.theme)
            if result:
                results.append(result)
                total_size += result["combined_size_bytes"] + result["music_size_bytes"]
                print(f"  Done: {result['combined_size_bytes'] / 1024 / 1024:.1f} MB")

        print("\n" + "=" * 60)
        print(f"Generated {len(results)} dreams")
        print(f"Total size: {total_size / 1024 / 1024:.1f} MB")

        manifest_path = OUTPUT_DIR / "manifest.json"
        with open(manifest_path, "w") as f:
            json.dump(
                {
                    "generated_at": __import__("datetime").datetime.now().isoformat(),
                    "total_dreams": len(results),
                    "total_size_bytes": total_size,
                    "settings": {
                        "base_volume": MUSIC_VOLUME_BASE,
                        "pause_volume": MUSIC_VOLUME_PAUSE,
                        "fade_duration": FADE_DURATION,
                    },
                    "dreams": results,
                },
                f,
                indent=2,
            )
        print(f"Manifest: {manifest_path}")

    elif args.dream:
        print(f"\nGenerating for: {args.dream}")
        print("-" * 40)

        result = generate_for_dream(args.dream, args.theme)

        if result:
            print(
                f"\n  Music: {result['music_path']} ({result['music_size_bytes'] / 1024:.1f} KB)"
            )
            print(
                f"  Combined: {result['combined_path']} ({result['combined_size_bytes'] / 1024 / 1024:.1f} MB)"
            )
            print(
                f"  Preview: {result['preview_path']} ({result['preview_size_bytes'] / 1024:.1f} KB)"
            )
            print(f"  Pauses detected: {result['pause_count']}")
    else:
        theme = args.theme or "ambient"
        duration = args.duration or 120

        print(f"\nGenerating standalone {theme} music ({duration}s)")
        print("-" * 40)

        music = generate_music_track(theme, duration)

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        wav_path = OUTPUT_DIR / f"{theme}.wav"
        opus_path = OUTPUT_DIR / f"{theme}.opus"

        sf.write(str(wav_path), music, SAMPLE_RATE)
        convert_to_opus(wav_path, opus_path)
        wav_path.unlink(missing_ok=True)

        size = opus_path.stat().st_size
        print(f"\n  Output: {opus_path} ({size / 1024:.1f} KB)")

    print("\n" + "=" * 60)
    print("Generation Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
