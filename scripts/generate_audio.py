#!/usr/bin/env python3
"""
Audio Generation Script for Dream Stream

Generates high-quality TTS audio from dream narratives using Coqui XTTS v2.
Outputs Opus-encoded audio files optimized for web streaming.

Requirements:
    pip install TTS pydub

Usage:
    python scripts/generate_audio.py
    python scripts/generate_audio.py --dream "dream-1"
    python scripts/generate_audio.py --voice "soothing_female"
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

try:
    from TTS.api import TTS
except ImportError:
    print("Error: TTS not installed. Run: pip install TTS")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).parent.parent
MOCK_DATA_PATH = PROJECT_ROOT / "lib" / "mockData.ts"
OUTPUT_DIR = PROJECT_ROOT / "public" / "audio" / "dreams"
VOICE_SAMPLES_DIR = PROJECT_ROOT / "assets" / "voice_samples"

PAUSE_DURATION_MS = 45000
SILENCE_BETWEEN_SEGMENTS_MS = 2000


class DreamContent(NamedTuple):
    id: str
    title: str
    music: str
    content: str


def parse_mock_data() -> list[DreamContent]:
    """Extract dream content from mockData.ts"""
    content = MOCK_DATA_PATH.read_text()

    pattern = r"\{\s*title:\s*['\"]([^'\"]+)['\"],\s*music:\s*['\"]([^'\"]+)['\"],\s*content:\s*`([^`]+)`"
    matches = re.findall(pattern, content, re.DOTALL)

    dreams = []
    for i, (title, music, text) in enumerate(matches, 1):
        dream_id = f"dream-{i}"
        cleaned_content = text.strip()
        dreams.append(DreamContent(dream_id, title, music, cleaned_content))

    return dreams


def split_by_pauses(content: str) -> list[dict]:
    """Split content by [PAUSE] markers into segments"""
    parts = content.split("[PAUSE]")
    segments = []

    for i, part in enumerate(parts):
        text = part.strip()
        if text:
            segments.append({"type": "narration", "text": text, "index": len(segments)})

        if i < len(parts) - 1:
            segments.append(
                {
                    "type": "pause",
                    "duration_ms": PAUSE_DURATION_MS,
                    "index": len(segments),
                }
            )

    return segments


def generate_silence(duration_ms: int, output_path: Path) -> bool:
    """Generate a silent audio file using ffmpeg"""
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "lavfi",
                "-i",
                f"anullsrc=r=24000:cl=mono",
                "-t",
                str(duration_ms / 1000),
                "-c:a",
                "libopus",
                "-b:a",
                "64k",
                str(output_path),
            ],
            check=True,
            capture_output=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error generating silence: {e}")
        return False


def concatenate_audio_files(input_files: list[Path], output_path: Path) -> bool:
    """Concatenate multiple audio files using ffmpeg"""
    list_file = output_path.parent / "concat_list.txt"

    with open(list_file, "w") as f:
        for file in input_files:
            f.write(f"file '{file.absolute()}'\n")

    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_file),
                "-c:a",
                "libopus",
                "-b:a",
                "64k",
                str(output_path),
            ],
            check=True,
            capture_output=True,
        )
        list_file.unlink()
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error concatenating audio: {e}")
        list_file.unlink(missing_ok=True)
        return False


def generate_dream_audio(
    dream: DreamContent, tts: TTS, output_dir: Path, voice_sample: Path | None = None
) -> dict:
    """Generate audio for a single dream"""
    dream_dir = output_dir / dream.id
    dream_dir.mkdir(parents=True, exist_ok=True)

    segments = split_by_pauses(dream.content)
    segment_files = []

    print(f"\n  Generating {len(segments)} segments...")

    for seg in segments:
        seg_file = dream_dir / f"segment_{seg['index']:03d}.opus"

        if seg["type"] == "pause":
            print(f"    Segment {seg['index']}: [PAUSE] ({seg['duration_ms']}ms)")
            generate_silence(seg["duration_ms"], seg_file)
        else:
            word_count = len(seg["text"].split())
            print(f"    Segment {seg['index']}: {word_count} words")

            wav_file = seg_file.with_suffix(".wav")

            if voice_sample and voice_sample.exists():
                tts.tts_to_file(
                    text=seg["text"],
                    file_path=str(wav_file),
                    speaker_wav=str(voice_sample),
                    language="en",
                )
            else:
                tts.tts_to_file(
                    text=seg["text"], file_path=str(wav_file), language="en"
                )

            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(wav_file),
                    "-c:a",
                    "libopus",
                    "-b:a",
                    "64k",
                    str(seg_file),
                ],
                check=True,
                capture_output=True,
            )

            wav_file.unlink()

        segment_files.append(seg_file)

        short_silence = dream_dir / f"silence_{seg['index']:03d}.opus"
        if seg["type"] == "narration":
            generate_silence(SILENCE_BETWEEN_SEGMENTS_MS, short_silence)
            segment_files.append(short_silence)

    full_audio = output_dir / f"{dream.id}_full.opus"
    print(f"  Concatenating into {full_audio.name}...")
    concatenate_audio_files(segment_files, full_audio)

    for f in segment_files:
        f.unlink(missing_ok=True)

    for f in dream_dir.glob("silence_*.opus"):
        f.unlink(missing_ok=True)

    preview_audio = output_dir / f"{dream.id}_preview.opus"
    print(f"  Creating 2-minute preview...")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(full_audio),
            "-t",
            "120",
            "-c:a",
            "libopus",
            "-b:a",
            "64k",
            str(preview_audio),
        ],
        check=True,
        capture_output=True,
    )

    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "quiet",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            str(full_audio),
        ],
        capture_output=True,
        text=True,
    )
    duration = float(result.stdout.strip()) if result.stdout.strip() else 0

    full_size = full_audio.stat().st_size if full_audio.exists() else 0
    preview_size = preview_audio.stat().st_size if preview_audio.exists() else 0

    return {
        "id": dream.id,
        "title": dream.title,
        "music": dream.music,
        "full_audio": f"audio/dreams/{dream.id}_full.opus",
        "preview_audio": f"audio/dreams/{dream.id}_preview.opus",
        "duration_seconds": duration,
        "full_size_bytes": full_size,
        "preview_size_bytes": preview_size,
        "segment_count": len([s for s in segments if s["type"] == "narration"]),
        "pause_count": len([s for s in segments if s["type"] == "pause"]),
    }


def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio for Dream Stream")
    parser.add_argument("--dream", help="Generate only this dream ID (e.g., dream-1)")
    parser.add_argument("--voice", help="Voice sample file in assets/voice_samples/")
    parser.add_argument(
        "--model",
        default="tts_models/multilingual/multi-dataset/xtts_v2",
        help="TTS model to use",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Dream Stream Audio Generator")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\nLoading TTS model: {args.model}")
    print("(This may take a few minutes on first run...)")
    tts = TTS(args.model)

    if hasattr(tts, "to") and hasattr(tts, "device"):
        import torch

        if torch.cuda.is_available():
            tts.to("cuda")
            print("Using GPU acceleration")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            tts.to("mps")
            print("Using Apple Silicon acceleration")

    print("\nParsing dream narratives...")
    dreams = parse_mock_data()
    print(f"Found {len(dreams)} dreams")

    if args.dream:
        dreams = [d for d in dreams if d.id == args.dream]
        if not dreams:
            print(f"Error: Dream '{args.dream}' not found")
            sys.exit(1)

    voice_sample = None
    if args.voice:
        voice_sample = VOICE_SAMPLES_DIR / args.voice
        if not voice_sample.exists():
            print(f"Warning: Voice sample not found: {voice_sample}")
            voice_sample = None

    results = []
    total_size = 0
    total_duration = 0

    for i, dream in enumerate(dreams, 1):
        print(f"\n[{i}/{len(dreams)}] Processing: {dream.title}")
        print("-" * 40)

        result = generate_dream_audio(dream, tts, OUTPUT_DIR, voice_sample)
        results.append(result)

        total_size += result["full_size_bytes"] + result["preview_size_bytes"]
        total_duration += result["duration_seconds"]

        print(f"  Duration: {result['duration_seconds']:.1f}s")
        print(f"  Size: {result['full_size_bytes'] / 1024 / 1024:.1f} MB")

    manifest_path = OUTPUT_DIR / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(
            {
                "generated_at": __import__("datetime").datetime.now().isoformat(),
                "model": args.model,
                "total_dreams": len(results),
                "total_duration_seconds": total_duration,
                "total_size_bytes": total_size,
                "dreams": results,
            },
            f,
            indent=2,
        )

    print("\n" + "=" * 60)
    print("Generation Complete!")
    print("=" * 60)
    print(f"Dreams processed: {len(results)}")
    print(f"Total duration: {total_duration / 60:.1f} minutes")
    print(f"Total size: {total_size / 1024 / 1024:.1f} MB")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
