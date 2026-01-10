#!/usr/bin/env python3
"""
Ambient Music Generation Script for Dream Stream

Generates ambient background music for dream playback using:
1. MusicGen-Small (AI-generated, ~2GB model)
2. Procedural fallback (sine waves, noise, no ML dependencies)

The generated music is designed to:
- Loop seamlessly
- Not interfere with dream narration
- Create a relaxing sleep environment
- Support 432Hz tuning (optional)

Requirements:
    pip install numpy scipy soundfile

    For MusicGen (optional, better quality):
    pip install torch transformers

Usage:
    python scripts/generate_music.py
    python scripts/generate_music.py --style ambient
    python scripts/generate_music.py --procedural-only
    python scripts/generate_music.py --list-styles
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

# Check for required dependencies
try:
    import numpy as np
except ImportError:
    print("Installing numpy...")
    subprocess.run([sys.executable, "-m", "pip", "install", "numpy"])
    import numpy as np

try:
    import soundfile as sf
except ImportError:
    print("Installing soundfile...")
    subprocess.run([sys.executable, "-m", "pip", "install", "soundfile"])
    import soundfile as sf

try:
    from scipy import signal
    from scipy.io import wavfile
except ImportError:
    print("Installing scipy...")
    subprocess.run([sys.executable, "-m", "pip", "install", "scipy"])
    from scipy import signal
    from scipy.io import wavfile

PROJECT_ROOT = Path(__file__).parent.parent
OUTPUT_DIR = PROJECT_ROOT / "public" / "audio" / "music"

# Music styles with generation parameters
MUSIC_STYLES = {
    "ambient": {
        "description": "Soft ambient pads, perfect for deep relaxation",
        "prompt": "soft ambient pad, peaceful, dreamy, no drums, no vocals, meditation music",
        "base_freq": 432,  # 432Hz tuning
        "layers": ["pad", "shimmer", "breath"],
        "duration_seconds": 120,
    },
    "nature": {
        "description": "Gentle nature sounds - rain, wind, soft water",
        "prompt": "gentle rain sounds, soft wind, nature ambient, peaceful forest",
        "base_freq": 440,
        "layers": ["rain", "wind", "crickets"],
        "duration_seconds": 120,
    },
    "binaural": {
        "description": "Binaural beats for theta/delta brainwave entrainment",
        "prompt": None,  # Always procedural
        "base_freq": 200,  # Carrier frequency
        "beat_freq": 4,  # Theta (4Hz) for lucid dreaming
        "layers": ["binaural", "pad"],
        "duration_seconds": 120,
    },
    "cosmic": {
        "description": "Space-themed ambient with deep bass and shimmering highs",
        "prompt": "cosmic ambient, space music, ethereal, deep bass drone, shimmering pads",
        "base_freq": 432,
        "layers": ["drone", "shimmer", "sweep"],
        "duration_seconds": 120,
    },
    "silence": {
        "description": "Near-silence with very subtle tones",
        "prompt": None,
        "base_freq": 432,
        "layers": ["whisper"],
        "duration_seconds": 60,
    },
}

SAMPLE_RATE = 44100


class MusicResult(NamedTuple):
    style: str
    path: str
    duration_seconds: float
    size_bytes: int
    method: str  # "musicgen" or "procedural"


def check_musicgen_available() -> bool:
    """Check if MusicGen dependencies are available"""
    try:
        import torch
        from transformers import AutoProcessor, MusicgenForConditionalGeneration

        return True
    except ImportError:
        return False


def generate_with_musicgen(style: str, config: dict, output_path: Path) -> bool:
    """Generate music using MusicGen-Small"""
    try:
        import torch
        from transformers import AutoProcessor, MusicgenForConditionalGeneration

        print(f"  Loading MusicGen-Small model...")
        processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
        model = MusicgenForConditionalGeneration.from_pretrained(
            "facebook/musicgen-small"
        )

        # Use CPU to avoid memory issues
        device = "cpu"
        model = model.to(device)

        prompt = config["prompt"]
        duration = config["duration_seconds"]

        print(f"  Generating {duration}s of audio...")
        print(f"  Prompt: {prompt}")

        inputs = processor(
            text=[prompt],
            padding=True,
            return_tensors="pt",
        ).to(device)

        # MusicGen generates ~256 tokens per second at 32kHz
        max_new_tokens = int(duration * 50)  # Approximate tokens needed

        audio_values = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            guidance_scale=3,
        )

        # Convert to numpy and save
        audio_array = audio_values[0, 0].cpu().numpy()
        sampling_rate = model.config.audio_encoder.sampling_rate

        # Normalize
        audio_array = audio_array / np.max(np.abs(audio_array)) * 0.8

        # Save as WAV first
        wav_path = output_path.with_suffix(".wav")
        sf.write(str(wav_path), audio_array, sampling_rate)

        return True

    except Exception as e:
        print(f"  MusicGen failed: {e}")
        return False


def generate_sine_wave(
    freq: float, duration: float, amplitude: float = 0.5
) -> np.ndarray:
    """Generate a sine wave"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    return amplitude * np.sin(2 * np.pi * freq * t)


