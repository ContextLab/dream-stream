# DreamStream Implementation Plan

This document outlines the phased implementation approach for DreamStream, from MVP to full platform coverage.

---

## Executive Summary

**Timeline**: 12-18 months to full platform coverage  
**Team Size**: 3-5 engineers recommended for MVP  
**Tech Stack**: Kotlin Multiplatform (KMP) + Compose Multiplatform  
**MVP Target**: WearOS + Android companion app with core sleep-prompt loop

---

## Technology Decisions

### Framework: Kotlin Multiplatform (KMP)

**Why KMP over Flutter/React Native?**

| Factor | KMP | Flutter | React Native |
|--------|-----|---------|--------------|
| WearOS Native Support | Excellent | Good | Poor |
| Background Service Reliability | Native | Plugin-dependent | Plugin-dependent |
| Health Services API Access | Direct | Via plugin | Via plugin |
| 8-hour Battery Efficiency | Best | Good | Moderate |
| Code Sharing | ~80% | ~95% | ~80% |

**Decision**: KMP provides the best path for reliable sleep tracking and audio playback on wearables, which is the core differentiator.

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLEAN ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    PRESENTATION LAYER                               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │ │
│  │  │   Android   │  │   WearOS    │  │   iOS       │                │ │
│  │  │   Compose   │  │   Compose   │  │  SwiftUI    │                │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │ │
│  │  │   Desktop   │  │    Web      │  │  watchOS    │                │ │
│  │  │   Compose   │  │   Compose   │  │  SwiftUI    │                │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      DOMAIN LAYER (shared/)                         │ │
│  │  • Use Cases (StartSleepSession, PlayPrompt, RecordDream)         │ │
│  │  • Domain Models (Prompt, SleepSession, Dream, User)              │ │
│  │  • Repository Interfaces                                           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      DATA LAYER (shared/)                           │ │
│  │  • Repository Implementations                                       │ │
│  │  • SQLDelight (Local DB)                                           │ │
│  │  • Ktor (Network)                                                   │ │
│  │  • DataStore (Preferences)                                          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                   PLATFORM LAYER (per-platform)                     │ │
│  │  • Health Services (WearOS)                                        │ │
│  │  • HealthKit (iOS/watchOS)                                         │ │
│  │  • Media3/ExoPlayer (Audio)                                        │ │
│  │  • AVFoundation (iOS Audio)                                        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Backend Services

| Service | Technology | Purpose |
|---------|------------|---------|
| **API Gateway** | Supabase Edge Functions | REST/GraphQL endpoints |
| **Database** | Supabase PostgreSQL | User data, prompts, dreams |
| **Auth** | Supabase Auth | OAuth, email/password |
| **Storage** | Supabase Storage | Audio files, voice recordings |
| **Audio Generation** | Dedicated service (Node/Python) | TTS, music mixing |
| **LLM Processing** | Cloud Functions | Dream-to-prompt transformation |

---

## Phase 1: MVP Foundation (Months 1-4)

### Goal
Functional WearOS + Android app that can:
1. Detect sleep stages on watch
2. Play audio prompts at optimal times
3. Let users manage prompts on phone

### Sprint 1-2: Project Setup & Core Models (Weeks 1-4)

**Deliverables**:
- [ ] KMP project structure with all modules
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Domain models defined
- [ ] SQLDelight schema for local storage
- [ ] Basic Compose UI scaffolding

**Technical Tasks**:
```kotlin
// Domain Models (shared/src/commonMain/)
data class Prompt(
    val id: String,
    val text: String,
    val voiceType: VoiceType,
    val musicType: MusicType,
    val audioUrl: String?,
    val isCustom: Boolean,
    val createdAt: Instant
)

data class SleepSession(
    val id: String,
    val startTime: Instant,
    val endTime: Instant?,
    val stages: List<SleepStage>,
    val promptsPlayed: List<PromptPlayEvent>,
    val status: SessionStatus
)

data class SleepStage(
    val type: StageType, // AWAKE, LIGHT, DEEP, REM
    val startTime: Instant,
    val endTime: Instant,
    val confidence: Float
)
```

