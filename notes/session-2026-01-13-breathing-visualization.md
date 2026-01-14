# Session Notes: 2026-01-13 Breathing Visualization & Health Connect Debug

## Summary

Continued from previous session. Added breathing visualization to calibration screen, Health Connect debug panel, and enhanced sleep stage learning with respiratory rate.

## Completed Tasks

### 1. Breath Visualization in MicrophoneTest

**File**: `components/MicrophoneTest.tsx`

Added visual feedback for detected breaths:

- **Breath pulse ring**: Animated ring that pulses with each detected breath (scale 1.0 -> 1.15 -> 1.0)
- **BPM display**: Shows calculated breaths per minute in the center circle
- **Breath count**: Shows number of detected breaths in the stats section
- **Time since breath**: Shows seconds since last detected breath (when < 10s)

New animated values:

- `breathPulseScale` - Animates from 1 to 1.15 and back on breath detection
- `breathPulseOpacity` - Fades from 0.3 to 0.8 and back

Uses data from `breathingData.lastBreathTime` and `breathingData.recentBreathTimes` from sleep.ts.

### 2. Health Connect Debug Panel

**Files**: `services/healthConnect.ts`, `app/(tabs)/settings.tsx`

Added comprehensive Health Connect debugging:

New exports in healthConnect.ts:

- `HealthConnectDebugReport` interface
- `runHealthConnectDebugReport(hoursBack)` - Gathers all HC data
- `formatHealthConnectDebugReport(report)` - Formats as readable text

Debug report includes:

- Status (available, initialized, permissions)
- All granted permissions
- Record counts for all types (last 24h)
- Sample data (first 10 of each: HR, HRV, RR, Sleep stages)

New UI in settings.tsx:

- "Health Connect Data Debug" expandable section
- "Run Debug Report" button
- Scrollable output showing all data

### 3. Enhanced Sleep Stage Learning with Respiratory Rate

**Files**: `services/sleepStageLearning.ts`, `services/vitalsClassifier.ts`

Extended the learning system to use respiratory rate as an additional feature:

Changes to StageProfile:

- Added `rrMean` and `rrStd` fields for respiratory rate statistics per stage

Changes to learnFromRecentNights():

- Now fetches RespiratoryRate data from Health Connect in parallel with HR/HRV
- Builds respiratory rate profiles per sleep stage

Changes to classifyWithModel():

- Accepts optional `respiratoryRate` parameter
- When RR data available: weighted scoring is HR(50%) + HRV(30%) + RR(20%)
- When RR not available: falls back to HR(60%) + HRV(40%)

Changes to DebugReport:

- Added `respiratoryRate` section with samples and counts
- Added `stagesWithRR` to matching section
- Debug output now shows RR stats when available

Changes to vitalsClassifier.ts:

- VitalsWindow now tracks `respiratoryRates[]`
- VitalsAnalysis includes `avgRespiratoryRate`
- analyzeVitalsWithLearning() passes RR to the model

### 4. Lowered Bandpass Filter

**File**: `services/sleep.ts`

Changed BANDPASS_LOW_FREQ from 150Hz to 100Hz to capture more breathing sounds (heart sounds are quiet).

## Files Modified (Uncommitted)

| File                             | Changes                                  |
| -------------------------------- | ---------------------------------------- |
| `app/(tabs)/settings.tsx`        | Added HC debug panel                     |
| `components/MicrophoneTest.tsx`  | Added breath visualization               |
| `hooks/useHealth.ts`             | Added respiratoryRate to VitalsSnapshot  |
| `services/healthConnect.ts`      | Added debug report functions, RR support |
| `services/healthKit.ts`          | Added respiratoryRate field              |
| `services/sleep.ts`              | Added breath times, lowered bandpass     |
| `services/sleepStageLearning.ts` | Added RR to profiles and classification  |
| `services/vitalsClassifier.ts`   | Added RR tracking and analysis           |

## Testing Status

- TypeScript: All checks pass
- Web: Not tested yet
- Android: Not tested yet (requires build)

## All Tasks Completed

1. ✅ Debug HRV: Added RespiratoryRate as alternative data source
2. ✅ Breath-by-breath detection from audio
3. ✅ Breath visualization in calibration screen
4. ✅ Show RespiratoryRate when HRV not available
5. ✅ Enhanced learning system with RRV features
6. ❌ WearOS emulator setup (manual task, not code)
7. ✅ Health Connect debug panel
8. ✅ Lower bandpass filter (150 -> 100 Hz)

## Build Commands

```bash
npm run typecheck        # TypeScript validation
npm run web              # Web dev server
cd android && ./gradlew assembleRelease  # Android APK
```

## Key Technical Details

### Sleep Stage Classification with RR

When respiratory rate data is available from Health Connect:

```
score = (hrScore * 0.5) + (hrvScore * 0.3) + (rrScore * 0.2)
```

When only HR/HRV available:

```
score = (hrScore * 0.6) + (hrvScore * 0.4)
```

### StageProfile Structure (updated)

```typescript
interface StageProfile {
  hrMean: number;
  hrStd: number;
  hrvMean: number;
  hrvStd: number;
  rrMean: number; // NEW: respiratory rate mean
  rrStd: number; // NEW: respiratory rate std dev
  sampleCount: number;
}
```

### Breath Detection Flow

```
sleep.ts:processRmsValue()
  -> peakTimestamps.push(now) when RMS > threshold
  -> analyzeBreathing()
    -> calculates breathsPerMinute from peak intervals
    -> returns BreathingAnalysis with recentBreathTimes, lastBreathTime
  -> notifyBreathingAnalysis(analysis)
    -> MicrophoneTest receives via onBreathingAnalysis callback
      -> triggers breathPulseScale animation if lastBreathTime recent (<500ms)
```

## Key Technical Details

### Breath Detection Flow

```
sleep.ts:processRmsValue()
  -> peakTimestamps.push(now) when RMS > threshold
  -> analyzeBreathing()
    -> calculates breathsPerMinute from peak intervals
    -> returns BreathingAnalysis with recentBreathTimes, lastBreathTime
  -> notifyBreathingAnalysis(analysis)
    -> MicrophoneTest receives via onBreathingAnalysis callback
      -> triggers breathPulseScale animation if lastBreathTime recent (<500ms)
```

### Health Connect Debug Report Structure

```typescript
interface HealthConnectDebugReport {
  status: HealthConnectStatus;
  permissions: PermissionRecord[];
  recordCounts: Record<string, number>; // Counts for all record types
  sampleData: {
    heartRate: HeartRateSample[]; // First 10
    hrv: HRVSample[]; // First 10
    respiratoryRate: RespiratoryRateSample[]; // First 10
    sleepStages: SleepStageSample[]; // First 10
  };
  timestamp: Date;
}
```
