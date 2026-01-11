#!/usr/bin/env python3
import argparse
import asyncio
import json
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
NARRATIVES_DIR = Path(__file__).parent / "narratives"
METADATA_PATH = NARRATIVES_DIR / "metadata.json"
OUTPUT_DIR = PROJECT_ROOT / "public" / "audio" / "dreams"
CACHE_DIR = PROJECT_ROOT / ".audio_cache"

VOICE = "en-GB-SoniaNeural"
RATE = "-30%"
PITCH = "-15Hz"

PAUSE_DURATION_MS = 45000
SILENCE_BETWEEN_SEGMENTS_MS = 2000


class DreamContent(NamedTuple):
    id: str
    name: str
    title: str
    music: str
    content: str


def ensure_silence_files():
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


def load_dreams_from_metadata() -> list[DreamContent]:
    with open(METADATA_PATH, "r") as f:
        metadata = json.load(f)

    dreams = []
    for i, entry in enumerate(metadata["dreams"]):
        narrative_path = NARRATIVES_DIR / entry["file"]
        if not narrative_path.exists():
            print(f"Warning: {entry['file']} not found, skipping")
            continue

        with open(narrative_path, "r") as f:
            content = f.read().strip()

        dream_id = f"dream-{i + 1}"
        name = entry["file"].replace(".txt", "")
        dreams.append(
            DreamContent(dream_id, name, entry["title"], entry["music"], content)
        )

    return dreams


def split_by_pauses(content: str) -> list[dict]:
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
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(str(output_path))


async def generate_dream_audio(
    dream: DreamContent,
    output_dir: Path,
    pause_file: Path,
    gap_file: Path,
    voice: str = VOICE,
):
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
        "name": dream.name,
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
    parser.add_argument(
        "--dream", help="Generate only this dream (narrative filename without .txt)"
    )
    parser.add_argument("--all", action="store_true", help="Generate all dreams")
    parser.add_argument(
        "--start", type=int, help="Start from this dream index (1-based)"
    )
    parser.add_argument("--limit", type=int, help="Limit number of dreams")
    parser.add_argument("--voice", default=VOICE, help=f"Voice (default: {VOICE})")
    parser.add_argument("--no-music", action="store_true", help="Skip music generation")
    parser.add_argument("--list", action="store_true", help="List all available dreams")
    args = parser.parse_args()

    print("=" * 60)
    print("Dream Stream Audio Generator")
    print("=" * 60)

    dreams = load_dreams_from_metadata()
    print(f"Found {len(dreams)} dreams in metadata.json")

    if args.list:
        print("\nAvailable dreams:")
        for i, dream in enumerate(dreams, 1):
            print(f"  {i:2d}. {dream.id} ({dream.name}) - {dream.title}")
        return

    print(f"\nVoice: {args.voice}")
    print(f"Rate: {RATE}, Pitch: {PITCH}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("\nPreparing silence files...")
    pause_file, gap_file = ensure_silence_files()

    if args.dream:
        dreams = [d for d in dreams if d.id == args.dream or d.name == args.dream]
        if not dreams:
            print(f"Error: Dream '{args.dream}' not found")
            print("Use --list to see available dreams")
            sys.exit(1)

    if args.start:
        dreams = dreams[args.start - 1 :]

    if args.limit:
        dreams = dreams[: args.limit]

    if not args.all and not args.dream and not args.start:
        print("\nNo dreams selected. Use one of:")
        print("  --dream <name>   Generate single dream by name")
        print("  --all            Generate all dreams")
        print("  --start N        Generate dreams starting from index N")
        print("  --list           List all available dreams")
        return

    results = []
    total_size = 0
    total_duration = 0

    for i, dream in enumerate(dreams, 1):
        print(f"\n[{i}/{len(dreams)}] {dream.id} ({dream.name}) - {dream.title}")
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

            # Generate music immediately after TTS (don't wait until end)
            if not args.no_music:
                print(f"  Generating music...")
                music_script = Path(__file__).parent / "generate_music.py"
                if music_script.exists():
                    subprocess.run(
                        [sys.executable, str(music_script), "--dream", result["id"]],
                        check=False,
                    )

    manifest_path = OUTPUT_DIR / "manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r") as f:
            manifest = json.load(f)
    else:
        manifest = {"dreams": {}}

    for result in results:
        manifest["dreams"][result["id"]] = result

    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Dreams processed: {len(results)}")
    print(f"Total duration: {total_duration / 60:.1f} minutes")
    print(f"Total size: {total_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    asyncio.run(main())