**Database Schema**:
```sql
-- SQLDelight: shared/src/commonMain/sqldelight/
CREATE TABLE prompt (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    voice_type TEXT NOT NULL,
    music_type TEXT NOT NULL,
    audio_url TEXT,
    is_custom INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE sleep_session (
    id TEXT PRIMARY KEY,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE sleep_stage (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sleep_session(id),
    stage_type TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    confidence REAL NOT NULL
);
```

### Sprint 3-4: WearOS Sleep Detection (Weeks 5-8)

**Deliverables**:
- [ ] WearOS app with foreground service
- [ ] Health Services integration for heart rate
- [ ] Basic HRV-based sleep stage detection
- [ ] Stage transition events to companion app

**Technical Implementation**:
```kotlin
// wearos/src/main/kotlin/SleepDetectionService.kt
class SleepDetectionService : LifecycleService() {
    
    private lateinit var passiveMonitoringClient: PassiveMonitoringClient
    private val sleepClassifier = HrvSleepClassifier()
    
    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, createNotification())
        
        passiveMonitoringClient = HealthServices
            .getClient(this)
            .passiveMonitoringClient
            
        registerForHeartRateUpdates()
    }
    
    private fun registerForHeartRateUpdates() {
        val config = PassiveListenerConfig.builder()
            .setDataTypes(setOf(DataType.HEART_RATE_BPM))
            .build()
            
        passiveMonitoringClient.setPassiveListenerCallback(
            config,
            object : PassiveListenerCallback() {
                override fun onNewDataPointsReceived(dataPoints: DataPointContainer) {
                    val hrv = calculateHrv(dataPoints)
                    val stage = sleepClassifier.classify(hrv)
                    broadcastStageChange(stage)
                }
            }
        )
    }
}
```

**HRV-Based Classification** (simplified):
```kotlin
class HrvSleepClassifier {
    private val hrvWindow = mutableListOf<Float>()
    private var lastStage = StageType.AWAKE
    
    fun classify(hrvValue: Float): StageType {
        hrvWindow.add(hrvValue)
        if (hrvWindow.size > 30) hrvWindow.removeAt(0) // 5-min window
        
        val avgHrv = hrvWindow.average()
        val hrvVariability = hrvWindow.standardDeviation()
        
        return when {
            avgHrv > 60 && hrvVariability < 10 -> StageType.DEEP
            avgHrv > 50 && hrvVariability > 15 -> StageType.REM
            avgHrv > 40 -> StageType.LIGHT
            else -> StageType.AWAKE
        }
    }
}
```

### Sprint 5-6: Audio Playback System (Weeks 9-12)

**Deliverables**:
- [ ] Media3 integration on Android/WearOS
- [ ] Background audio service
- [ ] Volume ramping (fade in/out)
- [ ] Movement detection to pause playback

**Technical Implementation**:
```kotlin
// android/src/main/kotlin/AudioPlaybackService.kt
@UnstableApi
class AudioPlaybackService : MediaSessionService() {
    
    private var player: ExoPlayer? = null
    private var mediaSession: MediaSession? = null
    
    override fun onCreate() {
        super.onCreate()
        
        player = ExoPlayer.Builder(this)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .build(),
                true // Handle audio focus
            )
            .build()
            
        mediaSession = MediaSession.Builder(this, player!!)
            .build()
    }
    
    fun playPromptWithFade(audioUrl: String, targetVolume: Float = 0.4f) {
        val mediaItem = MediaItem.fromUri(audioUrl)
        player?.apply {
            volume = 0f
            setMediaItem(mediaItem)
            prepare()
            play()
            fadeVolumeTo(targetVolume, durationMs = 10_000)
        }
    }
    
    private fun fadeVolumeTo(target: Float, durationMs: Long) {
        val steps = 50
        val stepDuration = durationMs / steps
        val volumeStep = (target - (player?.volume ?: 0f)) / steps
        
        lifecycleScope.launch {
            repeat(steps) {
                delay(stepDuration)
                player?.volume = (player?.volume ?: 0f) + volumeStep
            }
        }
    }
}
```

