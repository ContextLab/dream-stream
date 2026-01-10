# DreamStream User Stories

This document outlines the key user personas and their stories for the DreamStream application.

---

## Personas

### 1. Maya - The Lucid Dreaming Enthusiast
- **Age**: 28
- **Occupation**: Graphic Designer
- **Tech Comfort**: High
- **Devices**: Pixel 8, Pixel Watch 2, MacBook Pro
- **Goal**: Achieve consistent lucid dreams to boost creativity
- **Pain Points**: Inconsistent results with traditional techniques (reality checks, dream journals)

### 2. David - The Sleep Quality Optimizer
- **Age**: 42
- **Occupation**: Software Engineer
- **Tech Comfort**: Very High
- **Devices**: Samsung Galaxy S24, Galaxy Watch 6, Windows Desktop
- **Goal**: Improve sleep quality and reduce nightmares
- **Pain Points**: Recurring stress dreams, difficulty remembering dreams

### 3. Sofia - The Curious Beginner
- **Age**: 22
- **Occupation**: College Student
- **Tech Comfort**: Medium
- **Devices**: iPhone 15, no wearable (considering Apple Watch)
- **Goal**: Try lucid dreaming for the first time
- **Pain Points**: No idea where to start, skeptical but curious

### 4. James - The Meditation Practitioner
- **Age**: 55
- **Occupation**: Retired Teacher
- **Tech Comfort**: Low-Medium
- **Devices**: iPad, Oura Ring
- **Goal**: Extend mindfulness practice into sleep
- **Pain Points**: Finds most apps too complicated

### 5. Aisha - The Community Builder
- **Age**: 31
- **Occupation**: Podcast Host (Dreams & Consciousness)
- **Tech Comfort**: High
- **Devices**: Multiple devices, all platforms
- **Goal**: Share dream experiences, build content from dreams
- **Pain Points**: No good platform for dream sharing

---

## Epic 1: Onboarding & Setup

### US-1.1: First-Time App Launch
**As** Sofia (Curious Beginner)  
**I want** a simple, guided introduction to lucid dreaming and the app  
**So that** I understand what to expect and how to get started  

**Acceptance Criteria**:
- [ ] Welcome screen explains lucid dreaming in 3 sentences or less
- [ ] Optional 2-minute animated explainer video
- [ ] Clear "Get Started" call-to-action
- [ ] Skip option for experienced users
- [ ] No account required to explore basic features

---

### US-1.2: Wearable Connection
**As** Maya (Lucid Dreaming Enthusiast)  
**I want** to connect my Pixel Watch to the app  
**So that** the app can detect my sleep stages  

**Acceptance Criteria**:
- [ ] Auto-detect nearby compatible wearables
- [ ] Step-by-step pairing wizard
- [ ] Permission requests explained in plain language
- [ ] Confirmation when successfully connected
- [ ] Fallback instructions if pairing fails
- [ ] Support for: WearOS, watchOS, Fitbit, Garmin, Oura

---

### US-1.3: No-Wearable Fallback
**As** Sofia (no wearable yet)  
**I want** to use the app without a fitness tracker  
**So that** I can try it before buying additional hardware  

**Acceptance Criteria**:
- [ ] Option to use phone-based sleep detection (Asleep.ai SDK)
- [ ] Manual "I'm going to sleep" / "I woke up" buttons
- [ ] Timer-based prompts (play at X hours after sleep start)
- [ ] Clear explanation of reduced accuracy without wearable
- [ ] Recommendation to upgrade for better experience

---

### US-1.4: Sleep Schedule Configuration
**As** David (Sleep Quality Optimizer)  
**I want** to set my typical sleep schedule  
**So that** the app knows when to activate  

**Acceptance Criteria**:
- [ ] Set bedtime and wake time
- [ ] Configure weekday vs weekend schedules
- [ ] Option for "detect automatically"
- [ ] Quiet hours configuration (no notifications)
- [ ] Timezone handling for travelers

---

## Epic 2: Prompt Management

### US-2.1: Browse Prompt Library
**As** Maya  
**I want** to browse a library of dream prompts  
**So that** I can find ones that resonate with me  

**Acceptance Criteria**:
- [ ] Categorized prompts (Reality Checks, Goals, Exploration, Healing)
- [ ] Filter by emotional tone (calm, adventurous, introspective)
- [ ] Preview prompt text before selecting
- [ ] Audio preview (hear the generated voice)
- [ ] Favorites/bookmarking system
- [ ] Search functionality

---

### US-2.2: Create Custom Prompt
**As** Maya  
**I want** to write my own dream prompt  
**So that** I can focus on specific dream goals  

