# DreamStream

**Lucid Dream Induction Through Intelligent Sleep-Aware Audio Prompting**

DreamStream is a cross-platform application that delivers personalized audio "dream prompts" at optimal moments during your sleep cycle. By integrating with fitness trackers and wearables, the app detects sleep stages in real-time and plays soothing, AI-generated audio cues designed to enhance dream recall and induce lucid dreaming.

---

## Overview

DreamStream combines sleep science, wearable technology, and AI-generated audio to create a seamless lucid dreaming experience:

1. **Select Your Prompts** - Choose from curated text/audio prompts or create your own
2. **Sleep with Your Wearable** - The app monitors your sleep stages via fitness trackers
3. **Receive Dream Cues** - Audio prompts play during optimal sleep phases (light sleep/REM)
4. **Share Your Dreams** - Record dreams upon waking; AI transforms them into new prompts
5. **Community Loop** - Shared dreams become prompts for other dreamers

---

## Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| **Web** | Planned | Progressive Web App for prompt management |
| **Android** | Planned | Full companion app + background audio |
| **iOS** | Planned | Full companion app + background audio |
| **WearOS** | Planned | Primary sleep detection device |
| **watchOS** | Planned | Primary sleep detection device |
| **macOS** | Planned | Desktop companion |
| **Windows** | Planned | Desktop companion |
| **Linux (Ubuntu)** | Planned | Desktop companion |

---

## Core Features

### Sleep Stage Detection

DreamStream integrates with multiple sleep tracking sources:

| Source | Sleep Stages | Real-Time Capability | Integration Method |
|--------|--------------|---------------------|-------------------|
| **WearOS (Local)** | Yes (via HRV analysis) | High | Health Services SDK |
| **Apple Watch** | Yes | Near Real-Time | HealthKit Background Delivery |
| **Fitbit** | Yes | Batch (post-sync) | Web API + Webhooks |
| **Garmin** | Yes | High (via SDK) | Connect IQ SDK |
| **Oura Ring** | Yes (5-min intervals) | Batch | REST API + Webhooks |
| **Asleep.ai** | Yes | 5-min intervals | Audio-based SDK (no wearable) |

**Primary Strategy**: Local WearOS/watchOS app using heart rate variability (HRV) analysis for low-latency REM detection.

### Dream Prompt Library

- **Curated Prompts**: Pre-written suggestions for common lucid dreaming techniques
  - Reality checks ("Look at your hands")
  - Dream signs ("You are dreaming")
  - Goal-oriented ("Find the blue door")
- **Custom Prompts**: Users create personalized text prompts
- **Community Prompts**: Anonymized, LLM-refined prompts from shared dreams
- **Emotional Categories**: Prompts tagged by emotional intent (calm, adventurous, introspective)

### AI Audio Generation

Audio is generated using a multi-layer approach:

```
┌─────────────────────────────────────────────────────────────┐
│                     AUDIO PIPELINE                          │
├─────────────────────────────────────────────────────────────┤
│  1. TEXT PROMPT                                             │
│     └─> LLM Enhancement (expand into natural speech)        │
│                                                             │
│  2. VOICE SYNTHESIS                                         │
│     └─> ElevenLabs / Kokoro-82M (soothing, whispered voice) │
│                                                             │
│  3. BACKGROUND MUSIC                                        │
│     └─> Mubert API (procedural ambient generation)          │
│     └─> Binaural beats (Theta/Delta frequencies)            │
│                                                             │
│  4. AUDIO MIXING                                            │
│     └─> FFmpeg sidechain compression (voice ducks music)    │
│     └─> Smooth fade-in/fade-out                             │
│                                                             │
│  5. DELIVERY                                                │
│     └─> Cached locally for offline playback                 │
└─────────────────────────────────────────────────────────────┘
```

