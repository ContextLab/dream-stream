#!/usr/bin/env python3
"""
Audio Generation Script for Dream Stream

Generates high-quality TTS audio from dream narratives using Edge TTS.
Outputs Opus-encoded audio files optimized for web streaming.

Usage:
    python scripts/generate_audio.py
    python scripts/generate_audio.py --dream "dream-1"
    python scripts/generate_audio.py --limit 3
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
    subprocess.run([sys.executable, "-m", "pip", "install", "edge-tts"], check=True)
    import edge_tts

PROJECT_ROOT = Path(__file__).parent.parent
DREAM_DATA_PATH = PROJECT_ROOT / "lib" / "dreamData.ts"
OUTPUT_DIR = PROJECT_ROOT / "public" / "audio" / "dreams"
CACHE_DIR = PROJECT_ROOT / ".audio_cache"

VOICE = "en-GB-SoniaNeural"
RATE = "-30%"
PITCH = "-15Hz"

PAUSE_DURATION_MS = 45000
SILENCE_BETWEEN_SEGMENTS_MS = 2000


class DreamContent(NamedTuple):
    id: str
    title: str
    music: str
    content: str


def ensure_silence_files():
    """Pre-generate reusable silence files"""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    pause_file = CACHE_DIR / "pause_45s.mp3"
    gap_file = CACHE_DIR / "gap_2s.mp3"

    if not pause_file.exists():
        print("  Generating 45s pause file...")
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "lavfi",
                "-i",
                "anullsrc=r=24000:cl=mono",
                "-t",
                str(PAUSE_DURATION_MS / 1000),
                "-c:a",
                "libmp3lame",
                "-q:a",
                "9",
                str(pause_file),
            ],
            check=True,
            capture_output=True,
        )

    if not gap_file.exists():
        print("  Generating 2s gap file...")
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "lavfi",
                "-i",
                "anullsrc=r=24000:cl=mono",
                "-t",
                str(SILENCE_BETWEEN_SEGMENTS_MS / 1000),
                "-c:a",
                "libmp3lame",
                "-q:a",
                "9",
                str(gap_file),
            ],
            check=True,
            capture_output=True,
        )

    return pause_file, gap_file


def parse_dream_data() -> list[DreamContent]:
    """Extract dream content from dreamData.ts"""
    content = DREAM_DATA_PATH.read_text()
    pattern = r"\{\s*title:\s*['\"](.+?)['\"],\s*music:\s*['\"]([^'\"]+)['\"],\s*content:\s*`([^`]+)`"
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
            segments.append({"type": "narration", "text": text})
        if i < len(parts) - 1:
            segments.append({"type": "pause"})

    return segments


async def generate_tts(text: str, output_path: Path, voice: str, rate: str, pitch: str):
    """Generate TTS audio for text"""
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(str(output_path))


async def generate_dream_audio(
    dream: DreamContent,
    output_dir: Path,
    pause_file: Path,
    gap_file: Path,
    voice: str = VOICE,
):
    """Generate audio for a single dream"""
    dream_dir = output_dir / dream.id
    dream_dir.mkdir(parents=True, exist_ok=True)

    segments = split_by_pauses(dream.content)
    narration_count = sum(1 for s in segments if s["type"] == "narration")
    pause_count = sum(1 for s in segments if s["type"] == "pause")

    print(f"  {narration_count} narrations, {pause_count} pauses")

    concat_list = []
    narration_files = []

    narration_idx = 0
    for seg in segments:
        if seg["type"] == "pause":
            concat_list.append(pause_file)
        else:
            narration_idx += 1
            narration_file = dream_dir / f"narration_{narration_idx:02d}.mp3"

            word_count = len(seg["text"].split())
            print(
                f"    Narration {narration_idx}/{narration_count}: {word_count} words"
            )

            try:
                await generate_tts(seg["text"], narration_file, voice, RATE, PITCH)
                concat_list.append(narration_file)
                narration_files.append(narration_file)

                if narration_idx < narration_count:
                    concat_list.append(gap_file)
            except Exception as e:
                print(f"      Error: {e}")
                continue

    if not narration_files:
        print(f"  Error: No audio generated")
        return None

    list_file = dream_dir / "concat_list.txt"
    with open(list_file, "w") as f:
        for file in concat_list:
            f.write(f"file '{file.absolute()}'\n")

    full_mp3 = dream_dir / "full.mp3"
    print(f"  Concatenating {len(concat_list)} segments...")

    result = subprocess.run(
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
            str(full_mp3),
        ],
        capture_output=True,
    )

    if result.returncode != 0:
        print(f"  Concat error: {result.stderr.decode()[:200]}")
        return None

    full_opus = output_dir / f"{dream.id}_full.opus"
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
            str(full_opus),
        ],
        check=True,
        capture_output=True,
    )

    preview_opus = output_dir / f"{dream.id}_preview.opus"
    print(f"  Creating preview...")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(full_opus),
            "-t",
            "120",
            "-c:a",
            "libopus",
            "-b:a",
            "64k",
            str(preview_opus),
        ],
        check=True,
        capture_output=True,
    )

    for f in narration_files:
        f.unlink(missing_ok=True)
    full_mp3.unlink(missing_ok=True)
    list_file.unlink(missing_ok=True)

    try:
        dream_dir.rmdir()
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

    return {
        "id": dream.id,
        "title": dream.title,
        "music": dream.music,
        "full_audio": f"audio/dreams/{dream.id}_full.opus",
        "preview_audio": f"audio/dreams/{dream.id}_preview.opus",
        "duration_seconds": duration,
        "full_size_bytes": full_opus.stat().st_size if full_opus.exists() else 0,
        "preview_size_bytes": preview_opus.stat().st_size
        if preview_opus.exists()
        else 0,
        "narration_count": narration_count,
        "pause_count": pause_count,
    }


async def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio for Dream Stream")
    parser.add_argument("--dream", help="Generate only this dream ID")
    parser.add_argument("--limit", type=int, help="Limit number of dreams")
    parser.add_argument("--voice", default=VOICE, help=f"Voice (default: {VOICE})")
    parser.add_argument("--no-music", action="store_true", help="Skip music generation")
    args = parser.parse_args()

    print("=" * 60)
    print("Dream Stream Audio Generator")
    print("=" * 60)
    print(f"\nVoice: {args.voice}")
    print(f"Rate: {RATE}, Pitch: {PITCH}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("\nPreparing silence files...")
    pause_file, gap_file = ensure_silence_files()

    print("\nParsing dream narratives...")
    dreams = parse_dream_data()
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
        print(f"\n[{i}/{len(dreams)}] {dream.title}")
        print("-" * 40)

        result = await generate_dream_audio(
            dream, OUTPUT_DIR, pause_file, gap_file, args.voice
        )

        if result:
            results.append(result)
            total_size += result["full_size_bytes"] + result["preview_size_bytes"]
            total_duration += result["duration_seconds"]
            print(f"  Duration: {result['duration_seconds'] / 60:.1f} min")
            print(f"  Size: {result['full_size_bytes'] / 1024 / 1024:.1f} MB")

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
    print("Narration Complete!")
    print("=" * 60)
    print(f"Dreams: {len(results)}")
    print(f"Duration: {total_duration / 60:.1f} minutes")
    print(f"Size: {total_size / 1024 / 1024:.1f} MB")

    if not args.no_music and results:
        print("\n" + "=" * 60)
        print("Generating Music & Combined Audio...")
        print("=" * 60)
        music_script = PROJECT_ROOT / "scripts" / "generate_music.py"
        for result in results:
            dream_id = result["id"]
            print(f"\n[Music] {dream_id}")
            subprocess.run(
                [sys.executable, str(music_script), "--dream", dream_id],
                check=False,
            )
        print("\n" + "=" * 60)
        print("All audio generation complete!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