**Acceptance Criteria**:
- [ ] Text input field (max 500 characters)
- [ ] AI enhancement option ("Make this more dream-like")
- [ ] Voice selection (whisper, calm, my voice)
- [ ] Background music selection
- [ ] Preview generated audio before saving
- [ ] Edit/delete custom prompts

---

### US-2.3: Voice Cloning for Prompts
**As** James (Meditation Practitioner)  
**I want** to hear prompts in my own voice  
**So that** they feel more personal and familiar  

**Acceptance Criteria**:
- [ ] Record 30-second voice sample
- [ ] Clear explanation of how voice data is used
- [ ] Preview cloned voice before confirming
- [ ] Option to delete voice clone at any time
- [ ] Cloned voice used for all custom prompts

---

### US-2.4: Prompt Playlist Creation
**As** David  
**I want** to create a playlist of prompts for a single night  
**So that** I can have variety during my sleep  

**Acceptance Criteria**:
- [ ] Drag-and-drop prompt ordering
- [ ] Set timing (e.g., prompt 1 at first REM, prompt 2 at second REM)
- [ ] Save playlist as template
- [ ] Share playlist with friends
- [ ] Import community playlists

---

## Epic 3: Sleep Session

### US-3.1: Start Sleep Session
**As** Maya  
**I want** to start a sleep session with one tap  
**So that** the app is ready when I go to bed  

**Acceptance Criteria**:
- [ ] Large, obvious "Start Sleep" button
- [ ] Confirm selected prompts before starting
- [ ] Phone enters Do Not Disturb mode (optional)
- [ ] Wearable shows "Sleep Mode Active" confirmation
- [ ] Battery optimization warnings if needed

---

### US-3.2: Real-Time Sleep Monitoring
**As** the DreamStream system  
**I want** to continuously monitor sleep stages  
**So that** I can play prompts at optimal times  

**Acceptance Criteria**:
- [ ] Detect: Awake, Light, Deep, REM stages
- [ ] Update stage every 30 seconds (WearOS) or 5 minutes (phone)
- [ ] Low battery consumption (<5% per night on wearable)
- [ ] Work offline (no internet required during sleep)
- [ ] Log all stage transitions for review

---

### US-3.3: Intelligent Prompt Delivery
**As** Maya  
**I want** prompts to play at the right moments  
**So that** I have the best chance of becoming lucid  

**Acceptance Criteria**:
- [ ] Wait until REM phase detected
- [ ] Delay 5-10 minutes into REM (configurable)
- [ ] Gradual volume fade-in over 10 seconds
- [ ] Pause if movement detected (avoid waking)
- [ ] Resume when stillness returns
- [ ] Maximum prompts per night (configurable, default 3)
- [ ] Minimum time between prompts (default 90 minutes)

---

### US-3.4: Emergency Wake Prevention
**As** David  
**I want** the app to never fully wake me up  
**So that** my sleep quality isn't damaged  

**Acceptance Criteria**:
- [ ] Volume never exceeds 40% of max
- [ ] Immediate fade-out if heart rate spikes
- [ ] Skip prompt if user appears to be waking
- [ ] "Gentle mode" for light sleepers (even quieter)
- [ ] Post-session report on any near-wake events

---

### US-3.5: Morning Session End
**As** Maya  
**I want** the session to end gracefully when I wake up  
**So that** I can immediately record my dreams  

**Acceptance Criteria**:
- [ ] Auto-detect wake-up via movement/heart rate
- [ ] Gentle chime or no sound (configurable)
- [ ] Immediate prompt to record dream
- [ ] Show summary of night's prompts played
- [ ] Smooth transition out of Do Not Disturb

---

## Epic 4: Dream Recording & Processing

### US-4.1: Voice Dream Recording
**As** Maya  
**I want** to record my dream immediately upon waking  
**So that** I capture details before they fade  

**Acceptance Criteria**:
- [ ] One-tap recording from lock screen widget
- [ ] "Keep talking" UI (no stop button needed, auto-detect silence)
- [ ] Works offline (transcribes later)
- [ ] Timestamp each recording
- [ ] Tag with previous night's prompt playlist

---

### US-4.2: Dream Transcription
**As** Maya  
**I want** my voice recordings transcribed to text  
**So that** I can read and search my dream journal  

**Acceptance Criteria**:
- [ ] Automatic transcription within 5 minutes
- [ ] High accuracy (Whisper large model)
- [ ] Speaker diarization (if talking to self)
- [ ] Edit transcription for corrections
- [ ] Keep audio + text linked

---

### US-4.3: Dream-to-Prompt Transformation
**As** Aisha (Community Builder)  
**I want** my recorded dreams to become usable prompts  
**So that** I can revisit dream locations/themes  

**Acceptance Criteria**:
- [ ] LLM analyzes dream transcript
- [ ] Extracts key themes, locations, characters
- [ ] Generates 2-3 prompt suggestions
- [ ] User selects which to save
- [ ] Prompts are concise (under 50 words)
- [ ] Option to refine with AI ("make it more mysterious")

