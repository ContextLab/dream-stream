# Android Rebuild Plan

**Created**: January 12, 2026  
**Status**: NOT STARTED - Waiting for upstream fixes  
**Last Reset**: Commit `3533898` (chore: remove Android code - nuclear reset)

---

## Prerequisites Before Starting

**DO NOT attempt Android rebuild until:**

1. AGP AAPT2 bug is confirmed fixed (Google Issue Tracker)
2. OR `react-native-screens` releases version compatible with Material <1.13.0
3. OR Expo SDK releases with documented workaround

**Verify by checking:**

- https://github.com/software-mansion/react-native-screens/releases
- https://issuetracker.google.com/issues (search for AAPT2 macro)
- https://expo.dev/changelog

---

## Phase 1: Minimal Android Build (No Features)

### Step 1.1: Generate Fresh Native Files

```bash
# From clean web-only codebase
npx expo prebuild --platform android
```

### Step 1.2: Verify Basic Build

```bash
cd android
./gradlew assembleDebug
```

**Expected**: APK builds successfully with no errors.

**If fails**: STOP. Do not proceed. Document error and wait for fix.

### Step 1.3: Test on Device

```bash
npx expo run:android
```

**Verify:**

- [ ] App launches
- [ ] Navigation works (all tabs)
- [ ] Text renders correctly
- [ ] No crashes

**Commit only after all checks pass.**

---

## Phase 2: Audio Playback

### Step 2.1: Test expo-av

Audio should already work via expo-av (no additional deps needed).

**Test:**

- [ ] Play dream audio
- [ ] Pause/resume
- [ ] Progress bar updates
- [ ] Volume control works

### Step 2.2: Background Audio

Add to `app.json` if needed:

```json
"android": {
  "permissions": ["android.permission.WAKE_LOCK"]
}
```

**Test:**

- [ ] Audio continues when app backgrounded
- [ ] Audio continues when screen off
- [ ] Media notification appears
- [ ] Media controls work from notification

**Commit after verification.**

---

## Phase 3: Haptics

### Step 3.1: Test expo-haptics

Should work out of box.

**Test:**

- [ ] Haptic feedback on button press (if implemented)
- [ ] Haptic feedback on REM detection (if re-implemented)

**Commit after verification.**

---

## Phase 4: Sleep Detection (Audio-Based)

### Step 4.1: Microphone Permissions

Add to `app.json`:

```json
"android": {
  "permissions": ["android.permission.RECORD_AUDIO"]
}
```

### Step 4.2: Test Audio-Based Sleep Detection

The Web Audio API approach may or may not work on Android React Native.

**Test:**

- [ ] Microphone permission granted
- [ ] Audio capture works
- [ ] Breathing detection runs
- [ ] Sleep stages detected

**If audio-based detection doesn't work on Android:**

- Document the limitation
- Consider native audio capture module
- Or defer to wearable-only detection

**Commit after verification.**

---

## Phase 5: Health Connect (HIGH RISK)

**WARNING**: This is what broke the build originally. Proceed with extreme caution.

### Step 5.1: Check Dependency Chain

Before adding Health Connect, verify:

```bash
# Check what version of Material react-native-screens requires
npm info react-native-screens peerDependencies
npm info react-native-screens dependencies

# Check if Health Connect has been updated
npm info expo-health-connect version
npm info react-native-health-connect version
```

### Step 5.2: Add Dependencies ONE AT A TIME

```bash
# First, add expo-health-connect ONLY
npm install expo-health-connect

# Rebuild
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleDebug
```

**If fails**: STOP. Remove the dependency. Document the error.

```bash
# Only if previous step succeeded, add react-native-health-connect
npm install react-native-health-connect

# Rebuild
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleDebug
```

**If fails**: STOP. Remove the dependency. Document the error.

### Step 5.3: Add Permissions

Only if builds succeed:

```json
"android": {
  "permissions": [
    "android.permission.health.READ_HEART_RATE",
    "android.permission.health.READ_HEART_RATE_VARIABILITY",
    "android.permission.health.READ_SLEEP"
  ]
}
```

### Step 5.4: Implement Health Connect Service

Restore from commit `8f942cb`:

- `services/healthConnect.ts`
- `hooks/useHealthConnect.ts`

### Step 5.5: Test Health Connect

- [ ] Permission request dialog appears
- [ ] Permissions granted successfully
- [ ] Can read heart rate data
- [ ] Can read HRV data
- [ ] Can read sleep session data
- [ ] Data appears in app UI

**Commit after full verification.**

---

## Rollback Procedure

If any phase fails and cannot be fixed:

```bash
# Revert to last working commit
git checkout <last-working-commit> -- android/

# Or if android/ doesn't exist in that commit
rm -rf android/
git checkout -- package.json package-lock.json

# Clean install
rm -rf node_modules
npm install
```

---

## Testing Checklist (Full Android)

Before considering Android "complete":

### Core Functionality

- [ ] App launches without crash
- [ ] All tabs navigate correctly
- [ ] Dream list displays
- [ ] Search works
- [ ] Dream detail loads
- [ ] Favorites persist across restart

### Audio

- [ ] Audio plays
- [ ] Background playback works
- [ ] Media notification appears
- [ ] Progress persists

### Sleep Mode

- [ ] Volume setup modal works
- [ ] Microphone calibration works
- [ ] Sleep tracking starts
- [ ] Dream playback during detected REM (if wearable connected)

### Health Connect (if implemented)

- [ ] Permissions granted
- [ ] Wearable data syncs
- [ ] Sleep stages from wearable display
- [ ] REM detection triggers audio

---

## Reference Commits

| Commit    | Description                                                  |
| --------- | ------------------------------------------------------------ |
| `3533898` | Nuclear reset - web-only, no Android code                    |
| `8f942cb` | Last state before nuclear reset (broken but complete config) |
| `0095964` | Android build workarounds attempted (failed)                 |

---

## Contacts / Resources

- **AGP Issue Tracker**: https://issuetracker.google.com/
- **react-native-screens**: https://github.com/software-mansion/react-native-screens
- **Expo Health Connect**: https://docs.expo.dev/versions/latest/sdk/health-connect/
- **Material Components**: https://github.com/material-components/material-components-android

---

_This plan will be updated as upstream fixes become available._