def generate_pad(base_freq: float, duration: float) -> np.ndarray:
    """Generate a soft ambient pad with harmonics"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    # Fundamental + harmonics with decreasing amplitude
    pad = np.zeros_like(t)
    harmonics = [1, 2, 3, 4, 5]
    amplitudes = [0.4, 0.2, 0.1, 0.05, 0.02]

    for h, a in zip(harmonics, amplitudes):
        # Add slight detuning for richness
        detune = np.random.uniform(-2, 2)
        pad += a * np.sin(2 * np.pi * (base_freq * h + detune) * t)

    # Apply slow amplitude modulation (tremolo)
    mod_freq = 0.1  # Very slow
    modulation = 0.7 + 0.3 * np.sin(2 * np.pi * mod_freq * t)
    pad *= modulation

    # Apply envelope (fade in/out)
    envelope = np.ones_like(t)
    fade_samples = int(SAMPLE_RATE * 3)  # 3-second fade
    envelope[:fade_samples] = np.linspace(0, 1, fade_samples)
    envelope[-fade_samples:] = np.linspace(1, 0, fade_samples)

    return pad * envelope


def generate_shimmer(base_freq: float, duration: float) -> np.ndarray:
    """Generate shimmering high frequencies"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    shimmer = np.zeros_like(t)

    # Multiple high-frequency components with random phase
    for _ in range(5):
        freq = base_freq * np.random.uniform(4, 8)
        phase = np.random.uniform(0, 2 * np.pi)
        amp = np.random.uniform(0.02, 0.05)

        # Slow amplitude modulation
        mod_freq = np.random.uniform(0.05, 0.2)
        mod = 0.5 + 0.5 * np.sin(2 * np.pi * mod_freq * t + phase)

        shimmer += amp * np.sin(2 * np.pi * freq * t + phase) * mod

    return shimmer


def generate_breath(duration: float) -> np.ndarray:
    """Generate soft breath-like noise"""
    samples = int(SAMPLE_RATE * duration)

    # Pink noise (1/f)
    white = np.random.randn(samples)

    # Simple 1/f filter approximation
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    pink = signal.lfilter(b, a, white)

    # Very low amplitude
    pink = pink / np.max(np.abs(pink)) * 0.03

    # Slow modulation to sound like breathing
    t = np.linspace(0, duration, samples, endpoint=False)
    breath_rate = 0.15  # ~9 breaths per minute
    modulation = 0.3 + 0.7 * (0.5 + 0.5 * np.sin(2 * np.pi * breath_rate * t))

    return pink * modulation


