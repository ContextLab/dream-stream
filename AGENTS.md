# DreamStream Development Guidelines

Lucid dream induction app via sleep-aware audio prompting. Expo/React Native cross-platform.

## Quick Reference

```bash
npm run web              # Dev server at localhost:8081
npm run ios              # iOS simulator
npm run android          # Android emulator
npm run typecheck        # TypeScript validation

# Audio generation (Python)
python scripts/generate_audio.py --dream dream-1    # Single dream + music
python scripts/generate_audio.py --limit 5          # First 5 dreams
python scripts/generate_audio.py --no-music         # Skip music step
```

## Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Framework | Expo SDK 52+, Expo Router           |
| UI        | React Native, NativeWind (Tailwind) |
| Audio     | expo-av, Meyda (audio analysis)     |
| Animation | react-native-reanimated             |
| Backend   | Supabase (currently mock data)      |
| TTS       | Edge TTS (CI), en-GB-SoniaNeural    |
| Music     | Procedural synthesis (numpy)        |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     USER INTERFACE                       │
│  app/(tabs)/     Expo Router screens                    │
│  components/     React components + NativeWind          │
├─────────────────────────────────────────────────────────┤
│                    STATE & HOOKS                         │
│  hooks/          React hooks (useAuth, useDreams, etc)  │
├─────────────────────────────────────────────────────────┤
│                   BUSINESS LOGIC                         │
│  services/       Core services (sleep, playback, auth)  │
│  lib/            Data, storage, constants               │
├─────────────────────────────────────────────────────────┤
│                      TOOLING                             │
│  scripts/        Audio generation (Python)              │
│  .github/        CI/CD workflows                        │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
app/                    # Expo Router screens
  (tabs)/              # Tab navigation (home, dream, queue, favorites, settings)
  auth/                # Authentication screens
  dream/               # Dream detail/player ([id].tsx, launch.tsx)
  about.tsx            # App info and instructions
components/            # React components
  ui/                  # Base components (Button, Card, Input, Text, MarqueeText)
  DreamCard.tsx        # Dream list item with queue/favorite/play actions
  DreamPlayer.tsx      # Audio player with controls
  SleepModePlayer.tsx  # REM-aware playback during sleep
  VolumeSetup.tsx      # Volume calibration before sleep mode
hooks/                 # React hooks
  useDreams.ts         # Dream data fetching/search
  useSleepTracking.ts  # Sleep session management
  useLaunchQueue.ts    # Queue state (shared across components)
  useFavorites.ts      # Favorites persistence
services/              # Business logic (see services/AGENTS.md)
lib/                   # Utilities
  dreamData.ts         # Dream narratives with [PAUSE] markers (2896 lines)
  storage.ts           # AsyncStorage wrapper
  constants.ts         # App constants and thresholds
scripts/               # Build tools (see scripts/AGENTS.md)
theme/                 # Design tokens (colors, spacing, typography)
types/                 # TypeScript type definitions
public/audio/          # Generated audio files
  dreams/              # {id}_full.opus, {id}_combined.opus, {id}_preview.opus
  music/               # {id}_music.opus
```

## Key Patterns

### Audio URL Resolution (Web)

```typescript
// Dynamic URL based on deployment context
const baseUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}`
    : '';
const audioUrl = `${baseUrl}/audio/dreams/${dreamId}_combined.opus`;
```

### Sleep Detection Flow

1. `services/sleep.ts` captures microphone via Web Audio API
2. Meyda extracts RMS, spectral features for breathing analysis
3. Breathing regularity + RRV (respiratory rate variability) → sleep stage
4. `onRemStart`/`onRemEnd` callbacks fire when REM detected
5. `SleepModePlayer` plays queued dreams during REM windows

### State Sharing (Launch Queue)

```typescript
// hooks/useLaunchQueue.ts - Shared state via module-level variable
let sharedQueue: Dream[] = [];
const listeners = new Set<() => void>();

export function useLaunchQueue() {
  // All components share same queue instance
}
```

### Styling Convention

- NativeWind (Tailwind) classes for all styling
- `className` prop on all components
- Courier Prime font family for text (`fontFamily: 'CourierPrime_400Regular'`)

## DO NOT

- Use `as any`, `@ts-ignore`, or `@ts-expect-error`
- Commit without explicit user request
- Suppress TypeScript errors
- Add mock/stub implementations without TODO markers
- Modify visual/styling without delegating to frontend specialist

## Implementation Status

### Complete

- Browse/Search with transcript content matching
- Audio playback with progress persistence
- Favorites system (local storage)
- Sleep tracking UI with audio-based detection
- Queue management with shared state
- CI audio generation (Edge TTS + procedural music)

### Partial

- Auth (UI complete, uses mock data)
- Offline indicator (component exists, not integrated)
- HealthKit/Health Connect (stub only)

### Not Started

- Supabase backend integration
- Deep link handling
- Wearable device sync

## Audio Generation

Two-step pipeline in `scripts/`:

1. **generate_audio.py** → Edge TTS narration → `{id}_full.opus`
2. **generate_music.py** → Procedural ambient music → `{id}_combined.opus`

See `scripts/AGENTS.md` for detailed audio pipeline documentation.

## Sleep Detection Thresholds

```typescript
// services/sleep.ts
const BREATHING_RATE_MIN = 8; // BPM
const BREATHING_RATE_MAX = 25; // BPM
const REM_RRV_THRESHOLD = 0.25; // High variability = REM
const DEEP_SLEEP_RRV_THRESHOLD = 0.1; // Low variability = deep
const DROWSY_BREATHING_REGULARITY = 0.7;
const SLEEP_BREATHING_REGULARITY = 0.85;
```

## Deployment

- **Web**: GitHub Pages at https://context-lab.com/dream-stream/
- **CI**: `.github/workflows/deploy.yml` generates audio, caches based on mockData.ts hash
- **Audio**: Opus format, 64kbps, served from `/audio/dreams/`

---

_Last updated: 2026-01-11_