---

### US-4.4: Dream Journal
**As** David  
**I want** to browse all my past dreams  
**So that** I can identify patterns and recurring themes  

**Acceptance Criteria**:
- [ ] Chronological list view
- [ ] Calendar heat map (dreams per night)
- [ ] Search by keyword
- [ ] Filter by lucid/non-lucid
- [ ] Tag dreams manually
- [ ] Export to PDF or Markdown

---

## Epic 5: Audio Customization

### US-5.1: Background Music Selection
**As** James  
**I want** to choose the background music style  
**So that** it matches my preferences  

**Acceptance Criteria**:
- [ ] Preset styles: Ambient, Nature, Binaural, Silence
- [ ] Preview each style
- [ ] Adjust music volume independently of voice
- [ ] Save preferences per prompt or globally

---

### US-5.2: Binaural Beats Configuration
**As** Maya  
**I want** to add binaural beats to my prompts  
**So that** I can experiment with frequency entrainment  

**Acceptance Criteria**:
- [ ] Enable/disable binaural beats
- [ ] Select frequency: 4Hz (Theta), 40Hz (Gamma), Custom
- [ ] Explain what each frequency does
- [ ] Blend with background music
- [ ] Warning about headphone requirement

---

### US-5.3: Generate New Music
**As** Aisha  
**I want** to generate unique background music  
**So that** my prompts feel completely custom  

**Acceptance Criteria**:
- [ ] Describe desired mood in text
- [ ] AI generates 60-second loop
- [ ] Preview before saving
- [ ] Regenerate if not satisfied
- [ ] Save to personal library

---

## Epic 6: Community & Sharing

### US-6.1: Share Dream Anonymously
**As** Aisha  
**I want** to share my dreams with the community  
**So that** others can use them as prompts  

**Acceptance Criteria**:
- [ ] One-tap "Share to Community" button
- [ ] Automatic anonymization (remove names, places)
- [ ] Preview what will be shared before confirming
- [ ] Choose to share: text only, or generated prompt
- [ ] Opt-out of sharing entirely in settings

---

### US-6.2: Browse Community Dreams
**As** Sofia  
**I want** to browse dreams shared by others  
**So that** I can find interesting prompts  

**Acceptance Criteria**:
- [ ] Feed of recent community dreams
- [ ] Upvote/like system
- [ ] Filter by theme/emotion
- [ ] "Use as Prompt" button
- [ ] Report inappropriate content

---

### US-6.3: Follow Dreamers
**As** Aisha  
**I want** to follow other users (optionally)  
**So that** I can see their shared dreams  

**Acceptance Criteria**:
- [ ] Optional public profile
- [ ] Follow/unfollow users
- [ ] Feed of followed users' dreams
- [ ] Privacy: fully opt-in, private by default

---

## Epic 7: Analytics & Insights

### US-7.1: Sleep Quality Dashboard
**As** David  
**I want** to see my sleep quality over time  
**So that** I can track improvements  

**Acceptance Criteria**:
- [ ] Nightly sleep score (0-100)
- [ ] Time in each sleep stage (chart)
- [ ] Week/month/year trends
- [ ] Compare nights with/without prompts
- [ ] Correlation with dream recall

---

### US-7.2: Lucid Dream Tracking
**As** Maya  
**I want** to track my lucid dream frequency  
**So that** I can see if the app is working  

**Acceptance Criteria**:
- [ ] Mark dreams as lucid/non-lucid
- [ ] Track lucid dream streak
- [ ] Graph of lucid dreams over time
- [ ] Which prompts preceded lucid dreams
- [ ] Personalized "what works for you" insights

---

### US-7.3: Prompt Effectiveness Report
**As** Maya  
**I want** to see which prompts lead to lucid dreams  
**So that** I can focus on what works  

**Acceptance Criteria**:
- [ ] List prompts by success rate
- [ ] "Try again" suggestions for unused prompts
- [ ] A/B testing mode (randomly vary prompts)
- [ ] Export data for personal analysis

---

## Epic 8: Settings & Preferences

### US-8.1: Notification Preferences
**As** James  
**I want** to control when the app notifies me  
**So that** I'm not disturbed unnecessarily  

**Acceptance Criteria**:
- [ ] Bedtime reminder (on/off, time)
- [ ] Morning dream recording reminder
- [ ] Weekly summary email (on/off)
- [ ] Community activity notifications (on/off)

---

### US-8.2: Privacy Controls
**As** David  
**I want** full control over my data  
**So that** I feel secure using the app  