**Voice Options**:
- Whispered (Amazon Polly SSML)
- Calm narrator (ElevenLabs "Sleep Specialist")
- Custom cloned voice (user's own voice)

**Music Styles**:
- Ambient pads (432Hz tuning)
- Nature sounds (rain, ocean, forest)
- Binaural beats (configurable frequency)
- Silence with gentle tones

### Dream Recording & Sharing

1. **Voice Recording**: Upon waking, users record their dreams via voice memo
2. **Transcription**: Whisper API converts speech to text
3. **LLM Processing**: Dreams are analyzed and transformed into reusable prompts
4. **Privacy Controls**: Users choose to keep private or share anonymously
5. **Community Pool**: Shared dreams enrich the prompt library for all users

---

## Technical Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   SHARED CORE (KMP)                   │   │
│  │  • Business Logic (Sleep algorithms, prompt mgmt)    │   │
│  │  • Data Layer (SQLDelight, Ktor HTTP client)        │   │
│  │  • Domain Models                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │   MOBILE    │   │   WEARABLE  │   │   DESKTOP   │       │
│  │  (Compose)  │   │   (Native)  │   │   (Compose) │       │
│  │             │   │             │   │             │       │
│  │ Android/iOS │   │ WearOS/     │   │ macOS/Win/  │       │
│  │             │   │ watchOS     │   │ Linux       │       │
│  └─────────────┘   └─────────────┘   └─────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   WEB (Compose Web)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                      BACKEND SERVICES                        │
│  • Audio Generation Service (ElevenLabs, Mubert, FFmpeg)    │
│  • Dream Processing Service (Whisper, LLM)                  │
│  • User Data Sync (Supabase / Firebase)                     │
│  • Push Notifications                                        │
└─────────────────────────────────────────────────────────────┘
```

### Framework Choice: Kotlin Multiplatform (KMP)

**Why KMP?**
- **Native WearOS Support**: Uses official Jetpack Compose for Wear OS
- **Background Reliability**: Native foreground services survive 8-hour sleep sessions
- **Sensor Access**: Direct access to Health Services API for HRV monitoring
- **Code Sharing**: ~80% shared logic across all platforms

### Key Dependencies

| Component | Technology | Purpose |
|-----------|------------|---------|
| **UI Framework** | Compose Multiplatform | Shared UI across platforms |
| **Local Database** | SQLDelight | Offline-first prompt storage |
| **Networking** | Ktor | API communication |
| **Audio Playback** | Media3 (ExoPlayer) | Background audio with media session |
| **Sleep Detection** | Health Services API | WearOS sensor access |
| **TTS** | ElevenLabs / Kokoro-82M | Voice synthesis |
| **Music Gen** | Mubert API | Procedural ambient music |
| **Backend** | Supabase | Auth, database, storage |
| **LLM** | Claude / GPT-4 | Dream-to-prompt transformation |

---

## Sleep Science Background

### Optimal Timing for Dream Prompts

DreamStream targets specific sleep stages for maximum effectiveness:

| Sleep Stage | Brain Waves | Dream Activity | Prompt Strategy |
|-------------|-------------|----------------|-----------------|
| **Light (N1/N2)** | Theta (4-8 Hz) | Hypnagogic imagery | Gentle awareness cues |
| **REM** | Mixed (like waking) | Vivid dreams | Reality check prompts |
| **Deep (N3)** | Delta (0.5-4 Hz) | Minimal | Avoid interruption |

**Timing Algorithm**:
1. Detect transition from Deep → Light sleep
2. Wait 5-10 minutes into REM phase
3. Play prompt at low volume, gradually increasing
4. Fade out if movement detected (to avoid waking user)

### Binaural Beats Integration

Optional frequency entrainment to support lucid dreaming:

| Frequency | Brain State | Use Case |
|-----------|-------------|----------|
| 4 Hz (Theta) | Light sleep, meditation | Pre-sleep relaxation |
| 40 Hz (Gamma) | Lucid dreaming state | During REM prompts |
| 2 Hz (Delta) | Deep sleep | Avoid during prompts |

---

## Privacy & Data Handling

- **Local-First**: All sleep data and recordings stored on-device by default
- **End-to-End Encryption**: Dream recordings encrypted before cloud sync
- **Anonymization**: Shared dreams stripped of identifying information
- **Data Ownership**: Users can export or delete all data at any time
- **No Selling**: User data never sold to third parties

---

## Project Structure

```
dreamstream/
├── shared/                    # KMP shared module
│   ├── src/commonMain/       # Shared business logic
│   ├── src/androidMain/      # Android-specific implementations
│   ├── src/iosMain/          # iOS-specific implementations
│   └── src/desktopMain/      # Desktop-specific implementations
├── android/                   # Android app module
├── ios/                       # iOS app (Xcode project)
├── wearos/                    # WearOS app module
├── watchos/                   # watchOS app (Xcode project)
├── desktop/                   # Desktop app module
├── web/                       # Web app module
├── backend/                   # Backend services
│   ├── audio-service/        # Audio generation pipeline
│   ├── dream-service/        # Dream processing
│   └── api/                  # REST API
└── docs/                      # Documentation
```

---

## Getting Started

### Prerequisites

- JDK 17+
- Android Studio Hedgehog (2023.1.1) or later
- Xcode 15+ (for iOS/watchOS)
- Node.js 18+ (for web tooling)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/dreamstream.git
cd dreamstream

# Build shared module
./gradlew :shared:build

# Run Android app
./gradlew :android:installDebug

# Run Desktop app
./gradlew :desktop:run

# Run Web app
./gradlew :web:jsBrowserDevelopmentRun
```

### Environment Variables

```bash
# API Keys (required for audio generation)
ELEVENLABS_API_KEY=your_key_here
MUBERT_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here  # For Whisper transcription

# Backend
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
```

---

## Roadmap

### Phase 1: Foundation (MVP)
- [ ] Core prompt management (CRUD)
- [ ] Basic audio generation pipeline
- [ ] WearOS sleep detection prototype
- [ ] Android companion app

### Phase 2: Full Mobile
- [ ] iOS companion app
- [ ] watchOS sleep detection
- [ ] Dream recording & transcription
- [ ] Cloud sync

### Phase 3: Intelligence
- [ ] LLM dream-to-prompt transformation
- [ ] Personalized prompt recommendations
- [ ] Sleep quality analytics

### Phase 4: Expansion
- [ ] Desktop apps (macOS, Windows, Linux)
- [ ] Web app
- [ ] Community prompt sharing
- [ ] Advanced audio customization

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas We Need Help

- Sleep science research and algorithm refinement
- Audio DSP and mixing optimization
- WearOS/watchOS native development
- UI/UX design for sleep-focused interfaces
- Accessibility improvements

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Sleep stage detection algorithms inspired by [Ambiq SleepKit](https://github.com/AmbiqAI/sleepkit)
- Lucid dreaming research from the [Lucidity Institute](https://www.lucidity.com/)
- Audio generation powered by [ElevenLabs](https://elevenlabs.io/) and [Mubert](https://mubert.com/)

---

## Contact

- **Project Lead**: Jeremy R. Manning
- **Email**: jeremy@dartmouth.edu

---

*Sweet dreams are made of code.* 
