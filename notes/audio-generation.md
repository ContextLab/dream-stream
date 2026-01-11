# Audio Generation Notes

## Two-Step Process

Dream audio generation requires TWO scripts to be run in sequence:

1. **`scripts/generate_audio.py`** - Generates TTS narration
   - Creates `{dream-id}_full.opus` (narration only)
   - Creates `{dream-id}_preview.opus` (first 2 min of narration only)
   - Uses Edge TTS with en-GB-SoniaNeural voice

2. **`scripts/generate_music.py`** - Generates music and combines with narration
   - Reads the `_full.opus` narration file
   - Generates procedural ambient music matching the dream's theme
   - Creates `{dream-id}_combined.opus` (narration + music)
   - Recreates `{dream-id}_preview.opus` from combined audio
   - Creates `audio/music/{dream-id}_music.opus` (music only)

## IMPORTANT

- The `_combined.opus` file is what the app uses for playback
- The preview is taken from the combined audio (with music)
- Running only `generate_audio.py` will create files WITHOUT music
- Always run `generate_music.py` after `generate_audio.py`

## Commands

```bash
# Generate a single dream (both steps)
python scripts/generate_audio.py --dream dream-24
python scripts/generate_music.py --dream dream-24

# Generate all dreams
python scripts/generate_audio.py
python scripts/generate_music.py
```

## Music Themes

Each dream has a music theme defined in `lib/dreamData.ts`:
- ambient: Ethereal floating pads
- piano: Gentle piano with bells
- nature: Organic textures with wind/water
- cosmic: Deep space drones
- binaural: Theta/delta binaural beats
