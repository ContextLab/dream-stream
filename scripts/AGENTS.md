# Audio Generation Scripts

Python tooling for generating dream narration audio and ambient music.

## Quick Start

```bash
# Build dreamData.ts from narrative files
python scripts/build_dream_data.py

# Generate audio for a single dream
python scripts/generate_audio.py --dream dream-24

# Generate audio for all dreams
python scripts/generate_audio.py --all

# Generate audio for new dreams only (24+)
python scripts/generate_audio.py --start 24

# Skip music generation
python scripts/generate_audio.py --dream dream-24 --no-music
```

## Content Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  scripts/narratives/*.txt                                       │
│  └─ Individual dream narrative text files                       │
│  └─ Include [PAUSE] markers for exploration periods             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  scripts/narratives/metadata.json                               │
│  └─ Dream titles, music styles, category assignments            │
│  └─ Category definitions (id, name, color, icon)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  build_dream_data.py                                            │
│  └─ Reads metadata.json + narrative files                       │
│  └─ Generates lib/dreamData.ts                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  generate_audio.py                                              │
│  └─ Edge TTS → {id}_full.opus (narration only)                  │
│  └─ Extract preview → {id}_preview.opus (first 30s)             │
│  └─ Auto-calls generate_music.py (unless --no-music)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  generate_music.py                                              │
│  └─ Procedural synthesis → {id}_music.opus                      │
│  └─ Mix narration + music → {id}_combined.opus                  │
│  └─ Update preview with music → {id}_preview.opus               │
└─────────────────────────────────────────────────────────────────┘
```

## Adding New Dreams

1. **Create narrative file** in `scripts/narratives/`:
   ```
   scripts/narratives/my_new_dream.txt
   ```
2. **Add entry to metadata.json**:

   ```json
   {
     "file": "my_new_dream.txt",
     "title": "My New Dream Title",
     "music": "ambient",
     "categoryId": "cat-10"
   }
   ```

3. **Rebuild dreamData.ts**:

   ```bash
   python scripts/build_dream_data.py
   ```

4. **Generate audio**:

   ```bash
   python scripts/generate_audio.py --dream dream-40
   ```

5. **Commit only combined files**:
   ```bash
   git add public/audio/dreams/*_combined.opus
   git commit -m "feat: add new dream audio"
   ```

## Narrative File Format

- Plain text, no headers or metadata
- Use `[PAUSE]` markers every 3-4 paragraphs
- Write in second person ("you")
- Include reality check at start (look at hands)
- Include awareness cues ("You are dreaming")
- ~2000-3000 words recommended

## Output Files

| File                 | Description                  | Commit? |
| -------------------- | ---------------------------- | ------- |
| `{id}_full.opus`     | Narration only               | No      |
| `{id}_music.opus`    | Music only                   | No      |
| `{id}_combined.opus` | Narration + music (playback) | Yes     |
| `{id}_preview.opus`  | First 30s with music         | No      |

## Categories

Categories are defined in `metadata.json`. Each dream can specify a `categoryId` or default to cycling through categories by index.

| ID     | Name             | Icon | Use Case                           |
| ------ | ---------------- | ---- | ---------------------------------- |
| cat-1  | Adventure        | ⚔️   | Action-oriented dreams             |
| cat-2  | Joy              | ✨   | Positive emotion cultivation       |
| cat-3  | Creativity       | 🎨   | Creative visualization             |
| cat-4  | Calming          | 🌊   | Relaxation and calm                |
| cat-5  | Relaxation       | 🧘   | Deep relaxation                    |
| cat-6  | Self-Esteem      | 💪   | Confidence building                |
| cat-7  | Healing          | 💚   | General healing                    |
| cat-8  | Mental Clarity   | 🧠   | Focus and clarity                  |
| cat-9  | Renewal          | 🌱   | Fresh starts                       |
| cat-10 | Skill Building   | 🎯   | Practice skills (speaking, music)  |
| cat-11 | Nightmare Relief | 🛡️   | Transform nightmares               |
| cat-12 | Problem Solving  | 💡   | Creative problem solving           |
| cat-13 | Anxiety Relief   | 🌿   | Anxiety and depression relief      |
| cat-14 | Fantasy          | 🦋   | Flying, underwater, meeting heroes |
| cat-15 | Healing Viz      | 💫   | Cellular/physiological healing     |
| cat-16 | Mental Skills    | 🧩   | Math, writing, clear thinking      |

## Music Themes

| Theme      | Description                             |
| ---------- | --------------------------------------- |
| `ambient`  | Ethereal pads, 432Hz tuning, slow tempo |
| `piano`    | Soft piano, 440Hz, gentle progressions  |
| `nature`   | Organic textures, wind, water sounds    |
| `cosmic`   | Deep space drones, crystalline textures |
| `binaural` | Binaural beats for entrainment          |

## Voice Configuration

```python
VOICE = "en-GB-SoniaNeural"  # Calm British female
RATE = "-30%"                 # Slower for dreamlike quality
PITCH = "-15Hz"               # Lower pitch
```

## CI Integration

`.github/workflows/deploy.yml` runs audio generation:

1. Caches based on `scripts/narratives/metadata.json` hash
2. Only regenerates when narratives/metadata change
3. Stores `*_combined.opus` in `public/audio/dreams/`

## Dependencies

```bash
pip install edge-tts numpy soundfile
# Requires: ffmpeg (system)
```

## Classifier Analysis Scripts

These scripts analyze Fitbit/HealthConnect data to optimize the sleep classifier:

| Script                       | Purpose                                      |
| ---------------------------- | -------------------------------------------- |
| `parse_fitbit_takeout.py`    | Parse Fitbit Takeout data for analysis       |
| `compare_all_options.py`     | Compare classifier configurations            |
| `adaptive_classifier.py`     | Test adaptive classifier with learned params |
| `two_stage_classifier.py`    | Two-stage awake/REM classifier               |
| `analyze_awake.py`           | Analyze awake detection features             |
| `analyze_temporal_priors.py` | Compute time-based awake priors              |

### Running Classifier Evaluation

```bash
# Compare all classifier options (requires notes/raw_sleep_data.json)
python scripts/compare_all_options.py

# Run adaptive classifier with learned parameters
python scripts/adaptive_classifier.py
```

### Data Requirements

Classifier scripts expect `notes/raw_sleep_data.json` with:

- `hrSamples`: Array of `{bpm, time}` objects
- `sleepStages`: Array of `{stage, startTime, endTime}` objects

This data is gitignored (personal health data).

## DO NOT

- Commit `_full.opus`, `_music.opus`, or `_preview.opus` files
- Modify voice/rate/pitch without testing full playback
- Remove [PAUSE] markers without updating pause duration
- Edit dreamData.ts directly (regenerate via build_dream_data.py)
- Commit personal health data (notes/raw_sleep_data.json, etc.)

---

_Last updated: 2026-01-15_
