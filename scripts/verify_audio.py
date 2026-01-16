#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path

try:
    import whisper
except ImportError:
    print("Installing openai-whisper...")
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "openai-whisper"], check=True
    )
    import whisper

PROJECT_ROOT = Path(__file__).parent.parent
NARRATIVES_DIR = Path(__file__).parent / "narratives"
METADATA_PATH = NARRATIVES_DIR / "metadata.json"
AUDIO_DIR = PROJECT_ROOT / "public" / "audio" / "dreams"


def load_expected_content():
    with open(METADATA_PATH, "r") as f:
        metadata = json.load(f)

    expected = {}
    for i, entry in enumerate(metadata["dreams"]):
        dream_id = f"dream-{i + 1}"
        narrative_path = NARRATIVES_DIR / entry["file"]

        if not narrative_path.exists():
            continue

        with open(narrative_path, "r") as f:
            content = f.read().strip()

        words = content.split()[:100]
        first_text = " ".join(words).lower()

        expected[dream_id] = {
            "title": entry["title"],
            "file": entry["file"],
            "first_text": first_text,
            "first_sentence": content.split(".")[0] if content else "",
        }

    return expected


def extract_preview(audio_path: Path, start: int = 15, duration: int = 30) -> Path:
    temp_path = Path("/tmp") / f"{audio_path.stem}_preview.wav"

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-ss",
            str(start),
            "-i",
            str(audio_path),
            "-t",
            str(duration),
            "-ar",
            "16000",
            "-ac",
            "1",
            str(temp_path),
        ],
        capture_output=True,
        check=True,
    )

    return temp_path


def transcribe_audio(audio_path: Path, model) -> str:
    result = model.transcribe(str(audio_path), language="en")
    return result["text"].lower().strip()


def check_match(transcribed: str, expected_first_text: str) -> tuple[bool, float]:
    trans_words = set(transcribed.split()[:50])
    expected_words = set(expected_first_text.split()[:50])

    if not trans_words or not expected_words:
        return False, 0.0

    overlap = len(trans_words & expected_words)
    total = len(trans_words | expected_words)
    similarity = overlap / total if total > 0 else 0

    return similarity > 0.3, similarity


def main():
    print("=" * 70)
    print("Dream Audio Verification (using Whisper)")
    print("=" * 70)

    print("\nLoading Whisper model (base)...")
    model = whisper.load_model("base")

    print("Loading expected narratives...")
    expected = load_expected_content()
    print(f"Found {len(expected)} dreams in metadata\n")

    audio_files = sorted(AUDIO_DIR.glob("dream-*_combined.opus"))
    print(f"Found {len(audio_files)} combined audio files\n")

    results = []
    mismatches = []

    for audio_path in audio_files:
        dream_id = audio_path.stem.replace("_combined", "")

        if dream_id not in expected:
            print(f"[SKIP] {dream_id}: No expected content found")
            continue

        exp = expected[dream_id]
        print(f"[{dream_id}] {exp['title']}")
        print(f"  Source: {exp['file']}")

        try:
            preview_path = extract_preview(audio_path, duration=30)
            transcribed = transcribe_audio(preview_path, model)
            is_match, similarity = check_match(transcribed, exp["first_text"])
            preview_path.unlink(missing_ok=True)

            status = "OK" if is_match else "MISMATCH"
            print(f"  Match: {status} (similarity: {similarity:.1%})")

            if not is_match:
                print(f"  Expected starts: {exp['first_sentence'][:80]}...")
                print(f"  Got audio: {transcribed[:80]}...")
                mismatches.append(
                    {
                        "dream_id": dream_id,
                        "expected_title": exp["title"],
                        "expected_file": exp["file"],
                        "transcribed": transcribed[:200],
                        "similarity": similarity,
                    }
                )

            results.append(
                {
                    "dream_id": dream_id,
                    "title": exp["title"],
                    "match": is_match,
                    "similarity": similarity,
                }
            )

        except Exception as e:
            print(f"  Error: {e}")
            results.append(
                {
                    "dream_id": dream_id,
                    "title": exp["title"],
                    "match": False,
                    "error": str(e),
                }
            )

        print()

    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)

    matches = sum(1 for r in results if r.get("match", False))
    total = len(results)

    print(f"Total checked: {total}")
    print(f"Matches: {matches}")
    print(f"Mismatches: {len(mismatches)}")

    if mismatches:
        print("\nMISMATCHED FILES:")
        for m in mismatches:
            print(
                f"  - {m['dream_id']}: Expected '{m['expected_title']}' ({m['expected_file']})"
            )
            print(f"    Audio says: {m['transcribed'][:100]}...")

    results_path = PROJECT_ROOT / "notes" / "audio_verification.json"
    results_path.parent.mkdir(exist_ok=True)
    with open(results_path, "w") as f:
        json.dump({"results": results, "mismatches": mismatches}, f, indent=2)
    print(f"\nResults saved to: {results_path}")


if __name__ == "__main__":
    main()
