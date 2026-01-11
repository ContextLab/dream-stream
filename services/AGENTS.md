# Services Layer

Business logic and external integrations. All state mutations flow through these modules.

## File Overview

| File             | Purpose                                     | Status             |
| ---------------- | ------------------------------------------- | ------------------ |
| `sleep.ts`       | Audio-based sleep stage detection via Meyda | Complete           |
| `playback.ts`    | Playback progress persistence               | Complete           |
| `favorites.ts`   | Favorites CRUD (local storage)              | Complete           |
| `launchQueue.ts` | Queue management service                    | Complete           |
| `dreams.ts`      | Dream data fetching/sorting                 | Complete           |
| `categories.ts`  | Category filtering                          | Complete           |
| `volume.ts`      | Volume calibration utilities                | Complete           |
| `auth.ts`        | Authentication (mock data)                  | Partial            |
| `wearable.ts`    | HealthKit/Health Connect                    | Stub only          |
| `supabase.ts`    | Supabase client                             | Configured, unused |
| `share.ts`       | Share functionality                         | Partial            |
| `tts.ts`         | TTS configuration                           | Stub               |
| `music.ts`       | Music generation config                     | Stub               |
| `mux.ts`         | Mux video integration                       | Stub               |

## Sleep Detection (`sleep.ts`)

The core sleep tracking engine using audio-based breathing analysis.

### Architecture

```
Microphone → Web Audio API → Meyda → Breathing Analysis → Sleep Stage
                                          ↓
                              REM callbacks → SleepModePlayer
```

### Key Exports

```typescript
// Session management
startSleepSession(source: 'audio' | 'wearable' | 'manual'): Promise<SleepSession>
stopSleepSession(): Promise<SleepSession | null>
getCurrentSession(): SleepSession | null

// Audio analysis
startAudioAnalysis(): Promise<void>
stopAudioAnalysis(): void

// REM detection callbacks
onRemStart(callback: () => void): () => void
onRemEnd(callback: () => void): () => void

// Stage updates
onSleepStageChange(callback: (stage: SleepStage) => void): () => void
```

### Detection Thresholds

```typescript
const BREATHING_RATE_MIN = 8; // BPM minimum
const BREATHING_RATE_MAX = 25; // BPM maximum
const REM_RRV_THRESHOLD = 0.25; // High variability = REM
const DEEP_SLEEP_RRV_THRESHOLD = 0.1; // Low variability = deep
const DROWSY_BREATHING_REGULARITY = 0.7;
const SLEEP_BREATHING_REGULARITY = 0.85;
const MOVEMENT_THRESHOLD = 0.15;
```

### Sleep Stage Inference

1. **Awake**: Low breathing regularity OR movement detected
2. **Drowsy**: Regularity > 0.7, movement minimal
3. **Light Sleep**: Regularity > 0.85, moderate RRV
4. **Deep Sleep**: High regularity, RRV < 0.1 (very stable)
5. **REM**: High regularity, RRV > 0.25 (variable breathing)

## Playback Progress (`playback.ts`)

Local-first progress tracking with 95% completion threshold.

```typescript
getPlaybackProgress(dreamId: string): Promise<{ positionSeconds, completed } | null>
savePlaybackProgress(dreamId: string, position: number, duration: number): Promise<void>
clearPlaybackProgress(dreamId: string): Promise<void>
```

## Auth Service (`auth.ts`)

Currently uses mock data. Real Supabase integration pending.

```typescript
// Mock user for development
const LOCAL_USER = {
  id: 'local-user',
  email: 'user@dreamstream.local',
  // ...
};

// Real auth functions (to be implemented)
signIn(email: string, password: string): Promise<User>
signUp(email: string, password: string): Promise<User>
signOut(): Promise<void>
getCurrentUser(): Promise<User | null>
```

## Wearable Integration (`wearable.ts`)

Stub implementation for future HealthKit/Health Connect integration.

```typescript
// Always returns false - needs real implementation
isHealthKitAvailable(): Promise<boolean>
requestHealthKitPermissions(): Promise<boolean>
subscribeSleepData(callback: SleepDataCallback): () => void
```

## DO NOT

- Bypass services layer for direct storage access
- Add `as any` type assertions
- Mix UI logic into service files
- Call services directly from components (use hooks)

## Integration Pattern

```
Component → Hook → Service → Storage/API
    ↓
useDreams() → dreams.ts → dreamData.ts
useFavorites() → favorites.ts → storage.ts
useSleepTracking() → sleep.ts → Meyda/Web Audio
```
