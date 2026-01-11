# Audio Generation Notes

## Pipeline Overview

Audio generation uses a narrative-based pipeline:

```
scripts/narratives/*.txt   -> Text narratives with [PAUSE] markers
scripts/narratives/metadata.json -> Dream titles, music styles, categories
       |
       v
scripts/build_dream_data.py   -> Generates lib/dreamData.ts
       |
       v
scripts/generate_audio.py     -> TTS narration (auto-calls generate_music.py)
       |
       v
public/audio/dreams/dream-N_combined.opus -> Final audio for playback
```

## File Naming Convention

Audio files use `dream-N` format (matching dreamData.ts IDs):

- `dream-1_full.opus` - Narration only
- `dream-1_music.opus` - Music only (in `audio/music/`)
- `dream-1_combined.opus` - Narration + music (for playback)
- `dream-1_preview.opus` - First 2 min of combined

## Commands

```bash
# Rebuild dreamData.ts from narratives
python scripts/build_dream_data.py

# List available dreams
python scripts/generate_audio.py --list

# Generate single dream (by ID or narrative name)
python scripts/generate_audio.py --dream dream-24
python scripts/generate_audio.py --dream skill_public_speaking

# Generate dreams starting from index
python scripts/generate_audio.py --start 26

# Generate all dreams
python scripts/generate_audio.py --all

# Skip music generation (faster, for testing)
python scripts/generate_audio.py --dream dream-24 --no-music

# Generate music only for existing narration
python scripts/generate_music.py --dream dream-24
```

## Two-Step Process

`generate_audio.py` auto-calls `generate_music.py` unless `--no-music` is used.

If interrupted, you can:

1. Check which dreams have `_full.opus` but no `_combined.opus`
2. Run `generate_music.py --dream dream-N` manually for those

## Music Themes

Defined in `scripts/narratives/metadata.json`:

- ambient: Ethereal floating pads (432Hz)
- piano: Gentle piano with bells
- nature: Organic textures with wind/water
- cosmic: Deep space drones
- binaural: Theta/delta binaural beats

## Voice Configuration

```python
VOICE = "en-GB-SoniaNeural"  # Calm British female
RATE = "-30%"                 # Slower for dreamlike quality
PITCH = "-15Hz"               # Lower pitch
```

## Current Status

- 39 total dreams in metadata.json
- Dreams 1-27 have combined audio
- Dreams 28-39 still need generation

## Commit Guidelines

Only commit `*_combined.opus` files. Do NOT commit:

- `*_full.opus`
- `*_music.opus`
- `*_preview.opus`
