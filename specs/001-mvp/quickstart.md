# Quickstart: Dream Stream MVP

**Feature Branch**: `001-mvp`  
**Date**: 2025-01-10

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- iOS Simulator (Xcode 15+) or Android Emulator (Android Studio)
- Supabase account (free tier)
- Mux account (free tier)

## 1. Clone and Install

```bash
git clone <repo-url>
cd dream-stream
npm install
```

## 2. Configure Environment

Create `.env.local` in project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_MUX_ENV_KEY=your-mux-env-key
```

### Getting Supabase Credentials

1. Go to [supabase.com](https://supabase.com) → Create project
2. Navigate to Settings → API
3. Copy "Project URL" → `EXPO_PUBLIC_SUPABASE_URL`
4. Copy "anon public" key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Getting Mux Credentials

1. Go to [mux.com](https://mux.com) → Create account
2. Navigate to Settings → API Access Tokens
3. Copy "Environment Key" → `EXPO_PUBLIC_MUX_ENV_KEY`

## 3. Setup Database

Run the SQL migrations in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Execute each file in order from `supabase/migrations/`

Or use Supabase CLI:

```bash
npx supabase db push
```

## 4. Seed Content (Optional)

For development, seed the database with sample dreams:

```bash
npm run seed
```

This creates:
- 8 categories (Surreal, Flying, Underwater, etc.)
- 20 sample dreams with Mux test videos
- Demo user account (demo@dreamstream.app / password123)

## 5. Run Development Server

### iOS Simulator

```bash
npm run ios
```

### Android Emulator

```bash
npm run android
```

### Web Browser

```bash
npm run web
```

### Expo Go (Physical Device)

```bash
npm start
```

Scan QR code with Expo Go app.

## 6. Verify Setup

### Health Checks

| Check | Command | Expected |
|-------|---------|----------|
| Supabase connection | Open app, check console | No connection errors |
| Dreams load | Home screen | Dreams appear in feed |
| Auth works | Tap "Sign Up" | Registration form shows |
| Video plays | Tap any dream | Mux player loads |

### Test User Flow

1. Open app → See dream feed (P1: Browse)
2. Tap a dream → Video plays (P1: Experience)
3. Tap "Sign Up" → Create account (P2: Account)
4. Tap heart icon → Dream saved (P2: Favorites)
5. Tap share → Link generated (P3: Share)

## Project Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS Simulator |
| `npm run android` | Run on Android Emulator |
| `npm run web` | Run in browser |
| `npm test` | Run Jest tests |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript check |
| `npm run seed` | Seed database |
| `npm run build:ios` | Build iOS (EAS) |
| `npm run build:android` | Build Android (EAS) |

## Troubleshooting

### "Unable to connect to Supabase"

- Verify `.env.local` exists with correct values
- Check Supabase project is running (not paused)
- Ensure anon key is the PUBLIC key, not service role

### "Video not playing"

- Verify Mux environment key is correct
- Check dream has valid `mux_playback_id`
- Test with Mux test playback ID: `qxb01i6T202018GFS02vp9RIe01icTcDCjVzQpmaB00CUisJ4`

### "Metro bundler crash"

```bash
npm start -- --clear
```

### "iOS build fails"

```bash
cd ios && pod install && cd ..
npm run ios
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Expo (React Native)                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  Pages  │  │Components│  │ Hooks   │  │Services │    │
│  │(Router) │  │   (UI)   │  │ (State) │  │  (API)  │    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
└─────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│       Supabase          │     │          Mux            │
│  ┌─────┐ ┌─────┐       │     │  ┌─────────────────┐   │
│  │ DB  │ │Auth │       │     │  │  Video CDN      │   │
│  └─────┘ └─────┘       │     │  │  HLS Streaming  │   │
│  ┌─────────────────┐   │     │  └─────────────────┘   │
│  │  Edge Functions │   │     │                        │
│  └─────────────────┘   │     │                        │
└─────────────────────────┘     └─────────────────────────┘
```

## Next Steps

After setup is verified:

1. Run `/speckit.tasks` to generate implementation task list
2. Begin with Phase 1 (Setup) tasks
3. Follow task dependencies in `specs/001-mvp/tasks.md`
