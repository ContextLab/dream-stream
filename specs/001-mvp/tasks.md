# Tasks: Dream Stream MVP

**Input**: Design documents from `/specs/001-mvp/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/openapi.yaml, research.md, quickstart.md

**Tests**: Not explicitly requested - tests omitted from task list. Add test tasks if TDD approach desired.

**Organization**: Tasks grouped by user story (P1-P4) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3, US4, US5, US6 (maps to spec.md user stories)
- File paths relative to repository root

## Path Conventions

Expo/React Native project structure:
- `app/` - Expo Router pages
- `components/` - Reusable UI components
- `services/` - Business logic & API clients
- `hooks/` - Custom React hooks
- `lib/` - Utilities
- `theme/` - Design system tokens
- `types/` - TypeScript type definitions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and tooling configuration

- [x] T001 Initialize Expo project with TypeScript template in project root
- [x] T002 Install core dependencies (expo-router, expo-video, react-native-reanimated, nativewind) in package.json
- [x] T003 [P] Configure TypeScript in tsconfig.json
- [x] T004 [P] Configure NativeWind/Tailwind in tailwind.config.js
- [x] T005 [P] Configure ESLint and Prettier in .eslintrc.js and .prettierrc
- [x] T006 Create app.json with Expo configuration (bundle ID, permissions, plugins)
- [x] T007 [P] Create design system tokens in theme/tokens.ts (colors, spacing, typography)
- [x] T008 [P] Create TypeScript types from data model in types/database.ts
- [x] T009 [P] Create app constants in lib/constants.ts (API URLs, feature flags)

**Checkpoint**: Project builds and runs empty shell on iOS/Android/Web

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required by ALL user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T010 Configure Supabase client in services/supabase.ts
- [x] T011 Configure Mux player integration in services/mux.ts
- [x] T012 Create root layout with providers in app/_layout.tsx
- [x] T013 [P] Create Button component in components/ui/Button.tsx
- [x] T014 [P] Create Card component in components/ui/Card.tsx
- [x] T015 [P] Create Input component in components/ui/Input.tsx
- [x] T016 [P] Create Text component in components/ui/Text.tsx
- [x] T017 Create tab navigation layout in app/(tabs)/_layout.tsx
- [x] T018 Setup Supabase database schema (run migrations from data-model.md)
- [x] T019 [P] Create async storage wrapper in lib/storage.ts
- [x] T020 [P] Setup error boundary component in components/ErrorBoundary.tsx

**Checkpoint**: Foundation ready - app runs with navigation shell and Supabase connected

---

## Phase 3: User Story 1 - Browse and Discover Dreams (Priority: P1) 🎯 MVP

**Goal**: Users can browse a curated feed of dreams, search, and filter by category

**Independent Test**: Load app → see dream feed with thumbnails → scroll for more → search → filter by category

### Implementation for User Story 1

- [x] T021 [P] [US1] Create Dream service with list/search/filter methods in services/dreams.ts
- [x] T022 [P] [US1] Create Category service in services/categories.ts
- [x] T023 [US1] Create useDreams hook for dream data fetching in hooks/useDreams.ts
- [x] T024 [US1] Create DreamCard component in components/DreamCard.tsx
- [x] T025 [US1] Create DreamFeed component with infinite scroll in components/DreamFeed.tsx
- [x] T026 [US1] Create SearchBar component in components/SearchBar.tsx
- [x] T027 [US1] Create CategoryFilter component in components/CategoryFilter.tsx
- [x] T028 [US1] Implement home screen with feed in app/(tabs)/index.tsx
- [x] T029 [US1] Implement search screen in app/(tabs)/search.tsx
- [x] T030 [US1] Add empty state for no search results in components/EmptyState.tsx
- [x] T031 [US1] Add loading skeleton for dream cards in components/DreamCardSkeleton.tsx

**Checkpoint**: User Story 1 complete - browse, search, and filter dreams works independently

---

## Phase 4: User Story 2 - Experience a Dream Preview (Priority: P1) 🎯 MVP

**Goal**: Users can tap a dream and watch/listen to immersive preview content with playback controls

**Independent Test**: Tap dream from feed → video loads and plays → controls work → completion shows recommendations

### Implementation for User Story 2

- [x] T032 [P] [US2] Create PlaybackProgress service in services/playback.ts
- [x] T033 [US2] Create usePlaybackProgress hook in hooks/usePlaybackProgress.ts
- [x] T034 [US2] Create DreamPlayer component wrapping Mux player in components/DreamPlayer.tsx
- [x] T035 [US2] Create PlaybackControls component in components/PlaybackControls.tsx
- [x] T036 [US2] Create DreamRecommendations component in components/DreamRecommendations.tsx
- [x] T037 [US2] Implement dream detail/player screen in app/dream/[id].tsx
- [x] T038 [US2] Add playback progress persistence (resume functionality)
- [x] T039 [US2] Add network error handling with offline indicator in components/OfflineIndicator.tsx
- [x] T040 [US2] Add loading state during video buffering

**Checkpoint**: User Stories 1 & 2 complete - core MVP browse + play experience works

---

## Phase 5: User Story 3 - Create an Account (Priority: P2)

**Goal**: Users can sign up and log in with email/password to enable personalization

**Independent Test**: Tap Sign Up → fill form → submit → logged in → return later → log in works

### Implementation for User Story 3

- [x] T041 [P] [US3] Create auth service with signup/login/logout in services/auth.ts
- [x] T042 [US3] Create useAuth hook for auth state management in hooks/useAuth.ts
- [x] T043 [US3] Create AuthProvider context in components/AuthProvider.tsx
- [x] T044 [US3] Create signup form screen in app/auth/signup.tsx
- [x] T045 [US3] Create login form screen in app/auth/login.tsx
- [x] T046 [US3] Create profile screen with logout in app/(tabs)/profile.tsx
- [x] T047 [US3] Add form validation with error messages
- [x] T048 [US3] Add auth state persistence across app restarts
- [x] T049 [US3] Add conditional UI for logged-in vs guest users in navigation

**Checkpoint**: User Story 3 complete - users can create accounts and log in

---

## Phase 6: User Story 4 - Save Favorites (Priority: P2)

**Goal**: Logged-in users can save dreams to favorites and access them from a dedicated screen

**Independent Test**: Log in → view dream → tap favorite → go to favorites tab → see saved dream → unfavorite

### Implementation for User Story 4

- [x] T050 [P] [US4] Create favorites service in services/favorites.ts
- [x] T051 [US4] Create useFavorites hook in hooks/useFavorites.ts
- [x] T052 [US4] Create FavoriteButton component in components/FavoriteButton.tsx
- [x] T053 [US4] Implement favorites tab screen in app/(tabs)/favorites.tsx
- [x] T054 [US4] Add FavoriteButton to DreamCard and dream detail screen
- [x] T055 [US4] Add prompt to log in when guest tries to favorite
- [x] T056 [US4] Add empty state for no favorites

**Checkpoint**: User Story 4 complete - favorites work for logged-in users

---

## Phase 7: User Story 5 - Share a Dream (Priority: P3)

**Goal**: Users can generate shareable links and share dreams via native share sheet

**Independent Test**: View dream → tap share → share sheet appears → copy link → open link → goes to dream

### Implementation for User Story 5

- [x] T057 [P] [US5] Create share service with link generation in services/share.ts
- [x] T058 [US5] Create ShareButton component in components/ShareButton.tsx
- [x] T059 [US5] Add ShareButton to dream detail screen
- [x] T060 [US5] Implement deep link handling for shared URLs in app/_layout.tsx
- [x] T061 [US5] Create share edge function in Supabase for link generation

**Checkpoint**: User Story 5 complete - sharing works with deep links

---

## Phase 8: User Story 6 - Launch a Dream (Priority: P4)

**Goal**: Users can queue a dream and launch it during sleep with audio + haptic patterns

**Independent Test**: Queue dream → mark ready → trigger launch (manual) → audio plays → haptics fire (if wearable connected)

### Implementation for User Story 6

- [x] T062 [P] [US6] Create wearable device service in services/wearable.ts
- [x] T063 [P] [US6] Create sleep tracking service in services/sleep.ts
- [x] T064 [P] [US6] Create dream launch queue service in services/launchQueue.ts
- [x] T065 [US6] Create useWearable hook in hooks/useWearable.ts
- [x] T066 [US6] Create useSleepTracking hook in hooks/useSleepTracking.ts
- [x] T067 [US6] Create useLaunchQueue hook in hooks/useLaunchQueue.ts
- [x] T068 [US6] Create WearableStatus component in components/WearableStatus.tsx
- [x] T069 [US6] Create LaunchQueueCard component in components/LaunchQueueCard.tsx
- [x] T070 [US6] Create SleepModePlayer component (audio + haptics) in components/SleepModePlayer.tsx
- [x] T071 [US6] Implement sleep tracking status screen in app/sleep/index.tsx
- [x] T072 [US6] Implement dream launch screen in app/dream/launch.tsx
- [x] T073 [US6] Add queue dream button to dream detail screen
- [x] T074 [US6] Implement manual launch fallback when no wearable connected
- [x] T075 [US6] Add HealthKit/Health Connect integration via expo-health

**Checkpoint**: User Story 6 complete - dream launching works (manual fallback always available)

---

## Phase 9: UX & Quality Validation

**Purpose**: Verify compliance with Constitution principles before polish

### Principle I: Intuitive Experience
- [x] T076 Verify browse → play completes in 2 taps without instructions
- [x] T077 Validate all error states guide users toward resolution
- [x] T078 Run accessibility audit (WCAG 2.1 AA) on all screens

### Principle II: Seamless Functionality
- [x] T079 Verify playback progress persists across sessions
- [x] T080 Confirm no blocking operations in UI thread (check 60fps)
- [ ] T081 Validate performance budgets (<3s load, <100ms interactions)

### Principle III: Beautiful Interfaces
- [x] T082 Verify design system consistency across all screens
- [x] T083 Confirm visual hierarchy guides attention on each screen
- [x] T084 Implement and validate dark/light theme switching

### Principle IV: Cross-Platform Excellence
- [ ] T085 Test on iOS simulator (iPhone 15 Pro)
- [ ] T086 Test on Android emulator (Pixel 7)
- [ ] T087 Test on web browser (Chrome, Safari)
- [x] T088 Verify offline capability and graceful degradation

### Principle V: Effortless Usability
- [x] T089 Verify all touch targets ≥44pts
- [ ] T090 Test search with typos for typo tolerance
- [ ] T091 Validate keyboard navigation for web

### Principle VI: Unwavering Stability
- [x] T092 Confirm graceful degradation for API failures
- [ ] T093 Validate error tracking configured (Sentry or similar)
- [ ] T094 Verify app doesn't crash on edge cases

**Checkpoint**: All Constitution principles validated

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories

- [x] T095 [P] Seed database with 30 sample dreams (MVP content)
- [x] T096 [P] Add app icons and splash screen
- [x] T097 Performance optimization (lazy loading, memoization)
- [x] T098 [P] Add loading animations with Reanimated
- [x] T099 Security review (RLS policies, API keys not exposed)
- [x] T100 Run quickstart.md validation end-to-end
- [x] T101 Create EAS build configuration for iOS/Android

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ─────────────────────────────────────────────┐
                                                              │
Phase 2 (Foundational) ◄──────────────────────────────────────┘
      │
      ├──► Phase 3 (US1: Browse) ──┐
      │                            │
      ├──► Phase 4 (US2: Preview) ─┼──► Phase 9 (Validation) ──► Phase 10 (Polish)
      │                            │
      ├──► Phase 5 (US3: Account) ─┤
      │          │                 │
      │          ▼                 │
      ├──► Phase 6 (US4: Favorites)┤
      │                            │
      ├──► Phase 7 (US5: Share) ───┤
      │                            │
      └──► Phase 8 (US6: Launch) ──┘
```

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|---------------------|
| US1 (Browse) | Foundational | US2, US3, US5 |
| US2 (Preview) | Foundational | US1, US3, US5 |
| US3 (Account) | Foundational | US1, US2, US5 |
| US4 (Favorites) | US3 (needs auth) | US5, US6 |
| US5 (Share) | Foundational | US1, US2, US3, US4, US6 |
| US6 (Launch) | Foundational | US1, US2, US3, US4, US5 |

