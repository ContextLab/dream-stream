# Android Build Blocker: AGP AAPT2 Color Resource Bug

## Current Status: BLOCKED

The Android build is failing due to a bug in the internal AAPT2 resource compiler. The bug occurs when processing Material library color resources during resource merging.

## Error Message

```
material-1.x.x/res/values/values.xml:xxx:4: Invalid <color> for given resource value.
java.lang.IllegalStateException: Can not extract resource from com.android.aaptcompiler.ParsedResource@...
```

The error occurs on a perfectly valid 6-digit hex color like `#323232`.

## Root Cause Analysis

The bug is in AGP's internal AAPT2 resource compiler. Through extensive testing:

1. **Minimal test apps work**: An Expo SDK 52 test app with react-native-screens builds successfully
2. **Our full project fails**: Same AGP/Gradle/Material versions fail in our main project
3. **The difference**: Unknown - possibly related to resource merge complexity from multiple Expo modules

### Key Finding: react-native-screens Material Dependency

- `react-native-screens@4.19.0` (required for RN 0.81) depends on Material 1.13.0
- Material 1.13.0 includes M3 design tokens that seem to trigger the AAPT2 bug
- Older react-native-screens versions (4.10.0 with Material 1.6.1) are incompatible with RN 0.81

## What Has Been Tried (ALL FAILED)

### Version Combinations Tested

| AGP Version | Gradle Version | Material Version | Result              |
| ----------- | -------------- | ---------------- | ------------------- |
| 8.6.0       | 8.10.2         | 1.6.1            | Invalid color error |
| 8.6.0       | 8.10.2         | 1.9.0            | Invalid color error |
| 8.6.0       | 8.14.3         | 1.6.1            | Invalid color error |
| 8.11.0      | 8.14.3         | 1.13.0           | Invalid color error |

### Workarounds Attempted

1. **AGP Downgrade to 8.6.0** (via build.gradle resolutionStrategy)
   - Successfully forces AGP 8.6.0
   - Still fails with AAPT2 error

2. **Gradle Downgrade to 8.10.2**
   - Still fails

3. **Material Library Downgrade to 1.6.1**
   - Via resolutionStrategy in build.gradle
   - react-native-screens patched to remove M3 API usage
   - Still fails

4. **Resource Compiler Flags**
   - `android.enableAapt2InternalResourceCompiler=false`
   - `android.enableResourceOptimizations=false`
   - `android.disableResourceCompilation=true`
   - None had any effect

5. **stripMaterialMacros Task**
   - Created Gradle task to strip `<macro>` tags from Material AAR
   - Macros are not the issue - valid colors fail

## Current Configuration

The project has these patches applied (in build.gradle):

```groovy
buildscript {
  configurations.classpath {
    resolutionStrategy {
      force 'com.android.tools.build:gradle:8.6.0'
    }
  }
}

configurations.all {
  resolutionStrategy {
    force 'com.google.android.material:material:1.6.1'
  }
}
```

And a patch for react-native-screens (patches/react-native-screens+4.19.0.patch) that:

- Downgrades Material dependency to 1.6.1
- Removes M3-specific API calls (colorSurfaceContainer, badge.text, badge.clearText)

## Remaining Options

### Option 1: EAS Cloud Build (Most Likely to Work)

```bash
eas login
eas build --platform android --profile preview
```

The cloud build environment may not have this bug.

### Option 2: Full SDK 52 Downgrade

A minimal SDK 52 app builds successfully. Full downgrade requires:

- Downgrade expo to ~52.0.0
- Downgrade react-native to 0.76.x
- Downgrade all expo-\* packages
- React 19 → React 18.3 (breaking changes)

### Option 3: Wait for Fix

- Monitor AGP releases for AAPT2 bugfix
- Monitor react-native-screens for Material 1.6.x compatible version that works with RN 0.81

### Option 4: Investigate Resource Merge

The bug only manifests in our full project, not minimal apps. Investigate:

- Which expo module combination triggers it
- If specific resource definitions cause conflicts

## Technical Details

**Current Stack**:

- Expo SDK: 54
- React Native: 0.81.5
- AGP: 8.6.0 (forced, default is 8.11.0)
- Gradle: 8.10.2
- Material: 1.6.1 (forced)
- react-native-screens: 4.19.0 (patched)

**Error Location**:

- Task: `:app:mergeReleaseResources`
- Failing on: `~/.gradle/caches/8.x.x/transforms/.../material-1.x.x/res/values/values.xml`

## Build Commands

```bash
# Clean Gradle transforms cache
rm -rf ~/.gradle/caches/8.*/transforms

# Clean and build
cd android && rm -rf app/build build
cd android && ./gradlew assembleRelease --no-daemon

# With stack trace
cd android && ./gradlew assembleRelease --no-daemon --stacktrace

# EAS build
eas build --platform android --profile preview
```

## Files Modified

- `android/build.gradle` - AGP version force, Material version force
- `android/gradle/wrapper/gradle-wrapper.properties` - Gradle version
- `android/gradle.properties` - Resource compiler flags (ineffective)
- `android/app/build.gradle` - Resolution strategy, stripMaterialMacros task
- `patches/react-native-screens+4.19.0.patch` - Material 1.6.1 compatibility
- `package.json` - Added patch-package, postinstall script

---

_Last updated: 2026-01-12 10:45 AM ET_