def generate_binaural(
    carrier_freq: float, beat_freq: float, duration: float
) -> np.ndarray:
    """Generate binaural beats (requires stereo output)"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    # Left ear: carrier frequency
    left = 0.3 * np.sin(2 * np.pi * carrier_freq * t)

    # Right ear: carrier + beat frequency
    right = 0.3 * np.sin(2 * np.pi * (carrier_freq + beat_freq) * t)

    # Return stereo array
    return np.column_stack([left, right])


def generate_drone(base_freq: float, duration: float) -> np.ndarray:
    """Generate a deep bass drone"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    # Very low frequency drone
    drone_freq = base_freq / 4  # Sub-bass

    drone = 0.3 * np.sin(2 * np.pi * drone_freq * t)

    # Add slight pitch wobble
    wobble = 2 * np.sin(2 * np.pi * 0.05 * t)  # Very slow wobble
    drone += 0.1 * np.sin(2 * np.pi * (drone_freq + wobble) * t)

    return drone


def generate_sweep(base_freq: float, duration: float) -> np.ndarray:
    """Generate slow frequency sweeps"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    sweep = np.zeros_like(t)

    # Multiple slow sweeps
    for _ in range(3):
        start_freq = base_freq * np.random.uniform(2, 4)
        end_freq = base_freq * np.random.uniform(2, 4)

        # Frequency changes linearly over time
        freq = np.linspace(start_freq, end_freq, len(t))
        phase = np.cumsum(2 * np.pi * freq / SAMPLE_RATE)

        amp = np.random.uniform(0.02, 0.05)
        sweep += amp * np.sin(phase)

    return sweep


def generate_rain(duration: float) -> np.ndarray:
    """Generate rain-like sound"""
    samples = int(SAMPLE_RATE * duration)

    # Base: filtered noise
    rain = np.random.randn(samples) * 0.1

    # Bandpass filter for rain-like sound
    b, a = signal.butter(4, [500, 8000], btype="band", fs=SAMPLE_RATE)
    rain = signal.lfilter(b, a, rain)

    # Add occasional "droplet" sounds
    num_drops = int(duration * 5)  # 5 drops per second average
    for _ in range(num_drops):
        pos = np.random.randint(0, samples - 1000)
        drop_len = np.random.randint(100, 500)
        drop_freq = np.random.uniform(2000, 5000)
        drop = 0.05 * np.sin(
            2 * np.pi * drop_freq * np.linspace(0, drop_len / SAMPLE_RATE, drop_len)
        )
        drop *= np.exp(-np.linspace(0, 5, drop_len))  # Quick decay
        rain[pos : pos + drop_len] += drop

    return rain


def generate_wind(duration: float) -> np.ndarray:
    """Generate wind-like sound"""
    samples = int(SAMPLE_RATE * duration)

    # Low-frequency filtered noise
    wind = np.random.randn(samples) * 0.1

    # Low-pass filter
    b, a = signal.butter(4, 500, btype="low", fs=SAMPLE_RATE)
    wind = signal.lfilter(b, a, wind)

    # Slow amplitude modulation (gusts)
    t = np.linspace(0, duration, samples, endpoint=False)
    gusts = 0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t) * np.sin(2 * np.pi * 0.13 * t)

    return wind * gusts


def generate_crickets(duration: float) -> np.ndarray:
    """Generate cricket-like chirps"""
    samples = int(SAMPLE_RATE * duration)
    crickets = np.zeros(samples)

    # Multiple crickets at different frequencies
    num_crickets = 5
    for _ in range(num_crickets):
        freq = np.random.uniform(3000, 5000)
        chirp_rate = np.random.uniform(5, 10)  # Chirps per second
        chirp_duration = int(SAMPLE_RATE * 0.05)  # 50ms chirp

        t_chirp = np.linspace(0, 0.05, chirp_duration, endpoint=False)
        chirp = 0.02 * np.sin(2 * np.pi * freq * t_chirp)
        chirp *= np.exp(-t_chirp * 50)  # Quick decay

        # Place chirps randomly
        num_chirps = int(duration * chirp_rate)
        for _ in range(num_chirps):
            pos = np.random.randint(0, samples - chirp_duration)
            crickets[pos : pos + chirp_duration] += chirp

    return crickets


def generate_whisper(base_freq: float, duration: float) -> np.ndarray:
    """Generate barely audible tones"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)

    # Very quiet single tone
    whisper = 0.01 * np.sin(2 * np.pi * base_freq * t)

    # Very slow fade in/out
    envelope = np.ones_like(t)
    fade_samples = int(SAMPLE_RATE * 10)  # 10-second fade
    if len(envelope) > 2 * fade_samples:
        envelope[:fade_samples] = np.linspace(0, 1, fade_samples)
        envelope[-fade_samples:] = np.linspace(1, 0, fade_samples)

    return whisper * envelope


