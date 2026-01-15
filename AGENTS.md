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

### Sleep Detection Flow (Hybrid Classifier)

The app uses a hybrid classifier that fuses audio-based breathing analysis with wearable vitals (via HealthConnect/HealthKit):

```
┌─────────────────────────────────────────────────────────────────┐
│                    SLEEP SESSION START                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Load existing model (or create empty)                       │
│  2. Start hybrid session                                        │
│  3. [Background] Auto-retrain if model >24h old                │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌─────────────────────┐               ┌─────────────────────┐
│   AUDIO SOURCE      │               │   VITALS SOURCE     │
│   (Microphone)      │               │   (HealthConnect)   │
├─────────────────────┤               ├─────────────────────┤
│ Web Audio API       │               │ HR, HRV, RR         │
│ → Meyda features    │               │ → 30s polling       │
│ → Breathing analysis│               │ → RMSSD/CV analysis │
└─────────────────────┘               └─────────────────────┘
          │                                       │
          └───────────────────┬───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID CLASSIFIER                            │
│  • Fuses audio + vitals with weighted probabilities             │
│  • Applies temporal priors (awake more likely at start/end)     │
│  • Two-stage: Awake detection → REM vs NREM                    │
│  • Computes remConfidence for playback gating                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REM PLAYBACK GATE                            │
│  if (stage === 'rem' && remConfidence >= 0.5) → play dream     │
│  else → log and skip                                           │
└─────────────────────────────────────────────────────────────────┘
```

**Key Components:**

- `services/sleep.ts` - Session management, audio capture, stage transitions
- `services/hybridClassifier.ts` - Fuses audio + vitals sources
- `services/remOptimizedClassifier.ts` - REM-focused classification with learned parameters
- `services/healthConnect.ts` - Android Health Connect integration

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

## Design System Audit (January 2026)

### Theme Tokens (`theme/tokens.ts`)

| Category      | Token                  | Values            |
| ------------- | ---------------------- | ----------------- |
| Primary       | `colors.primary[500]`  | `#22c55e` (Green) |
| Background    | `darkTheme.background` | `#09090b`         |
| Surface       | `darkTheme.surface`    | `#18181b`         |
| Surface Alt   | `darkTheme.surfaceAlt` | `#27272a`         |
| Spacing       | `xs/sm/md/lg/xl`       | 4/8/16/24/32px    |
| Border Radius | `sm/md/lg/xl/full`     | 2/4/8/12/9999px   |

### KNOWN ISSUES (To Fix)

#### HIGH PRIORITY

1. **Color Identity Conflict**: `tailwind.config.js` defines primary as BLUE (`#6366f1`) but `theme/tokens.ts` defines it as GREEN (`#22c55e`). Components using NativeWind appear blue, StyleSheet components appear green.

2. **Hardcoded Background Colors**: Many files use hardcoded hex instead of tokens:
   - `#0f0f1a` - Should be `darkTheme.background` or `colors.gray[950]`
   - `#1a1a2e` - Should be `darkTheme.surface`
   - `#252542` - Should be `darkTheme.surfaceAlt`

3. **Missing Accessibility Labels**: Icon-only buttons in `LaunchQueueCard`, `DraggableQueueList`, `SleepHistoryCard`, and home screen info button lack `accessibilityLabel`.

#### MEDIUM PRIORITY

4. **Terminology Inconsistency**:
   - Use "Browse Dreams" (not "Explore Dreams")
   - Use "Start Sleep Tracking" (not "Start Dream Mode")

5. **Capitalization Inconsistency**: Empty states mix Title Case and Sentence case. Standardize on Sentence case.

6. **Icon Style Inconsistency**: Trash icon uses both `trash` and `trash-outline`. Standardize on `trash-outline`.

7. **Modal Close Button**: Placement varies (left in `SleepSessionDetailModal`, right elsewhere). Standardize on right side.

8. **Missing 12px Spacing Token**: Add `smd: 12` to spacing scale.

9. **Back Button Navigation**: `app/dream/[id].tsx` uses `router.replace('/')` instead of `router.back()`.

#### LOW PRIORITY

10. **Redundant Screen**: `app/sleep/index.tsx` duplicates functionality of `app/(tabs)/dream.tsx`.

11. **Hardcoded Font Family**: Some files use `'CourierPrime_400Regular'` string instead of `fontFamily.regular` token.

### Screen Inventory

| Tab       | File                       | Purpose                   |
| --------- | -------------------------- | ------------------------- |
| Home      | `app/(tabs)/index.tsx`     | Browse dreams by category |
| Search    | `app/(tabs)/search.tsx`    | Full-text dream search    |
| Favorites | `app/(tabs)/favorites.tsx` | Saved dreams              |
| Queue     | `app/(tabs)/queue.tsx`     | Sleep session queue       |
| Dream     | `app/(tabs)/dream.tsx`     | Sleep tracking control    |
| Settings  | `app/(tabs)/settings.tsx`  | Calibration & debug       |