### Sprint 7-8: Android Companion App (Weeks 13-16)

**Deliverables**:
- [ ] Prompt library screen
- [ ] Create/edit custom prompts
- [ ] Start sleep session flow
- [ ] Session summary screen
- [ ] Watch-phone communication

**Key Screens**:
```
┌─────────────────────────────────────────┐
│  DreamStream - Home                     │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Tonight's Prompts              │   │
│  │  ┌───┐ ┌───┐ ┌───┐             │   │
│  │  │ 1 │ │ 2 │ │ + │             │   │
│  │  └───┘ └───┘ └───┘             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Quick Stats                    │   │
│  │  Last night: 7h 23m             │   │
│  │  Prompts played: 2              │   │
│  │  Dreams recorded: 1             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ╔═════════════════════════════════╗   │
│  ║      START SLEEP SESSION        ║   │
│  ╚═════════════════════════════════╝   │
│                                         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│  │Home│ │Lib │ │Jrnl│ │ Me │          │
│  └────┘ └────┘ └────┘ └────┘          │
└─────────────────────────────────────────┘
```

**Compose UI**:
```kotlin
@Composable
fun HomeScreen(
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        TonightsPromptsCard(
            prompts = uiState.selectedPrompts,
            onAddClick = { /* navigate to library */ },
            onPromptClick = { /* show prompt detail */ }
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        QuickStatsCard(
            lastSession = uiState.lastSession,
            onClick = { /* navigate to journal */ }
        )
        
        Spacer(modifier = Modifier.weight(1f))
        
        StartSessionButton(
            enabled = uiState.canStartSession,
            watchConnected = uiState.watchConnected,
            onClick = { viewModel.startSession() }
        )
    }
}
```

---

## Phase 2: Audio Generation Pipeline (Months 5-6)

### Goal
Backend service that generates personalized audio prompts combining TTS + background music.

### Sprint 9-10: TTS Integration (Weeks 17-20)

**Deliverables**:
- [ ] ElevenLabs API integration
- [ ] Fallback to Kokoro-82M (open source)
- [ ] Voice style presets (whisper, calm, clone)
- [ ] Audio caching system

**Architecture**:
```
┌─────────────────────────────────────────────────────────────┐
│                   AUDIO GENERATION SERVICE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│   │   Request   │────▶│  TTS Engine │────▶│    Mixer    │  │
│   │   Queue     │     │             │     │             │  │
│   └─────────────┘     └─────────────┘     └─────────────┘  │
│         │                   │                   │           │
│         │                   ▼                   ▼           │
│         │           ┌─────────────┐     ┌─────────────┐    │
│         │           │  ElevenLabs │     │   FFmpeg    │    │
│         │           │  (Primary)  │     │  Sidechain  │    │
│         │           └─────────────┘     └─────────────┘    │
│         │                   │                   │           │
│         │                   ▼                   ▼           │
│         │           ┌─────────────┐     ┌─────────────┐    │
│         │           │  Kokoro-82M │     │   Storage   │    │
│         │           │  (Fallback) │     │  (S3/CDN)   │    │
│         │           └─────────────┘     └─────────────┘    │
│         │                                       │           │
│         └───────────────────────────────────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**API Endpoint**:
```typescript
// backend/audio-service/src/routes/generate.ts
interface GenerateAudioRequest {
  promptText: string;
  voiceType: 'whisper' | 'calm' | 'narrator' | 'custom';
  customVoiceId?: string;
  musicType: 'ambient' | 'nature' | 'binaural' | 'none';
  musicTags?: string[];
  duration?: number; // target duration in seconds
}

interface GenerateAudioResponse {
  audioId: string;
  audioUrl: string;
  duration: number;
  expiresAt: string;
}