def generate_procedural(style: str, config: dict, output_path: Path) -> bool:
    """Generate music using procedural synthesis"""
    print(f"  Generating procedurally...")

    duration = config["duration_seconds"]
    base_freq = config["base_freq"]
    layers = config["layers"]

    # Start with silence
    samples = int(SAMPLE_RATE * duration)
    is_stereo = "binaural" in layers

    if is_stereo:
        audio = np.zeros((samples, 2))
    else:
        audio = np.zeros(samples)

    # Generate each layer
    layer_generators = {
        "pad": lambda: generate_pad(base_freq, duration),
        "shimmer": lambda: generate_shimmer(base_freq, duration),
        "breath": lambda: generate_breath(duration),
        "drone": lambda: generate_drone(base_freq, duration),
        "sweep": lambda: generate_sweep(base_freq, duration),
        "rain": lambda: generate_rain(duration),
        "wind": lambda: generate_wind(duration),
        "crickets": lambda: generate_crickets(duration),
        "whisper": lambda: generate_whisper(base_freq, duration),
        "binaural": lambda: generate_binaural(
            config["base_freq"], config.get("beat_freq", 4), duration
        ),
    }

    for layer in layers:
        if layer in layer_generators:
            print(f"    Adding layer: {layer}")
            layer_audio = layer_generators[layer]()

            if is_stereo and layer_audio.ndim == 1:
                # Convert mono to stereo
                layer_audio = np.column_stack([layer_audio, layer_audio])
            elif not is_stereo and layer_audio.ndim == 2:
                # This shouldn't happen, but handle it
                audio = np.column_stack([audio, audio])
                is_stereo = True

            audio += layer_audio

    # Normalize
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = audio / max_val * 0.8

    # Save as WAV
    wav_path = output_path.with_suffix(".wav")
    sf.write(str(wav_path), audio, SAMPLE_RATE)

    return True


def convert_to_opus(wav_path: Path, opus_path: Path) -> bool:
    """Convert WAV to Opus format"""
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
                "96k",  # Higher bitrate for music
                str(opus_path),
            ],
            check=True,
            capture_output=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"  FFmpeg error: {e}")
        return False


def make_loopable(audio_path: Path) -> bool:
    """Add crossfade to make audio loop seamlessly"""
    try:
        # Read audio
        data, sr = sf.read(str(audio_path))

        # Crossfade duration (2 seconds)
        fade_samples = int(sr * 2)

        if len(data) < fade_samples * 2:
            return True  # Too short to crossfade

        # Apply crossfade
        if data.ndim == 1:
            # Mono
            fade_out = np.linspace(1, 0, fade_samples)
            fade_in = np.linspace(0, 1, fade_samples)

            # Blend end with beginning
            data[-fade_samples:] = (
                data[-fade_samples:] * fade_out + data[:fade_samples] * fade_in
            )
        else:
            # Stereo
            for ch in range(data.shape[1]):
                fade_out = np.linspace(1, 0, fade_samples)
                fade_in = np.linspace(0, 1, fade_samples)
                data[-fade_samples:, ch] = (
                    data[-fade_samples:, ch] * fade_out
                    + data[:fade_samples, ch] * fade_in
                )

        # Save
        sf.write(str(audio_path), data, sr)
        return True

    except Exception as e:
        print(f"  Crossfade error: {e}")
        return False


