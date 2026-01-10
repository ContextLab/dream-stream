# Wearable Integration Roadmap

Dream Stream aims to support 90%+ of wearables people already own for real-time sleep stage detection.

## Current Implementation (MVP)

**Audio-based sleep detection** using Meyda library:
- Detects breathing patterns via phone microphone
- Estimates sleep stages (awake, drowsy, light, deep, REM)
- No wearable required
- Works in any modern browser

## Wearable Support Strategy

All major wearable platforms use **proprietary protocols** that prevent direct Web Bluetooth access. The solution requires **native companion apps** that bridge wearable data to the web app.

### Architecture

```
[Wearable] <--proprietary--> [Companion App] <--WebSocket/Supabase--> [PWA]
```

The companion app runs on the user's phone and:
1. Connects to the wearable via platform SDK
2. Receives real-time heart rate and movement data
3. Pushes data to a local WebSocket server OR Supabase Realtime
4. PWA subscribes and receives sleep stage updates

## Platform Coverage

| Platform | Market Share | SDK Required | Companion App |
|----------|--------------|--------------|---------------|
| Apple Watch | ~50% | HealthKit + WatchConnectivity | iOS (Swift) |
| WearOS (Samsung, Pixel, etc.) | ~20% | Health Services API | Android (Kotlin) |
| Fitbit | ~10% | Fitbit Web API + OAuth | Web (polling) |
| Garmin | ~8% | Connect IQ SDK | Android/iOS |
| Oura Ring | ~5% | Oura Cloud API | Web (polling) |
| Whoop | ~3% | Whoop API | Web (polling) |
| Amazfit/Zepp | ~2% | Zepp SDK | Android |
| Other | ~2% | Varies | Case-by-case |

## Implementation Phases

### Phase 1: Cloud API Integrations (Easiest)
**Fitbit, Oura, Whoop, Garmin Connect**

These services sync to cloud and expose REST APIs:
- User authenticates via OAuth
- PWA polls for sleep data every 5-15 minutes
- **Limitation**: Not real-time, data arrives after sync

```typescript
// Example: Fitbit integration
const fitbitSleepData = await fetch(
  'https://api.fitbit.com/1.2/user/-/sleep/date/today.json',
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### Phase 2: WearOS Companion App
**Samsung Galaxy Watch, Google Pixel Watch, Fossil, etc.**

Native Kotlin app using Health Services API:

```kotlin
// WearOS companion app pseudocode
val healthClient = HealthServices.getClient(context)
val passiveMonitoringClient = healthClient.passiveMonitoringClient

passiveMonitoringClient.registerDataCallback(
    PassiveListenerConfig.builder()
        .setDataTypes(setOf(DataType.HEART_RATE_BPM))
        .build()
) { dataPoint ->
    // Send to phone app via DataLayer API
    // Phone app forwards to PWA via WebSocket
}
```

### Phase 3: watchOS Companion App  
**Apple Watch**

Native Swift app using HealthKit:

```swift
// watchOS companion app pseudocode
let healthStore = HKHealthStore()
let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!

let query = HKAnchoredObjectQuery(type: heartRateType, predicate: nil, anchor: nil, limit: HKObjectQueryNoLimit) { query, samples, deleted, anchor, error in
    // Send to iPhone app via WatchConnectivity
    // iPhone app forwards to PWA via local WebSocket
}
healthStore.execute(query)
```

### Phase 4: Unified Mobile Bridge App
**React Native app that handles all platforms**

Single codebase that:
- Reads from Health Connect (Android) / HealthKit (iOS)
- Aggregates data from connected wearables
- Runs local WebSocket server for PWA communication
- Handles OAuth for cloud-based wearables

## Data Flow Options

### Option A: Local WebSocket (Privacy-First)
```
Wearable → Phone Companion → Local WebSocket → PWA (same WiFi)
```
- All data stays on local network
- Requires phone and browser on same WiFi
- Lower latency (~100ms)

### Option B: Supabase Realtime (Cloud Sync)
```
Wearable → Phone Companion → Supabase → PWA (anywhere)
```
- Works from any location
- Enables multi-device sync
- Slightly higher latency (~500ms)
- Requires Supabase account (free tier available)

## Sleep Stage Detection from Heart Rate

When we receive HR data from wearables, we can estimate sleep stages:

| Metric | Awake | Light | Deep | REM |
|--------|-------|-------|------|-----|
| Heart Rate | Variable | Low, stable | Lowest | Variable |
| HRV | High | Medium | High | Low |
| Movement | High | Low | Very low | Low |
| Breathing | Irregular | Regular | Very regular | Irregular |

Algorithm:
1. Smooth HR data with rolling average
2. Calculate HRV (RMSSD) over 5-minute windows
3. Detect movement from accelerometer
4. Apply decision tree or ML classifier

## Recommended Implementation Order

1. **MVP (Now)**: Audio-based detection via Meyda
2. **v1.1**: Fitbit/Oura/Whoop OAuth integrations (cloud APIs)
3. **v1.2**: WearOS companion app (Health Services API)
4. **v1.3**: watchOS companion app (HealthKit)
5. **v2.0**: Unified React Native bridge app

## Resources

- [Health Services API (WearOS)](https://developer.android.com/training/wearables/health-services)
- [HealthKit (watchOS)](https://developer.apple.com/documentation/healthkit)
- [Fitbit Web API](https://dev.fitbit.com/build/reference/web-api/)
- [Oura API](https://cloud.ouraring.com/docs/)
- [Garmin Connect IQ](https://developer.garmin.com/connect-iq/)