app.post('/api/audio/generate', async (req, res) => {
  const { promptText, voiceType, musicType } = req.body;
  
  // 1. Generate TTS
  const voiceAudio = await generateVoice(promptText, voiceType);
  
  // 2. Generate or fetch background music
  const musicAudio = await getBackgroundMusic(musicType);
  
  // 3. Mix with sidechain compression
  const mixedAudio = await mixAudio(voiceAudio, musicAudio);
  
  // 4. Upload to storage
  const audioUrl = await uploadToStorage(mixedAudio);
  
  res.json({ audioId, audioUrl, duration, expiresAt });
});
```

### Sprint 11-12: Music Generation & Mixing (Weeks 21-24)

**Deliverables**:
- [ ] Mubert API integration for procedural music
- [ ] Binaural beat generator
- [ ] FFmpeg mixing pipeline
- [ ] Pre-generated music cache

**Binaural Beat Generator**:
```python
# backend/audio-service/binaural.py
import numpy as np
from scipy.io import wavfile

def generate_binaural_beat(
    base_freq: float = 200,      # Hz
    beat_freq: float = 4,        # Hz (Theta wave)
    duration: float = 60,        # seconds
    sample_rate: int = 44100
) -> np.ndarray:
    """Generate binaural beat audio."""
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Left ear: base frequency
    left = np.sin(2 * np.pi * base_freq * t)
    
    # Right ear: base + beat frequency
    right = np.sin(2 * np.pi * (base_freq + beat_freq) * t)
    
    # Combine to stereo
    stereo = np.stack([left, right], axis=1)
    
    # Normalize and convert to 16-bit
    stereo = (stereo * 32767).astype(np.int16)
    
    return stereo
```

**FFmpeg Mixing Command**:
```bash
# Sidechain compression: music ducks when voice is present
ffmpeg -i voice.wav -i music.wav \
  -filter_complex "[1:a]asplit=2[sc][mix];
    [0:a][sc]sidechaincompress=threshold=0.02:ratio=8:attack=50:release=500[vox];
    [vox][mix]amix=inputs=2:duration=longest:weights=1 0.3[out]" \
  -map "[out]" -ac 2 -ar 44100 output.wav
```

---

## Phase 3: Dream Recording & LLM (Months 7-8)

### Goal
Record dreams via voice, transcribe with Whisper, transform into prompts with LLM.

### Sprint 13-14: Voice Recording (Weeks 25-28)

**Deliverables**:
- [ ] In-app voice recorder
- [ ] Lock screen widget for quick recording
- [ ] Background upload queue
- [ ] Whisper transcription

**Recording Flow**:
```kotlin
@Composable
fun DreamRecorderScreen(
    viewModel: DreamRecorderViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = when (uiState) {
                is RecordingState.Idle -> "Tap to record your dream"
                is RecordingState.Recording -> formatDuration(uiState.duration)
                is RecordingState.Processing -> "Processing..."
            },
            style = MaterialTheme.typography.headlineMedium
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        RecordButton(
            isRecording = uiState is RecordingState.Recording,
            onClick = { 
                if (uiState is RecordingState.Recording) {
                    viewModel.stopRecording()
                } else {
                    viewModel.startRecording()
                }
            }
        )
        
        // Auto-stop on 3 seconds of silence
        LaunchedEffect(uiState) {
            if (uiState is RecordingState.Recording) {
                viewModel.detectSilence { silenceDuration ->
                    if (silenceDuration > 3000) {
                        viewModel.stopRecording()
                    }
                }
            }
        }
    }
}
```

### Sprint 15-16: Dream-to-Prompt LLM (Weeks 29-32)

**Deliverables**:
- [ ] LLM prompt engineering for dream analysis
- [ ] Prompt generation from dream transcripts
- [ ] User refinement interface
- [ ] Batch processing for cost efficiency

**LLM Prompt Template**:
```markdown
You are a lucid dreaming expert analyzing a dream transcript to create 
effective dream prompts.

## Dream Transcript
{transcript}

## Instructions
1. Identify the most vivid or emotionally significant elements
2. Extract recurring themes, locations, or characters
3. Create 2-3 short prompts (under 50 words each) that could trigger 
   recognition of similar dream content
4. Use second-person perspective ("You see...", "You are...")
5. Include sensory details (sight, sound, touch)

