# dream_stream Development Guidelines

Lucid dream induction app via sleep-aware audio prompting. Expo/React Native cross-platform.

## Quick Reference

```bash
npm run web              # Dev server at localhost:8081
npm run ios              # iOS simulator
npm run android          # Android emulator
npm run typecheck        # TypeScript validation

# Dream content pipeline (Python)
python scripts/build_dream_data.py                  # Rebuild dreamData.ts from narratives
python scripts/generate_audio.py --dream dream-24   # Generate audio for single dream
python scripts/generate_audio.py --all              # Generate audio for all dreams
python scripts/generate_audio.py --start 24         # Generate audio for dreams 24+
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
  dreamData.ts         # Generated from narratives (DO NOT EDIT DIRECTLY)
  storage.ts           # AsyncStorage wrapper
  constants.ts         # App constants and thresholds
scripts/               # Build tools (see scripts/AGENTS.md)
  narratives/          # Dream narrative text files + metadata.json
  build_dream_data.py  # Generates lib/dreamData.ts from narratives
  generate_audio.py    # TTS narration generation
  generate_music.py    # Procedural music + mixing
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

## Adding New Dreams

1. Create narrative file: `scripts/narratives/my_dream.txt`
2. Add entry to `scripts/narratives/metadata.json`
3. Rebuild: `python scripts/build_dream_data.py`
4. Generate audio: `python scripts/generate_audio.py --dream dream-N`
5. Commit only `*_combined.opus` files

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

## Android Build

### Current Status: BLOCKED

Android builds are blocked by a bug in Android Gradle Plugin's AAPT2 resource compiler that fails to parse color resources from Material library. This affects both local builds and potentially EAS cloud builds.

**Error:**

```
material-1.13.0/res/values/values.xml:364:4: Invalid <color> for given resource value.
java.lang.IllegalStateException: Can not extract resource from com.android.aaptcompiler.ParsedResource
```

### AGP Versions Tested (All Failed)

| AGP           | Gradle | Material  | Result                            |
| ------------- | ------ | --------- | --------------------------------- |
| 8.7.3         | 8.13   | 1.13.0    | Version mismatch                  |
| 8.10.2        | 8.13   | 1.9.0     | Missing react-native-screens APIs |
| 8.10.2        | 8.13   | 1.10-1.12 | Invalid color error               |
| 8.11.0        | 8.14.3 | 1.13.0    | Invalid color error               |
| 8.13.0-8.13.2 | 8.13   | 1.12.0    | Invalid color error               |

### Next Steps to Try

1. **EAS Cloud Build** - May have different toolchain:

   ```bash
   eas login
   eas build --platform android --profile preview
   ```

2. **Wait for AGP fix** - Bug tracked in Google Issue Tracker

- External AAPT2 binary override
- EAS local and cloud builds

### When Fixed

Once the AGP bug is resolved (monitor Expo/React Native releases), build with:

```bash
# Option 1: EAS Cloud Build (recommended)
export EXPO_TOKEN=<your-expo-token>
npx eas build --platform android --profile preview

# Option 2: Local build
cd android && ./gradlew assembleRelease
# APK at: android/app/build/outputs/apk/release/app-release.apk
```

### EAS Configuration

- Project ID: `8d6aab43-b375-4a93-86a2-bb5d4e407871`
- Owner: `contextlab`
- Credentials: Local debug keystore (`credentials.json`)

---

_Last updated: 2026-01-11_
