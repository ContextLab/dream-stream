# dream_stream

**Lucid Dream Induction Through Intelligent Sleep-Aware Audio Prompting**

dream_stream is a cross-platform application that delivers personalized audio "dream prompts" at optimal moments during your sleep cycle. By integrating with fitness trackers and wearables, the app detects sleep stages in real-time and plays soothing, AI-generated audio cues designed to enhance dream recall and induce lucid dreaming.

---

## Overview

dream_stream combines sleep science, wearable technology, and AI-generated audio to create a seamless lucid dreaming experience:

1. **Select Your Prompts** - Choose from curated text/audio prompts or create your own
2. **Sleep with Your Wearable** - The app monitors your sleep stages via fitness trackers
3. **Receive Dream Cues** - Audio prompts play during optimal sleep phases (light sleep/REM)
4. **Share Your Dreams** - Record dreams upon waking; AI transforms them into new prompts
5. **Community Loop** - Shared dreams become prompts for other dreamers

---

## Platforms

| Platform           | Status      | Notes                                                                        |
| ------------------ | ----------- | ---------------------------------------------------------------------------- |
| **Web**            | **Live**    | PWA at [context-lab.com/dream-stream](https://context-lab.com/dream-stream/) |
| **Android**        | In Progress | Expo-based companion app                                                     |
| **iOS**            | In Progress | Expo-based companion app                                                     |
| **WearOS**         | Planned     | Primary sleep detection device                                               |
| **watchOS**        | Planned     | Primary sleep detection device                                               |
| **macOS**          | Planned     | Desktop companion                                                            |
| **Windows**        | Planned     | Desktop companion                                                            |
| **Linux (Ubuntu)** | Planned     | Desktop companion                                                            |

---

## Core Features

### Sleep Stage Detection

dream_stream integrates with multiple sleep tracking sources:

| Source             | Sleep Stages           | Real-Time Capability | Integration Method            |
| ------------------ | ---------------------- | -------------------- | ----------------------------- |
| **WearOS (Local)** | Yes (via HRV analysis) | High                 | Health Services SDK           |
| **Apple Watch**    | Yes                    | Near Real-Time       | HealthKit Background Delivery |
| **Fitbit**         | Yes                    | Batch (post-sync)    | Web API + Webhooks            |
| **Garmin**         | Yes                    | High (via SDK)       | Connect IQ SDK                |
| **Oura Ring**      | Yes (5-min intervals)  | Batch                | REST API + Webhooks           |
| **Asleep.ai**      | Yes                    | 5-min intervals      | Audio-based SDK (no wearable) |

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

Audio is generated automatically in CI using Edge TTS:

```
┌─────────────────────────────────────────────────────────────┐
│                     AUDIO PIPELINE                          │
├─────────────────────────────────────────────────────────────┤
│  1. DREAM NARRATIVES                                        │
│     └─> Stored in lib/mockData.ts with [PAUSE] markers      │
│                                                             │
│  2. VOICE SYNTHESIS (CI)                                    │
│     └─> Edge TTS (en-US-JennyNeural, -10% rate, -5Hz pitch) │
│     └─> Free, no API keys required                          │
│                                                             │
│  3. AUDIO PROCESSING                                        │
│     └─> FFmpeg for Opus encoding (64kbps)                   │
│     └─> 45-second pause markers for lucid exploration       │
│                                                             │
│  4. CACHING                                                 │
│     └─> GitHub Actions caches based on mockData.ts hash     │
│     └─> Regenerates only when narratives change             │
│                                                             │
│  5. DELIVERY                                                │
│     └─> Served from GitHub Pages                            │
│     └─> public/audio/dreams/{id}_full.opus                  │
└─────────────────────────────────────────────────────────────┘
```

**Current Voice**: `en-US-JennyNeural` - calm, soothing US English voice

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

| Component           | Technology              | Purpose                             |
| ------------------- | ----------------------- | ----------------------------------- |
| **UI Framework**    | Compose Multiplatform   | Shared UI across platforms          |
| **Local Database**  | SQLDelight              | Offline-first prompt storage        |
| **Networking**      | Ktor                    | API communication                   |
| **Audio Playback**  | Media3 (ExoPlayer)      | Background audio with media session |
| **Sleep Detection** | Health Services API     | WearOS sensor access                |
| **TTS**             | ElevenLabs / Kokoro-82M | Voice synthesis                     |
| **Music Gen**       | Mubert API              | Procedural ambient music            |
| **Backend**         | Supabase                | Auth, database, storage             |
| **LLM**             | Claude / GPT-4          | Dream-to-prompt transformation      |

---

## Sleep Science Background

### Optimal Timing for Dream Prompts

dream_stream targets specific sleep stages for maximum effectiveness:

| Sleep Stage       | Brain Waves         | Dream Activity     | Prompt Strategy       |
| ----------------- | ------------------- | ------------------ | --------------------- |
| **Light (N1/N2)** | Theta (4-8 Hz)      | Hypnagogic imagery | Gentle awareness cues |
| **REM**           | Mixed (like waking) | Vivid dreams       | Reality check prompts |
| **Deep (N3)**     | Delta (0.5-4 Hz)    | Minimal            | Avoid interruption    |

**Timing Algorithm**:

1. Detect transition from Deep → Light sleep
2. Wait 5-10 minutes into REM phase
3. Play prompt at low volume, gradually increasing
4. Fade out if movement detected (to avoid waking user)

### Binaural Beats Integration

Optional frequency entrainment to support lucid dreaming:

| Frequency     | Brain State             | Use Case             |
| ------------- | ----------------------- | -------------------- |
| 4 Hz (Theta)  | Light sleep, meditation | Pre-sleep relaxation |
| 40 Hz (Gamma) | Lucid dreaming state    | During REM prompts   |
| 2 Hz (Delta)  | Deep sleep              | Avoid during prompts |

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
dream-stream/
├── app/                       # Expo Router screens
│   ├── (tabs)/               # Tab navigation (home, search, favorites, profile)
│   ├── auth/                 # Login/signup screens
│   ├── dream/                # Dream detail and launch screens
│   └── sleep/                # Sleep tracking screen
├── components/                # React components
│   ├── ui/                   # Base UI (Button, Card, Input, Text)
│   └── *.tsx                 # Feature components (DreamCard, DreamPlayer, etc.)
├── hooks/                     # React hooks (useAuth, useDreams, useFavorites, etc.)
├── services/                  # Business logic and API calls
├── lib/                       # Utilities, constants, and mock data
├── theme/                     # Design system tokens
├── types/                     # TypeScript type definitions
├── scripts/                   # Build scripts (audio generation)
├── supabase/                  # Database migrations and config
├── public/                    # Static assets (audio files)
└── notes/                     # Session notes and documentation
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Python 3.11+ (for audio generation scripts)
- ffmpeg (for audio processing)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ContextLab/dream-stream.git
cd dream-stream

# Install dependencies
npm install

# Run web development server
npm run web

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Type check
npm run typecheck
```

### Audio Generation (Local)

```bash
# Create Python virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install edge-tts

# Generate audio for all dreams
python scripts/generate_audio.py

# Generate audio for specific dream
python scripts/generate_audio.py --dream dream-1

# List available voices
python scripts/generate_audio.py --list-voices
```

### Environment Variables

```bash
# Backend (optional - app works with mock data)
EXPO_PUBLIC_SUPABASE_URL=your_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## Roadmap

### Phase 1: Foundation (MVP) - **In Progress**

- [x] Core dream browsing and search
- [x] Audio playback with progress persistence
- [x] CI-based audio generation (Edge TTS)
- [x] Basic auth UI (login/signup/profile)
- [x] Favorites system
- [x] Sleep tracking UI (audio-based detection)
- [ ] Connect auth to real Supabase backend
- [ ] HealthKit/Health Connect integration

### Phase 2: Full Mobile

- [ ] iOS companion app (Expo)
- [ ] Android companion app (Expo)
- [ ] watchOS sleep detection
- [ ] WearOS sleep detection
- [ ] Push notifications for sleep reminders

### Phase 3: Intelligence

- [ ] LLM dream-to-prompt transformation
- [ ] Personalized prompt recommendations
- [ ] Sleep quality analytics
- [ ] Community dream sharing

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

_Sweet dreams are made of code._