## Output Format (JSON)
{
  "themes": ["theme1", "theme2"],
  "prompts": [
    {
      "text": "The prompt text",
      "emotion": "calm|adventurous|mysterious|joyful",
      "elements": ["element1", "element2"]
    }
  ]
}
```

**Processing Service**:
```typescript
// backend/dream-service/src/process.ts
async function processDream(dreamId: string): Promise<ProcessedDream> {
  const dream = await db.getDream(dreamId);
  
  // 1. Transcribe audio (Whisper)
  const transcript = await whisperTranscribe(dream.audioUrl);
  
  // 2. Analyze with LLM
  const analysis = await llm.complete({
    model: 'claude-3-sonnet',
    prompt: DREAM_ANALYSIS_PROMPT.replace('{transcript}', transcript),
    responseFormat: 'json'
  });
  
  // 3. Generate audio for each prompt
  const prompts = await Promise.all(
    analysis.prompts.map(async (p) => ({
      ...p,
      audioUrl: await audioService.generate({
        text: p.text,
        voiceType: 'calm',
        musicType: 'ambient'
      })
    }))
  );
  
  // 4. Save to database
  await db.updateDream(dreamId, { transcript, prompts, status: 'processed' });
  
  return { transcript, prompts };
}
```

---

## Phase 4: iOS & watchOS (Months 9-11)

### Goal
Full iOS and watchOS parity with Android/WearOS.

### Sprint 17-20: iOS App (Weeks 33-40)

**Deliverables**:
- [ ] iOS app with Compose Multiplatform UI
- [ ] HealthKit integration
- [ ] AVFoundation audio playback
- [ ] Background modes configuration
- [ ] App Store submission

**Platform-Specific Implementation**:
```swift
// ios/DreamStream/HealthKitManager.swift
class HealthKitManager: ObservableObject {
    private let healthStore = HKHealthStore()
    
    func requestAuthorization() async throws {
        let readTypes: Set<HKSampleType> = [
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!
        ]
        
        try await healthStore.requestAuthorization(toShare: [], read: readTypes)
    }
    
    func enableBackgroundDelivery() async throws {
        let hrType = HKObjectType.quantityType(forIdentifier: .heartRate)!
        
        try await healthStore.enableBackgroundDelivery(
            for: hrType,
            frequency: .immediate
        )
    }
    
    func observeHeartRate(handler: @escaping (Double) -> Void) {
        let hrType = HKObjectType.quantityType(forIdentifier: .heartRate)!
        
        let query = HKObserverQuery(sampleType: hrType, predicate: nil) { 
            [weak self] _, completion, error in
            
            self?.fetchLatestHeartRate { hr in
                handler(hr)
            }
            completion()
        }
        
        healthStore.execute(query)
    }
}
```

### Sprint 21-22: watchOS App (Weeks 41-44)

**Deliverables**:
- [ ] watchOS standalone app
- [ ] Extended runtime session for sleep
- [ ] Complications
- [ ] Haptic feedback integration

**watchOS Extended Runtime**:
```swift
// watchos/DreamStreamWatch/SleepSessionManager.swift
class SleepSessionManager: NSObject, ObservableObject {
    private var extendedSession: WKExtendedRuntimeSession?
    private var workoutSession: HKWorkoutSession?
    
    func startSleepSession() async throws {
        // Use workout session for long-running background
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .sleep
        
        workoutSession = try HKWorkoutSession(
            healthStore: HKHealthStore(),
            configuration: configuration
        )
        
        workoutSession?.delegate = self
        workoutSession?.startActivity(with: Date())
        
        // Start heart rate monitoring
        await startHeartRateQuery()
    }
    