### Within Each User Story

1. Services before hooks
2. Hooks before components
3. Components before screens
4. Core features before edge cases

---

## Parallel Execution Examples

### Phase 1 (Setup) - All [P] tasks can run together:
```
T003 Configure TypeScript
T004 Configure NativeWind
T005 Configure ESLint/Prettier
T007 Create design tokens
T008 Create TypeScript types
T009 Create constants
```

### Phase 2 (Foundational) - UI components in parallel:
```
T013 Button component
T014 Card component
T015 Input component
T016 Text component
T019 Storage wrapper
T020 Error boundary
```

### After Phase 2 - User Stories in parallel:
```
Developer A: US1 (Browse) - T021-T031
Developer B: US2 (Preview) - T032-T040
Developer C: US3 (Account) - T041-T049
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Browse)
4. Complete Phase 4: User Story 2 (Preview)
5. **STOP and VALIDATE**: Test browse + play flow
6. Deploy MVP demo

**MVP Scope**: 40 tasks (T001-T040)

### Incremental Delivery

| Milestone | Stories | Tasks | Deliverable |
|-----------|---------|-------|-------------|
| MVP | US1 + US2 | T001-T040 | Browse and play dreams |
| Auth | + US3 | T041-T049 | User accounts |
| Engagement | + US4 | T050-T056 | Favorites |
| Growth | + US5 | T057-T061 | Sharing |
| Vision | + US6 | T062-T075 | Sleep launching |
| Release | Validation + Polish | T076-T101 | Production ready |

---

## Notes

- Total tasks: 101
- [P] marks parallelizable tasks (different files, no dependencies)
- [USn] maps task to user story for traceability
- Each user story independently testable at checkpoint
- MVP = US1 + US2 (40 tasks, browse + preview only)
- US6 (Launch) is P4 - can be deferred post-MVP
