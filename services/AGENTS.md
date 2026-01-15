# Services Layer

Business logic and external integrations. All state mutations flow through these modules.

## File Overview

| File                        | Purpose                                    | Status   |
| --------------------------- | ------------------------------------------ | -------- |
| `sleep.ts`                  | Sleep session management, audio capture    | Complete |
| `hybridClassifier.ts`       | Fuses audio + vitals for stage detection   | Complete |
| `remOptimizedClassifier.ts` | REM-focused classifier with learned params | Complete |
| `healthConnect.ts`          | Android Health Connect integration         | Complete |
| `vitalsClassifier.ts`       | Vitals-based stage classification          | Complete |
| `sleepStageLearning.ts`     | Learn from historical HealthConnect data   | Complete |
| `nativeAudio.ts`            | Native audio capture (Android/iOS)         | Complete |
| `playback.ts`               | Playback progress persistence              | Complete |
| `favorites.ts`              | Favorites CRUD (local storage)             | Complete |
| `launchQueue.ts`            | Queue management service                   | Complete |
| `dreams.ts`                 | Dream data fetching/sorting                | Complete |
| `categories.ts`             | Category filtering                         | Complete |
| `volume.ts`                 | Volume calibration utilities               | Complete |
| `auth.ts`                   | Authentication (mock data)                 | Partial  |
| `healthKit.ts`              | iOS HealthKit integration                  | Stub     |
| `supabase.ts`               | Supabase client                            | Unused   |

## Sleep Detection Architecture

### Session Startup Flow

```typescript
startSleepSession()
  ├─ learnFromRecentNights(87600)  // Quick HR/HRV profile learning
  ├─ startHybridSession()           // Load model, init classifiers
  ├─ [Session starts immediately]
  │
  └─ maybeRetrainInBackground()     // Async, non-blocking
       ├─ Check: Model <24h old? → Skip
       ├─ Check: Has 10+ sleep stages? → Skip if no
       └─ trainRemOptimizedModel()  // Full training with validation
```

### Hybrid Classifier (`hybridClassifier.ts`)

Fuses audio and vitals sources with weighted probabilities:

```typescript
interface HybridClassification {
  audio: SourceClassification; // From breathing analysis
  vitals: SourceClassification; // From HealthConnect HR/HRV
  fused: StageProbabilities; // Combined probabilities
  predictedStage: SleepStage; // Final stage decision
  overallConfidence: number; // Max of audio/vitals confidence
  remConfidence: number; // Confidence for REM playback gating
}

// Weights determined by data availability and confidence
const audioWeight = audioResult.confidence;
const vitalsWeight = vitalsResult.confidence;
const awakePriorWeight = 0.3 * (1 - elapsedFraction); // Fades over 5 min
```

### REM-Optimized Classifier (`remOptimizedClassifier.ts`)

Two-stage classification optimized for REM detection:

**Stage 1: Awake Detection**

```typescript
// Blended awake score
const hrSignal = (meanDiff - dynamicThreshold + 1.5) / 3.0;
const awakeScore = 0.7 * hrSignal + 0.3 * timePrior;
const isAwake = awakeScore > 0.4;

// Dynamic threshold based on learned time priors
// prior > 25% → threshold * 0.85 (more sensitive)
// prior < 5%  → threshold * 1.3 (less sensitive)
```

**Stage 2: REM vs NREM**

```typescript
// CV-based REM detection
const cv = computeCV(rmssdHistory); // Coefficient of variation
const cvRemSignal = cv < 0.2 ? 1.0 : 0.0;

// REM requires consecutive signals
if (remScore > 0.25) consecutiveRemSignals++;
const isRem = consecutiveRemSignals >= 2;
```

**Learned Parameters:**

- Awake priors by 30-min time bins (from Fitbit data)
- Mean diff threshold (learned from user's data)
- Per-stage HR/HRV profiles

### REM Playback Gating

Dreams only play when `remConfidence >= 0.5`:

```typescript
// remConfidence computed from:
let remConfidence = baseRemProb;
remConfidence += temporal.minutesSinceSleepStart > 70 ? 0.15 : 0; // Time bonus
remConfidence += temporal.isInRemWindow ? 0.1 : 0; // Cycle position
remConfidence += Math.min(0.2, consecutiveRemSignals * 0.05); // Consecutive
remConfidence += temporal.remPropensity * 0.1; // Propensity
```

## Health Connect Integration (`healthConnect.ts`)

Android Health Connect provides real-time vitals during sleep:

```typescript
interface VitalsSnapshot {
  heartRate: number | null;
  hrv: number | null;
  respiratoryRate: number | null;
  timestamp: Date;
}

// Polling during sleep session
const VITALS_POLL_INTERVAL_MS = 30000;  // 30 seconds

// Available data types
getRecentHeartRate(minutes: number): Promise<HeartRateSample[]>
getRecentHRV(minutes: number): Promise<HRVSample[]>
getRecentSleepSessions(hours: number): Promise<SleepStageSample[]>
getRecentRespiratoryRate(minutes: number): Promise<RespiratoryRateSample[]>
```

## Model Training (`remOptimizedClassifier.ts`)

### Auto-Training on Session Start

Triggered when model is >24h old or missing:

```typescript
trainRemOptimizedModel(hoursBack: number = 87600)
  ├─ Fetch all HealthConnect data
  ├─ Learn awake time-bin priors
  ├─ Learn mean_diff threshold
  ├─ Build per-stage HR/HRV profiles
  ├─ Run validation
  └─ Save model to storage
```

### Manual Training (Settings)

Available via Settings > Train Classifier:

- Shows progress (fetching, learning, validating)
- Reports accuracy metrics
- Displays nights analyzed

## Key Exports

### sleep.ts

```typescript
// Session management
startSleepSession(source): Promise<SleepSession>
stopSleepSession(): Promise<SleepSession | null>
getCurrentSession(): SleepSession | null

// REM detection callbacks (gated by remConfidence >= 0.5)
onRemStart(callback: () => void): () => void
onRemEnd(callback: () => void): () => void

// Stage updates
onSleepStageChange(callback: (stage) => void): () => void
```

### hybridClassifier.ts

```typescript
startHybridSession(): Promise<void>
stopHybridSession(): void
classifyHybrid(audio, vitals): Promise<HybridClassification>
```

### remOptimizedClassifier.ts

```typescript
loadRemOptimizedModel(): Promise<RemOptimizedModel | null>
trainRemOptimizedModel(hoursBack, onProgress): Promise<{model, report}>
classifyRemOptimized(hr, hrv, timestamp): ClassificationResult3
```

## Integration Pattern

```
Component → Hook → Service → Storage/API
    ↓
useDreams() → dreams.ts → dreamData.ts
useFavorites() → favorites.ts → storage.ts
useSleepTracking() → sleep.ts → hybridClassifier.ts → healthConnect.ts
```

## DO NOT

- Bypass services layer for direct storage access
- Add `as any` type assertions
- Mix UI logic into service files
- Call services directly from components (use hooks)
- Suppress REM confidence gating

---

_Last updated: 2026-01-15_
