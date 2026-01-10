# dream-stream Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-10

## Active Technologies

- TypeScript 5.x (Expo SDK 52+)
- Expo Router for navigation
- expo-av for audio playback
- react-native-reanimated for animations
- NativeWind/Tailwind for styling
- Supabase-js for backend (currently using mock data)
- Edge TTS for audio generation (CI)

## Project Structure

```text
app/                    # Expo Router screens
  (tabs)/              # Tab navigation
  auth/                # Authentication screens
  dream/               # Dream detail/player screens
  sleep/               # Sleep tracking screen
components/            # React components
  ui/                  # Base UI components
hooks/                 # React hooks
services/              # Business logic & API
lib/                   # Utilities & mock data
theme/                 # Design tokens
types/                 # TypeScript types
scripts/               # Build scripts
supabase/              # Database config
notes/                 # Session notes
```

## Commands

```bash
# Development
npm run web            # Run web dev server
npm run ios            # Run iOS simulator
npm run android        # Run Android emulator
npm run typecheck      # TypeScript check

# Audio Generation
python scripts/generate_audio.py           # Generate all audio
python scripts/generate_audio.py --limit 3 # Generate first 3
python scripts/generate_audio.py --dream dream-1  # Single dream

# Testing
npm test && npm run lint
```

## Code Style

- TypeScript strict mode
- Functional components with hooks
- NativeWind for styling (Tailwind classes)
- Services for business logic, hooks for state management

## Implementation Status (as of 2026-01-10)

### Complete
- US1: Browse/Search (T021-T031)
- US2: Playback core (T032-T038)
- US3: Auth UI (T041, T043-T047, T049)
- US4: Favorites (T050-T053, T055-T056)
- US5: Share core (T057-T059)
- US6: Sleep tracking (T062-T074)
- CI Audio Generation (T102)

### Partial (needs work)
- T039: Offline indicator (not integrated into layout)
- T040: Buffering state (no mid-stream indicator)
- T042: useAuth hook (uses mock data)
- T048: Auth persistence (depends on T042)
- T054: FavoriteButton on DreamCard
- T060: Deep link handler
- T075: HealthKit/Health Connect (stub only)

### Not Started
- T061: Supabase share edge function

## Recent Changes

- 2026-01-10: Added CI audio generation with Edge TTS
- 2026-01-10: Closed 66 completed GitHub issues
- 2026-01-10: Updated documentation and session notes

## Key Files

- `lib/mockData.ts` - Dream narratives with [PAUSE] markers
- `scripts/generate_audio.py` - Edge TTS audio generator
- `.github/workflows/deploy.yml` - CI/CD with audio generation
- `services/` - All backend service integrations

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