| Modal/Detail | File                   | Purpose               |
| ------------ | ---------------------- | --------------------- |
| Dream Detail | `app/dream/[id].tsx`   | Dream info and player |
| Dream Launch | `app/dream/launch.tsx` | Active dream session  |
| About        | `app/about.tsx`        | Instructions          |

### Component Categories

| Category         | Components                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| Base UI          | `ui/Button`, `ui/Card`, `ui/Input`, `ui/Text`, `ui/ThemedAlert`             |
| Dream Display    | `DreamCard`, `DreamPlayer`, `DreamFeed`, `DreamCardSkeleton`                |
| Queue Management | `LaunchQueueCard`, `DraggableQueueList`, `QueueButton`                      |
| Sleep Tracking   | `SleepModePlayer`, `SleepStageGraph`, `SleepHistoryCard`, `SleepDebugPanel` |
| Calibration      | `VolumeSetup`, `MicrophoneTest`, `SensorCalibration`                        |
| Navigation       | `CategoryFilter`, `SearchBar`                                               |
| Overlays         | `DarkScreenOverlay`, `SleepSessionDetailModal`                              |

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
- Queue management with shared state
- CI audio generation (Edge TTS + procedural music)
- **Health Connect integration** (Android) - HR, HRV, respiratory rate, sleep stages
- **Hybrid sleep classifier** - fuses audio + vitals for stage detection
- **Auto-training classifier** - learns from user's HealthConnect history
- **REM confidence gating** - prevents false positive dream playback

### Partial

- Auth (UI complete, uses mock data)
- Offline indicator (component exists, not integrated)
- HealthKit (iOS) - stub only, Health Connect (Android) is complete

### Not Started

- Supabase backend integration
- Deep link handling
- watchOS/WearOS companion apps

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

## Sleep Classifier Configuration

### Two-Stage Classification (Option A+C)

```typescript
// services/remOptimizedClassifier.ts

// Stage 1: Awake Detection
const AWAKE_MEAN_DIFF_BASE_THRESHOLD = 3.0; // HR beat-to-beat variability
const AWAKE_CONSECUTIVE_REQUIRED = 1; // Signals before awake confirmed

// Learned awake priors by 30-min time bins (from Fitbit analysis)
// 0-30min: 38.1%, 30-60min: 4.8%, 60-90min: 1.6%, ...330-360min: 30.9%

// Dynamic threshold adjustment based on time prior:
// prior > 25% → threshold * 0.85 (more sensitive at sleep onset/wake)
// prior < 5%  → threshold * 1.3  (less sensitive mid-sleep)

// Stage 2: REM vs NREM
const CV_THRESHOLD = 0.2; // RMSSD coefficient of variation
const REM_CONSECUTIVE_REQUIRED = 2; // Consecutive signals for REM

// Blended awake score: 0.7 * hr_signal + 0.3 * time_prior > 0.4
```

### REM Playback Gating

```typescript
// services/sleep.ts
const MIN_REM_CONFIDENCE_FOR_PLAYBACK = 0.5;

// remConfidence computed from:
// - REM probability from classifier
// - Time bonus (>70 min since sleep start)
// - REM window bonus (in expected REM portion of cycle)
// - Consecutive REM signals
// - REM propensity (increases through night)
```

### Expected Performance (Best Balanced)

| Metric            | Value |
| ----------------- | ----- |
| REM Sensitivity   | 79.8% |
| Awake Sensitivity | 31.0% |
| Awake Precision   | 30.8% |

## Deployment

- **Web**: GitHub Pages at https://context-lab.com/dream-stream/
- **CI**: `.github/workflows/deploy.yml` generates audio, caches based on mockData.ts hash
- **Audio**: Opus format, 64kbps, served from `/audio/dreams/`

## Android Build

### Current Status: WORKING

Android builds are functional as of January 2026. The previous AGP/Material compatibility issues have been resolved.

### Build Commands

```bash
# Build and run on connected device/emulator
npx expo run:android

# Build APK only
cd android && ./gradlew assembleDebug

# APK output location
android/app/build/outputs/apk/debug/app-debug.apk
```

### Build Configuration

| Component  | Version       |
| ---------- | ------------- |
| buildTools | 36.0.0        |
| minSdk     | 26            |
| compileSdk | 36            |
| targetSdk  | 36            |
| NDK        | 27.1.12297006 |
| Kotlin     | 2.1.20        |
| Gradle     | 8.14.3        |

### Health Connect Integration

Health Connect is integrated and working:

- Permissions: Heart rate, respiratory rate, sleep data
- Status shown in Settings > Wearables & Health Connect
- Debug data available in Settings > Health Connect Data Debug

### Testing on Emulator

```bash
# List available emulators
~/Library/Android/sdk/emulator/emulator -list-avds

# Start emulator
~/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_35

# Check connected devices
~/Library/Android/sdk/platform-tools/adb devices

# Install APK
~/Library/Android/sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Take screenshot
~/Library/Android/sdk/platform-tools/adb exec-out screencap -p > screenshot.png
```

### EAS Configuration

- Project ID: `8d6aab43-b375-4a93-86a2-bb5d4e407871`
- Owner: `contextlab`

---

_Last updated: 2026-01-15_
