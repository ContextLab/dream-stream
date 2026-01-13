# Session Notes: 2026-01-13 Android Improvements

## Summary

Major Android improvements session focusing on native audio, sleep stage learning, and UI fixes.

## Completed Tasks

### 1. Bluetooth Microphone Routing (NativeAudioRecorderModule)

- Created new native Android module `NativeAudioRecorderModule.kt`
- Uses `AudioSource.VOICE_COMMUNICATION` instead of expo-av's default source
- Properly routes audio through Bluetooth SCO when connected
- Falls back to phone microphone when no Bluetooth headset

### 2. Immersive Mode (ImmersiveModeModule)

- Created native module for fullscreen immersive mode
- Hides status bar and navigation bar
- Prevents screen saver/clock on Pixel Stand via window flags:
  - FLAG_KEEP_SCREEN_ON
  - FLAG_TURN_SCREEN_ON
  - FLAG_SHOW_WHEN_LOCKED
  - FLAG_DISMISS_KEYGUARD
- Supports screen brightness control

### 3. Sleep Graph Redesign

- 10-second initial X-axis range
- Updates every 250ms
- Continuous line (no markers except current position dot)
- Line color matches sleep stage (transitions in gray)
- Stage order top-to-bottom: Awake, Light, REM, Deep
- 5% growth animation when graph fills up

### 4. Sleep Stage Learning (`sleepStageLearning.ts`)

- Fetches previous night's sleep data from Health Connect (Fitbit sync)
- Clusters HR/HRV measurements by labeled sleep stages
- Creates personalized Gaussian profiles for each stage
- Uses learned model for real-time classification
- Falls back to fixed thresholds if no data available
- Model cached locally, refreshes every 24 hours

### 5. Automatic Gain Control (AGC)

- Normalizes audio levels based on prior 60 seconds
- Target RMS: 0.15
- Gain range: 0.5x to 10x
- Smooth gain transitions (0.95 smoothing factor)
- Shown in MicrophoneTest calibration UI

### 6. Health Connect Vitals Display Fix

- Increased query window from 5 to 60 minutes
- Added real-time polling (10-second interval) when section expanded
- Green dot indicator shows when polling is active
- Auto-starts/stops based on section visibility

## New Files

- `android/app/src/main/java/com/dreamstream/app/ImmersiveModeModule.kt`
- `android/app/src/main/java/com/dreamstream/app/NativeAudioRecorderModule.kt`
- `services/immersiveMode.ts`
- `services/sleepStageLearning.ts`

## Modified Files

- `BluetoothAudioModule.kt` - SCO connection improvements
- `BluetoothAudioPackage.kt` - Registered new modules
- `settings.tsx` - Auto-polling for vitals
- `DarkScreenOverlay.tsx` - Uses immersive mode
- `MicrophoneTest.tsx` - Shows AGC gain
- `SleepStageGraph.tsx` - Complete redesign
- `useHealth.ts` - Added polling functions
- `healthConnect.ts` / `healthKit.ts` - 60-minute query window
- `nativeAudio.ts` - Native recorder integration
- `sleep.ts` - AGC and learning integration
- `vitalsClassifier.ts` - Learning model integration

## Testing

- Android APK: Built and installed successfully
- iOS Simulator: Built and launched successfully (iPhone 17 Pro)
- TypeScript: All checks pass

## Git

- Commit: f867cce
- Pushed to: origin/main

## Next Steps (Future)

1. Test Bluetooth mic on real device with headset
2. Verify sleep stage learning with actual Fitbit data
3. Add UI to show when learned model is active
4. Consider background model refresh overnight
