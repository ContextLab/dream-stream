# Audio Generation Scripts

Python tooling for generating dream narration audio and ambient music.

## Quick Start

```bash
# Single dream with music
python scripts/generate_audio.py --dream dream-1

# Multiple dreams
python scripts/generate_audio.py --limit 5

# Narration only (skip music)
python scripts/generate_audio.py --no-music

# Music only (for existing narration)
python scripts/generate_music.py --dream dream-1

# List available TTS voices
python scripts/generate_audio.py --list-voices
```

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  lib/dreamData.ts                                               │
│  └─ Dream narratives with [PAUSE] markers                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  generate_audio.py (Step 1)                                     │
│  └─ Edge TTS → {id}_full.opus (narration only)                  │
│  └─ Extract preview → {id}_preview.opus (first 30s)             │
│  └─ Auto-calls generate_music.py (unless --no-music)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  generate_music.py (Step 2)                                     │
│  └─ Procedural synthesis → {id}_music.opus                      │
│  └─ Mix narration + music → {id}_combined.opus                  │
│  └─ Update preview with music → {id}_preview.opus               │
└─────────────────────────────────────────────────────────────────┘
```

## Output Files

| File                 | Description                                  |
| -------------------- | -------------------------------------------- |
| `{id}_full.opus`     | Narration only (Edge TTS output)             |
| `{id}_music.opus`    | Music only (procedural synthesis)            |
| `{id}_combined.opus` | Narration + music mixed (web playback)       |
| `{id}_preview.opus`  | First 30 seconds with music (browse preview) |

## generate_audio.py

Edge TTS narration generation with pause handling.

### Voice Configuration

```python
VOICE = "en-GB-SoniaNeural"  # Calm British female
RATE = "-30%"                 # Slower for dreamlike quality
PITCH = "-15Hz"               # Lower pitch
```

### Pause Handling

- `[PAUSE]` markers in dreamData.ts → 45-second silence gaps
- 2-second silence between text segments
- Designed for lucid dreaming exploration moments

### Dependencies

```bash
pip install edge-tts  # Auto-installed if missing
# Requires: ffmpeg (system)
```

## generate_music.py

Procedural ambient music generation using numpy synthesis.

### Music Themes

```python
MUSIC_THEMES = {
    "ambient": {
        "base_freq": 432,  # 432Hz tuning
        "chord_progression": ["Cmaj9", "Am11", "Fmaj9", ...],
        "tempo_bpm": 50,
        "instrument": "ethereal_pad",
    },
    "piano": {
        "base_freq": 440,
        "chord_progression": ["Am9", "Fmaj7", "C", ...],
        "tempo_bpm": 65,
        "instrument": "soft_piano",
    },
    "nature": {
        "description": "Organic textures with wind, water tones",
        # ...
    },
    "cosmic": {
        "description": "Deep space drones and crystalline textures",
        # ...
    },
}
```

### Volume Ducking

```python
MUSIC_VOLUME_BASE = 0.22   # During narration
MUSIC_VOLUME_PAUSE = 0.30  # During [PAUSE] sections
FADE_DURATION = 15.0       # Fade in/out seconds
```

### Dependencies

```bash
pip install numpy soundfile
# Optional: scipy (for advanced filtering)
# Requires: ffmpeg (system)
```

## CI Integration

`.github/workflows/deploy.yml` runs audio generation:

1. Caches based on `lib/dreamData.ts` hash
2. Only regenerates when narratives change
3. Stores in `public/audio/` for GitHub Pages serving

### Cache Key

```yaml
key: audio-cache-${{ hashFiles('lib/dreamData.ts') }}
```

## DO NOT

- Commit generated audio files (served from CI)
- Modify voice/rate/pitch without testing full playback
- Remove [PAUSE] markers without updating pause duration
- Use scipy without fallback (optional dependency)

## Troubleshooting

### "ffmpeg not found"

```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

### Edge TTS rate limiting

- Add delays between generations
- Use `--limit` to batch process

### Music sounds wrong

- Check dream's `music` field matches a valid theme key
- Fallback is "ambient" if theme not found