def generate_music(style: str, use_musicgen: bool = True) -> MusicResult | None:
    """Generate music for a given style"""
    if style not in MUSIC_STYLES:
        print(f"Unknown style: {style}")
        return None

    config = MUSIC_STYLES[style]
    print(f"\n  Style: {style}")
    print(f"  Description: {config['description']}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    wav_path = OUTPUT_DIR / f"{style}.wav"
    opus_path = OUTPUT_DIR / f"{style}.opus"

    method = "procedural"

    # Try MusicGen first if available and style has a prompt
    if use_musicgen and config["prompt"] and check_musicgen_available():
        print("  Attempting MusicGen generation...")
        if generate_with_musicgen(style, config, wav_path):
            method = "musicgen"
        else:
            print("  Falling back to procedural generation...")
            generate_procedural(style, config, wav_path)
    else:
        generate_procedural(style, config, wav_path)

    # Make loopable
    print("  Adding crossfade for seamless looping...")
    make_loopable(wav_path)

    # Convert to Opus
    print("  Converting to Opus...")
    if not convert_to_opus(wav_path, opus_path):
        return None

    # Clean up WAV
    wav_path.unlink(missing_ok=True)

    # Get file info
    duration = config["duration_seconds"]
    size = opus_path.stat().st_size if opus_path.exists() else 0

    return MusicResult(
        style=style,
        path=f"audio/music/{style}.opus",
        duration_seconds=duration,
        size_bytes=size,
        method=method,
    )


def main():
    parser = argparse.ArgumentParser(
        description="Generate ambient music for Dream Stream"
    )
    parser.add_argument("--style", help="Generate only this style")
    parser.add_argument(
        "--procedural-only",
        action="store_true",
        help="Use only procedural generation (no ML)",
    )
    parser.add_argument(
        "--list-styles", action="store_true", help="List available music styles"
    )
    args = parser.parse_args()

    if args.list_styles:
        print("\nAvailable music styles:\n")
        for name, config in MUSIC_STYLES.items():
            print(f"  {name:<12} {config['description']}")
        return

    print("=" * 60)
    print("Dream Stream Music Generator")
    print("=" * 60)

    use_musicgen = not args.procedural_only

    if use_musicgen and check_musicgen_available():
        print("\nMusicGen: Available")
    else:
        print("\nMusicGen: Not available (using procedural only)")
        use_musicgen = False

    styles = [args.style] if args.style else list(MUSIC_STYLES.keys())

    results = []
    total_size = 0
    total_duration = 0

    for i, style in enumerate(styles, 1):
        if style not in MUSIC_STYLES:
            print(f"\nUnknown style: {style}")
            continue

        print(f"\n[{i}/{len(styles)}] Generating: {style}")
        print("-" * 40)

        result = generate_music(style, use_musicgen)
        if result:
            results.append(result._asdict())
            total_size += result.size_bytes
            total_duration += result.duration_seconds
            print(f"  Duration: {result.duration_seconds:.1f}s")
            print(f"  Size: {result.size_bytes / 1024:.1f} KB")
            print(f"  Method: {result.method}")

    # Write manifest
    manifest_path = OUTPUT_DIR / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(
            {
                "generated_at": __import__("datetime").datetime.now().isoformat(),
                "musicgen_used": use_musicgen and check_musicgen_available(),
                "total_styles": len(results),
                "total_duration_seconds": total_duration,
                "total_size_bytes": total_size,
                "styles": results,
            },
            f,
            indent=2,
        )

    print("\n" + "=" * 60)
    print("Generation Complete!")
    print("=" * 60)
    print(f"Styles generated: {len(results)}")
    print(f"Total duration: {total_duration / 60:.1f} minutes")
    print(f"Total size: {total_size / 1024 / 1024:.2f} MB")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
