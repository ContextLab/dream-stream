# Android Build Blocker: AGP 8.11 Resource Compiler Bug

## Summary

The Android build is blocked by a bug in Android Gradle Plugin 8.11.0 that causes the internal resource compiler to fail when parsing color values from Material 1.13.0 library.

## Error Message

```
material-1.13.0/res/values/values.xml:364:4: Invalid <color> for given resource value.
java.lang.IllegalStateException: Can not extract resource from com.android.aaptcompiler.ParsedResource@...
```

## Root Cause

AGP 8.11.0 introduced changes to the internal `aaptcompiler` for Android 16/17 features. These changes include stricter validation of `<color>` resources that breaks compatibility with Material 1.13.0's dynamic color attributes.

## SOLUTION: Disable Internal Resource Compiler

Add to `android/gradle.properties`:

```properties
# Disable the new internal AGP resource compiler which has the ParsedResource bug
android.enableAapt2InternalResourceCompiler=false
# Also disable resource optimizations if the above isn't enough
android.enableResourceOptimizations=false
```

## Alternative Solutions

### Downgrade AGP to 8.10.2

In `android/build.gradle`:

```gradle
classpath("com.android.tools.build:gradle:8.10.2")
```

### Force Material 1.12.0

In `android/app/build.gradle`:

```gradle
configurations.all {
    resolutionStrategy {
        force 'com.google.android.material:material:1.12.0'
    }
}
```

## What Was Tried (Before Finding Fix)

1. ✗ AGP 8.11.0 default - FAILS
2. ✗ AGP 8.7.3 + Gradle 8.13 - Same error
3. ✗ AGP 8.6.1 + Gradle 8.9 - Gradle version incompatible
4. ✗ External AAPT2 override - No effect
5. ✗ Force Material 1.4.0 - No effect
6. ✗ Force older appcompat - Same error
7. ✗ EAS local/cloud builds - Same error
8. ✓ `android.enableAapt2InternalResourceCompiler=false` - **FIX FOUND**

## Build Commands

```bash
# After adding gradle.properties fix
cd android && ./gradlew assembleRelease --no-daemon
# APK at: android/app/build/outputs/apk/release/app-release.apk
```

_Last updated: 2026-01-12_
