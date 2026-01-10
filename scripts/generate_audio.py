#!/usr/bin/env python3
"""
Audio Generation Script for Dream Stream

Generates high-quality TTS audio from dream narratives using Edge TTS.
Edge TTS is free, requires no API keys, and works perfectly in CI environments.

Outputs Opus-encoded audio files optimized for web streaming.

Requirements:
    pip install edge-tts

Usage:
    python scripts/generate_audio.py
    python scripts/generate_audio.py --dream "dream-1"
    python scripts/generate_audio.py --limit 3
    python scripts/generate_audio.py --list-voices
"""

import argparse
import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

try:
    import edge_tts
except ImportError:
    print("Installing edge-tts...")
    subprocess.run([sys.executable, "-m", "pip", "install", "edge-tts"])
    import edge_tts

PROJECT_ROOT = Path(__file__).parent.parent
MOCK_DATA_PATH = PROJECT_ROOT / "lib" / "mockData.ts"
OUTPUT_DIR = PROJECT_ROOT / "public" / "audio" / "dreams"

# Voice settings - Jenny is a calm, soothing US English voice
VOICE = "en-US-JennyNeural"
RATE = "-10%"  # Slightly slower for dream narration
PITCH = "-5Hz"  # Slightly lower pitch for calming effect

# Pause durations
PAUSE_DURATION_MS = 45000  # Long pause for lucid exploration
SILENCE_BETWEEN_SEGMENTS_MS = 2000  # Short pause between segments


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
                "anullsrc=r=24000:cl=mono",
                "-t",
                str(duration_ms / 1000),
                "-c:a",
                "libmp3lame",
                "-q:a",
                "9",
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
                "libmp3lame",
                "-q:a",
                "4",
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


async def generate_segment_audio(
    text: str, output_path: Path, voice: str, rate: str, pitch: str
):
    """Generate audio for a single text segment using Edge TTS"""
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(str(output_path))


async def generate_dream_audio(
    dream: DreamContent, output_dir: Path, voice: str = VOICE
) -> dict | None:
    """Generate audio for a single dream"""
    dream_dir = output_dir / dream.id
    dream_dir.mkdir(parents=True, exist_ok=True)

    segments = split_by_pauses(dream.content)
    segment_files = []

    print(f"\n  Generating {len(segments)} segments...")

    for seg in segments:
        seg_file = dream_dir / f"segment_{seg['index']:03d}.mp3"

        if seg["type"] == "pause":
            print(f"    Segment {seg['index']}: [PAUSE] ({seg['duration_ms']}ms)")
            generate_silence(seg["duration_ms"], seg_file)
        else:
            word_count = len(seg["text"].split())
            print(f"    Segment {seg['index']}: {word_count} words")

            try:
                await generate_segment_audio(seg["text"], seg_file, voice, RATE, PITCH)
            except Exception as e:
                print(f"      Warning: Failed to generate segment: {e}")
                continue

        segment_files.append(seg_file)

        # Add short silence after narration segments
        if seg["type"] == "narration":
            short_silence = dream_dir / f"silence_{seg['index']:03d}.mp3"
            generate_silence(SILENCE_BETWEEN_SEGMENTS_MS, short_silence)
            segment_files.append(short_silence)

    if not segment_files:
        print(f"  Error: No audio generated for {dream.title}")
        return None

    # Concatenate all segments into full audio
    full_mp3 = output_dir / f"{dream.id}_full.mp3"
    print(f"  Concatenating into {full_mp3.name}...")
    concatenate_audio_files(segment_files, full_mp3)

    # Convert to Opus
    full_audio = output_dir / f"{dream.id}_full.opus"
    print(f"  Converting to Opus...")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(full_mp3),
            "-c:a",
            "libopus",
            "-b:a",
            "64k",
            str(full_audio),
        ],
        check=True,
        capture_output=True,
    )

    # Create 2-minute preview
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

    # Cleanup temp files
    full_mp3.unlink(missing_ok=True)
    for f in segment_files:
        f.unlink(missing_ok=True)
    for f in dream_dir.glob("silence_*.mp3"):
        f.unlink(missing_ok=True)
    try:
        dream_dir.rmdir()
    except OSError:
        pass

    # Get duration
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


async def list_voices():
    """List available Edge TTS voices"""
    voices = await edge_tts.list_voices()
    print("\nAvailable English voices:\n")
    for v in sorted(voices, key=lambda x: x["ShortName"]):
        if v["Locale"].startswith("en-"):
            print(f"  {v['ShortName']:<30} {v['Gender']:<8} {v['Locale']}")


async def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio for Dream Stream")
    parser.add_argument("--dream", help="Generate only this dream ID (e.g., dream-1)")
    parser.add_argument("--limit", type=int, help="Limit number of dreams to generate")
    parser.add_argument(
        "--voice", default=VOICE, help=f"Voice to use (default: {VOICE})"
    )
    parser.add_argument(
        "--list-voices", action="store_true", help="List available voices"
    )
    args = parser.parse_args()

    if args.list_voices:
        await list_voices()
        return

    print("=" * 60)
    print("Dream Stream Audio Generator (Edge TTS)")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\nVoice: {args.voice}")
    print(f"Rate: {RATE}, Pitch: {PITCH}")

    print("\nParsing dream narratives...")
    dreams = parse_mock_data()
    print(f"Found {len(dreams)} dreams")

    if args.dream:
        dreams = [d for d in dreams if d.id == args.dream]
        if not dreams:
            print(f"Error: Dream '{args.dream}' not found")
            sys.exit(1)

    if args.limit:
        dreams = dreams[: args.limit]

    results = []
    total_size = 0
    total_duration = 0

    for i, dream in enumerate(dreams, 1):
        print(f"\n[{i}/{len(dreams)}] Processing: {dream.title}")
        print("-" * 40)

        result = await generate_dream_audio(dream, OUTPUT_DIR, args.voice)
        if result:
            results.append(result)
            total_size += result["full_size_bytes"] + result["preview_size_bytes"]
            total_duration += result["duration_seconds"]
            print(f"  Duration: {result['duration_seconds']:.1f}s")
            print(f"  Size: {result['full_size_bytes'] / 1024 / 1024:.1f} MB")

    # Write manifest
    manifest_path = OUTPUT_DIR / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(
            {
                "generated_at": __import__("datetime").datetime.now().isoformat(),
                "voice": args.voice,
                "rate": RATE,
                "pitch": PITCH,
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
    asyncio.run(main())
