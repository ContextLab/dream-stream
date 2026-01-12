# Android vs Web Platform Differences

**Created**: January 12, 2026  
**Purpose**: Document all functional differences between Android and Web before nuclear reset

---

## Summary

This document captures all platform-specific functionality in the dream-stream codebase before removing Android support. This will serve as a reference when rebuilding Android from scratch.

---

## 1. Sleep Detection

### Web (WORKING)

- Uses **Web Audio API** (`AudioContext`) + **Meyda** for real-time audio analysis
- Captures microphone via `navigator.mediaDevices.getUserMedia()`
- Extracts breathing patterns from audio features (RMS, spectral centroid)
- Calculates breathing regularity and RRV (respiratory rate variability)
- Infers sleep stages: Awake → Drowsy → Light Sleep → Deep Sleep → REM

### Android (STUB/BROKEN)

- Guard in `services/sleep.ts`: `if (typeof window === 'undefined' || !navigator.mediaDevices) return false`
- Intended to use **Health Connect** for wearable-based vitals
- `services/healthConnect.ts` - reads HR, HRV, SleepSession from Health Connect
- `hooks/useHealthConnect.ts` - gates functionality with `Platform.OS === 'android'`
- **Never actually worked** due to build failures before integration testing

---

## 2. Audio Playback

### Web (WORKING)

- Uses `expo-av` with web-compatible Audio API
- Audio URLs resolved via `window.location.origin`
- Background playback depends on browser policies (may be throttled)
- Volume control via software fading

### Android (PARTIAL)

- `expo-av` configured with `staysActiveInBackground: true`
- `playsInSilentModeIOS: true` (iOS-specific but harmless on Android)
- `services/volume.ts` - `supportsVolumeButtons: true` for native
- Background playback via foreground service (never tested)

---

## 3. Health/Wearable Integration

### Web

- **None** - no wearable integration possible

### Android

- **Health Connect** integration via:
  - `expo-health-connect` (Expo plugin)
  - `react-native-health-connect` (native module)
- Permissions in `AndroidManifest.xml`:
  - `android.permission.health.READ_HEART_RATE`
  - `android.permission.health.READ_HEART_RATE_VARIABILITY`
  - `android.permission.health.READ_SLEEP`
- Rationale activity for permission explanation
- Device metadata for Pixel Watch, Galaxy Watch, Fitbit

### iOS (STUB)

- `services/wearable.ts` - `isHealthKitAvailable()` returns `false`
- HealthKit permissions in `app.json` but not implemented

---

## 4. UI/Styling Differences

### Safe Areas

- `app/(tabs)/_layout.tsx` - manual `tabBarHeight` and `bottomPadding` for web
- Native uses standard safe area insets

### Shadows

- `theme/tokens.ts` - CSS `box-shadow` for web, React Native shadow objects for native
- Android uses `elevation` property

### Fullscreen

- `DarkScreenOverlay.tsx` - uses `document.documentElement.requestFullscreen()` on web
- Native apps are naturally fullscreen

### Haptics

- `expo-haptics` - disabled on web via `Platform.OS !== 'web'` check
- Used for REM detection feedback on native

---

## 5. Storage

### Implementation

- Both use `@react-native-async-storage/async-storage`
- Web: persists to `LocalStorage`
- Native: uses `SQLite` or native file storage

### Functional Behavior

- Identical API, different underlying storage
- Web subject to browser cache clearing

---

## 6. Navigation & Deep Linking

### Deep Links

- `services/share.ts` generates URLs:
  - Native/dev: `exp://` URLs
  - Production web: `https://context-lab.com/dream-stream/`

### Sharing

- Uses native `Share` API
- Web: browser share sheet
- Native: OS share sheet

---

## 7. Platform-Specific Files

### Files to Remove/Stub

| File                               | Android-Specific Content             |
| ---------------------------------- | ------------------------------------ |
| `services/healthConnect.ts`        | Entire file - Android Health Connect |
| `hooks/useHealthConnect.ts`        | Android-only hook                    |
| `services/wearable.ts`             | Health wearable stubs                |
| `components/SleepDebugPanel.tsx`   | Conditional Android wearable UI      |
| `services/share.ts`                | `Platform.select()` for share URLs   |
| `components/DarkScreenOverlay.tsx` | `Platform.select()` for elevation    |

### Files That Work Cross-Platform

- `services/sleep.ts` - works on web (guards native)
- `services/volume.ts` - works everywhere
- `lib/storage.ts` - AsyncStorage abstraction
- All UI components (with minor styling guards)

---

## 8. Dependencies to Remove

### Android-Only NPM Packages

```json
"expo-health-connect": "^0.1.1",
"react-native-health-connect": "^3.5.0",
```

### Native Files (android/ directory)

- Entire `android/` directory
- `android/app/build.gradle` - 182 lines
- `android/app/src/main/java/.../MainActivity.kt`
- `android/app/src/main/java/.../MainApplication.kt`
- `android/app/src/main/AndroidManifest.xml`
- All Gradle configurations

---

## 9. app.json Android Config to Remove

```json
"android": {
  "package": "com.dreamstream.app",
  "adaptiveIcon": { ... },
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false,
  "permissions": [
    "android.permission.INTERNET",
    "android.permission.VIBRATE",
    "android.permission.health.READ_HEART_RATE",
    "android.permission.health.READ_HEART_RATE_VARIABILITY",
    "android.permission.health.READ_SLEEP"
  ]
},
"plugins": [
  "expo-health-connect",
  ["expo-build-properties", { "android": { ... } }]
]
```

---

## 10. Rebuild Strategy

When rebuilding Android support in the future:

1. **Start from clean web-only codebase**
2. **Run `npx expo prebuild --platform android`** to generate fresh native files
3. **Test basic build immediately** - no features added yet
4. **Add features ONE AT A TIME**:
   - Audio playback
   - Background audio
   - Haptics
   - (Future) Health Connect - ONLY after AGP bug is fixed
5. **Test build after EACH addition**
6. **Commit only after local build succeeds**

---

## 11. Known Issues That Caused Build Failure

### Root Cause Chain

1. Added `expo-health-connect` + `react-native-health-connect`
2. These require `react-native-screens@4.19.0` (React Native 0.81 compatibility)
3. `react-native-screens@4.19.0` depends on `com.google.android.material:material:1.13.0`
4. Material 1.13.0 uses M3 Design Tokens with `<macro>` XML tags
5. AGP 8.10-8.14 AAPT2 compiler cannot parse these XML macros
6. Build fails with: `Invalid <color> for given resource value`

### What Was Tried (All Failed)

- Forcing Material 1.6.1-1.12.0 - version conflicts
- Downgrading AGP to 8.6.0 - still fails
- Custom Gradle task to strip `<macro>` tags - didn't work
- EAS cloud builds - same error

### Future Fix

Wait for either:

- AGP fix (Google Issue Tracker)
- `react-native-screens` to support older Material
- Expo SDK update with workaround

---

_Last updated: January 12, 2026_
