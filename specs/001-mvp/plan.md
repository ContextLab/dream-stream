# Implementation Plan: Dream Stream MVP

**Branch**: `001-mvp` | **Date**: 2025-01-10 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-mvp/spec.md`

## Summary

Dream Stream is a "Netflix for dreams" application enabling users to discover, preview, and launch immersive dream experiences. The MVP delivers core browse/preview functionality with user accounts and favorites. P4 introduces sleep-stage-aware dream launching via wearable device integration (with manual fallback for MVP).

**Technical Approach**: Cross-platform mobile-first app (Expo/React Native) with managed backend (Supabase) and professional media infrastructure (Mux). Sleep tracking integration uses Health Connect (Android) / HealthKit (iOS) APIs.

## Technical Context

**Language/Version**: TypeScript 5.x (Expo SDK 52+)  
**Primary Dependencies**: Expo, expo-video, react-native-reanimated, NativeWind, Supabase-js, Mux Player, expo-health (HealthKit/Health Connect)  
**Storage**: Supabase (PostgreSQL) for user data; Mux for media assets  
**Testing**: Jest + React Native Testing Library  
**Target Platform**: iOS 15+, Android 10+, Web (responsive - no sleep tracking on web)  
**Project Type**: Mobile-first cross-platform application  
**Performance Goals**: 60fps animations, <3s playback start, <2s search results  
**Constraints**: <100ms perceived response, offline-capable, WCAG 2.1 AA  
**Scale/Scope**: 1,000 concurrent users, 30 dream videos (MVP seed content)  
**Hardware Integration**: Wearable sleep trackers via HealthKit (iOS) / Health Connect (Android); manual launch fallback for MVP

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Verification | Pass |
|-----------|--------------|------|
| **I. Intuitive Experience** | Browse → tap → play (2 steps). Native gestures via Expo. No instructions needed. | [x] |
| **II. Seamless Functionality** | Supabase real-time sync, Mux adaptive bitrate, expo-file-system caching. <100ms API via edge. | [x] |
| **III. Beautiful Interfaces** | NativeWind design system with tokens. Reanimated for 60fps transitions. Dark/light themes planned. | [x] |
| **IV. Cross-Platform Excellence** | Single Expo codebase for iOS/Android/Web. Native player per platform. Offline via file caching. | [x] |
| **V. Effortless Usability** | Core journey: Open → Browse → Play = 2 taps. Favorites = 1 tap. Search = type + results. | [x] |
| **VI. Unwavering Stability** | Jest 80%+ coverage target. Supabase/Mux 99.9% SLA. Graceful offline degradation. | [x] |

## Project Structure

### Documentation (this feature)

```text
specs/001-mvp/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Technology decisions
├── data-model.md        # Entity schemas
├── quickstart.md        # Developer setup guide
├── contracts/           # API specifications
│   └── openapi.yaml     # REST API contract
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
dream-stream/
├── app/                      # Expo Router pages
│   ├── (tabs)/               # Tab navigation
│   │   ├── index.tsx         # Home/Browse feed
│   │   ├── search.tsx        # Search page
│   │   ├── favorites.tsx     # Saved dreams
│   │   └── profile.tsx       # User profile
│   ├── dream/
│   │   ├── [id].tsx          # Dream preview/player screen
│   │   └── launch.tsx        # Dream launch screen (P4)
│   ├── sleep/
│   │   └── index.tsx         # Sleep tracking status (P4)
│   ├── auth/
│   │   ├── login.tsx         # Login form
│   │   └── signup.tsx        # Registration form
│   └── _layout.tsx           # Root layout
│
├── components/               # Reusable UI components
│   ├── ui/                   # Design system primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Text.tsx
│   ├── DreamCard.tsx         # Dream thumbnail card
│   ├── DreamPlayer.tsx       # Video player wrapper
│   ├── DreamFeed.tsx         # Infinite scroll feed
│   └── SearchBar.tsx         # Search input
│
├── services/                 # Business logic & API
│   ├── supabase.ts           # Supabase client
│   ├── mux.ts                # Mux player config
│   ├── dreams.ts             # Dream CRUD operations
│   ├── auth.ts               # Authentication helpers
│   ├── favorites.ts          # Favorites management
│   ├── sleep.ts              # Sleep tracking integration (P4)
│   └── wearable.ts           # Wearable device connection (P4)
│
├── hooks/                    # Custom React hooks
│   ├── useDreams.ts          # Dream data fetching
│   ├── useAuth.ts            # Auth state management
│   ├── useFavorites.ts       # Favorites state
│   ├── usePlaybackProgress.ts # Resume functionality
│   ├── useSleepTracking.ts   # Sleep stage monitoring (P4)
│   └── useWearable.ts        # Wearable connection state (P4)
│
├── lib/                      # Utilities
│   ├── storage.ts            # Async storage wrapper
│   └── constants.ts          # App constants
│
├── theme/                    # Design system
│   ├── tokens.ts             # Color, spacing, typography
│   └── tailwind.config.js    # NativeWind config
│
├── __tests__/                # Test files
│   ├── components/
│   ├── services/
│   └── hooks/
│
├── app.json                  # Expo config
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

**Structure Decision**: Mobile-first Expo app with file-based routing (Expo Router). Services layer abstracts Supabase/Mux integration. Component library follows atomic design principles.

## Complexity Tracking

> No constitution violations requiring justification.

| Aspect | Approach | Rationale |
|--------|----------|-----------|
| State Management | React Context + hooks | Sufficient for MVP scale; Redux unnecessary |
| Media Player | expo-video (native) | Better performance than JS-based players |
| Styling | NativeWind | Tailwind syntax, compiles to native styles |
| Backend | Supabase BaaS | Faster than custom API for MVP |
| Sleep Tracking (P4) | HealthKit/Health Connect via expo-health | Native platform APIs, no custom hardware required |
| Dream Launch (P4) | Manual fallback for MVP | Sleep stage detection is complex; manual trigger ensures feature works without wearable |