**Acceptance Criteria**:
- [ ] View all stored data
- [ ] Export all data (JSON, CSV)
- [ ] Delete all data (with confirmation)
- [ ] Delete individual dreams/recordings
- [ ] Opt-out of analytics
- [ ] Opt-out of community features entirely

---

### US-8.3: Accessibility Settings
**As** James  
**I want** the app to accommodate my needs  
**So that** I can use it comfortably  

**Acceptance Criteria**:
- [ ] Large text mode
- [ ] High contrast mode
- [ ] Screen reader compatibility
- [ ] Haptic feedback options
- [ ] Voice control for key actions

---

## Epic 9: Wearable Experience

### US-9.1: WearOS Standalone Mode
**As** Maya  
**I want** to control sleep sessions from my watch  
**So that** I don't need my phone nearby  

**Acceptance Criteria**:
- [ ] Start/stop session from watch
- [ ] View current sleep stage
- [ ] Adjust volume from watch
- [ ] "Skip this prompt" gesture
- [ ] Works without phone connection

---

### US-9.2: Watch Face Complication
**As** David  
**I want** a watch face complication showing sleep status  
**So that** I can see info at a glance  

**Acceptance Criteria**:
- [ ] Show: "Ready" / "Active" / "Last night: X hours"
- [ ] Tap to open app
- [ ] Battery-efficient updates

---

### US-9.3: Gentle Haptic Wake
**As** Maya  
**I want** the watch to gently vibrate when a prompt plays  
**So that** I have multi-sensory cues  

**Acceptance Criteria**:
- [ ] Optional haptic pattern with prompts
- [ ] Configurable intensity
- [ ] Sync with audio fade-in
- [ ] Disabled by default (opt-in)

---

## Epic 10: Desktop & Web

### US-10.1: Web Prompt Management
**As** Aisha  
**I want** to manage prompts from my computer  
**So that** I can work more efficiently  

**Acceptance Criteria**:
- [ ] Full prompt CRUD on web
- [ ] Sync with mobile in real-time
- [ ] Bulk import/export prompts
- [ ] Community browsing on web

---

### US-10.2: Desktop Sleep Sounds
**As** David  
**I want** to play sleep sounds from my desktop  
**So that** I can use them while napping  

**Acceptance Criteria**:
- [ ] Play background music/binaural beats
- [ ] Timer mode (stop after X minutes)
- [ ] No sleep tracking (desktop can't detect)
- [ ] Works offline

---

### US-10.3: Dream Journal Export
**As** Aisha  
**I want** to export my dream journal as a book  
**So that** I can share or publish it  

**Acceptance Criteria**:
- [ ] Export to PDF with formatting
- [ ] Include/exclude specific date ranges
- [ ] Optional AI-generated chapter summaries
- [ ] Cover page customization

---

## Non-Functional Requirements

### NFR-1: Performance
- App launch in under 2 seconds
- Sleep detection latency < 30 seconds
- Audio playback latency < 100ms
- Wearable battery usage < 5% per 8-hour session

### NFR-2: Reliability
- 99.9% uptime for backend services
- Offline-first: all core features work without internet
- Automatic retry for failed API calls
- Crash-free rate > 99.5%

### NFR-3: Security
- End-to-end encryption for voice recordings
- No plaintext storage of dreams on server
- SOC 2 Type II compliance (future goal)
- GDPR and CCPA compliant

### NFR-4: Accessibility
- WCAG 2.1 AA compliance
- Support for screen readers
- Minimum touch target 48x48dp
- Color contrast ratio > 4.5:1

---

## Story Map Overview

```
                    DISCOVERY    PREPARATION    SLEEP SESSION    MORNING    REFLECTION
                    ─────────    ───────────    ─────────────    ───────    ──────────
MAYA (Enthusiast)   Browse       Create         Monitor          Record     Track
                    prompts      playlist       + play           dream      lucidity
                                                prompts
                                                
DAVID (Optimizer)   Set          Configure      Auto-sleep       Quick      View
                    schedule     audio          detection        note       analytics
                    
SOFIA (Beginner)    Tutorial     Pick           Timer-based      Voice      Learn
                    + explore    preset         (no wearable)    memo       patterns
                    
JAMES (Meditator)   Simple       One            Minimal          Text       Weekly
                    library      prompt         interaction      entry      summary
                    
AISHA (Community)   Community    Curate         Share            Transform  Publish
                    feed         + share        live?            to prompt  journal
```

---

## Priority Matrix

| Priority | Epic | Rationale |
|----------|------|-----------|
| P0 (MVP) | Onboarding, Prompt Mgmt, Sleep Session | Core loop must work |
| P1 | Dream Recording, Audio Customization | Key differentiators |
| P2 | Analytics, Wearable Experience | Retention features |
| P3 | Community, Desktop/Web | Growth features |

---

*Last updated: January 2026*