    func playPromptWithHaptic(audioUrl: URL) {
        // Haptic pattern: gentle tap
        WKInterfaceDevice.current().play(.notification)
        
        // Play audio (requires workout session for background audio)
        let player = AVAudioPlayer(contentsOf: audioUrl)
        player.volume = 0.3
        player.play()
    }
}
```

---

## Phase 5: Desktop & Web (Months 12-14)

### Goal
Full platform coverage with desktop and web apps.

### Sprint 23-26: Desktop Apps (Weeks 45-52)

**Deliverables**:
- [ ] macOS app (Compose Desktop)
- [ ] Windows app (Compose Desktop)
- [ ] Linux app (Compose Desktop)
- [ ] Native system tray integration
- [ ] Audio playback for ambient/focus modes

**Desktop Main**:
```kotlin
// desktop/src/main/kotlin/Main.kt
fun main() = application {
    val windowState = rememberWindowState(
        size = DpSize(1200.dp, 800.dp)
    )
    
    Window(
        onCloseRequest = ::exitApplication,
        state = windowState,
        title = "DreamStream"
    ) {
        // System tray for background operation
        if (isTraySupported) {
            Tray(
                icon = painterResource("icon.png"),
                menu = {
                    Item("Open", onClick = { /* show window */ })
                    Item("Play Ambient", onClick = { /* start ambient */ })
                    Separator()
                    Item("Quit", onClick = ::exitApplication)
                }
            )
        }
        
        DreamStreamApp()
    }
}
```

### Sprint 27-28: Web App (Weeks 53-56)

**Deliverables**:
- [ ] Compose Web PWA
- [ ] Prompt management
- [ ] Community features
- [ ] Dream journal viewer

---

## Phase 6: Community & Polish (Months 15-18)

### Sprint 29-32: Community Features (Weeks 57-64)

**Deliverables**:
- [ ] Anonymous dream sharing
- [ ] Community prompt library
- [ ] Upvoting/curation system
- [ ] Content moderation

### Sprint 33-36: Analytics & ML (Weeks 65-72)

**Deliverables**:
- [ ] Sleep quality analytics
- [ ] Personalized prompt recommendations
- [ ] A/B testing infrastructure
- [ ] ML-based sleep stage improvement

---

## Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| WearOS battery drain | High | Medium | Aggressive optimization, fallback to phone-only |
| Sleep detection inaccuracy | High | Medium | Multiple algorithm approaches, user calibration |
| Audio generation costs | Medium | High | Caching, batch processing, open-source fallbacks |
| App store rejection | High | Low | Early TestFlight/beta testing, compliance review |
| User privacy concerns | High | Medium | Local-first architecture, transparent policies |

---

## Resource Requirements

### Team Composition (MVP)

| Role | Count | Responsibilities |
|------|-------|------------------|
| **Tech Lead** | 1 | Architecture, KMP, WearOS |
| **Mobile Dev** | 1-2 | Android, iOS, Watch apps |
| **Backend Dev** | 1 | Audio pipeline, APIs |
| **ML/Audio** | 0.5 | Sleep algorithms, audio processing |
| **Design** | 0.5 | UI/UX, prototyping |

### Infrastructure Costs (Monthly Estimates)

| Service | MVP | Scale (10k users) |
|---------|-----|-------------------|
| Supabase | $25 | $100 |
| ElevenLabs | $22 | $200 |
| Mubert | $20 | $100 |
| Cloud Functions | $10 | $50 |
| CDN/Storage | $10 | $100 |
| **Total** | **~$87/mo** | **~$550/mo** |

---

## Success Metrics

### MVP Success Criteria
- [ ] 100+ beta testers completing sleep sessions
- [ ] <5% crash rate during overnight sessions
- [ ] 70%+ users report hearing prompts in dreams
- [ ] 4+ star rating in early reviews

### Scale Metrics
- [ ] 10,000 MAU within 6 months of launch
- [ ] 25% D7 retention
- [ ] 3+ dreams recorded per active user per week
- [ ] 50%+ users return after first lucid dream

---

## Appendix: Key Technical Decisions Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| Jan 2026 | KMP over Flutter | Native WearOS performance critical | Flutter (good), RN (poor WearOS) |
| Jan 2026 | SQLDelight over Room | Cross-platform consistency | Room (Android only) |
| Jan 2026 | Supabase over Firebase | PostgreSQL flexibility, pricing | Firebase, custom backend |
| Jan 2026 | ElevenLabs primary TTS | Best quality for sleep voices | Amazon Polly, Google TTS |
| Jan 2026 | HRV-based sleep detection | Real-time capability on-device | Cloud API (high latency) |

---

*Document Version: 1.0*  
*Last Updated: January 2026*
