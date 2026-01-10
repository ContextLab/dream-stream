# Data Model: Dream Stream MVP

**Feature Branch**: `001-mvp`  
**Date**: 2025-01-10  
**Database**: Supabase (PostgreSQL)

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │    Dream    │       │  Category   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ email       │       │ title       │       │ name        │
│ display_name│       │ description │       │ slug        │
│ avatar_url  │       │ thumbnail   │       │ icon        │
│ created_at  │       │ mux_playback│       │ color       │
│ updated_at  │       │ duration_sec│       └─────────────┘
└─────────────┘       │ category_id │              │
       │              │ created_at  │              │
       │              │ is_featured │◄─────────────┘
       │              └─────────────┘
       │                     │
       │                     │
       ▼                     ▼
┌─────────────────────────────────┐
│           Favorite              │
├─────────────────────────────────┤
│ id (PK)                         │
│ user_id (FK → User)             │
│ dream_id (FK → Dream)           │
│ created_at                      │
│ UNIQUE(user_id, dream_id)       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│       PlaybackProgress          │
├─────────────────────────────────┤
│ id (PK)                         │
│ user_id (FK → User)             │
│ dream_id (FK → Dream)           │
│ position_sec                    │
│ completed                       │
│ updated_at                      │
│ UNIQUE(user_id, dream_id)       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│          DreamTag               │
├─────────────────────────────────┤
│ dream_id (FK → Dream)           │
│ tag (string)                    │
│ PRIMARY KEY(dream_id, tag)      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│      WearableDevice (P4)        │
├─────────────────────────────────┤
│ id (PK)                         │
│ user_id (FK → User)             │
│ device_type                     │
│ device_name                     │
│ platform_id                     │
│ is_connected                    │
│ last_sync_at                    │
│ created_at                      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│      DreamLaunchQueue (P4)      │
├─────────────────────────────────┤
│ id (PK)                         │
│ user_id (FK → User)             │
│ dream_id (FK → Dream)           │
│ status (pending/launched/...)   │
│ trigger_mode (auto/manual)      │
│ target_sleep_stage              │
│ launched_at                     │
│ created_at                      │
└─────────────────────────────────┘
```

---

## Entity Definitions

### User

Represents a registered user of the platform.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier (Supabase auth.users.id) |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User's email address |
| display_name | VARCHAR(100) | NULL | Optional display name |
| avatar_url | TEXT | NULL | URL to profile image |
| created_at | TIMESTAMP | DEFAULT now() | Account creation time |
| updated_at | TIMESTAMP | DEFAULT now() | Last profile update |

**Notes**:
- `id` references Supabase `auth.users.id` for RLS integration
- Email managed by Supabase Auth; this table stores profile extensions

---

### Dream

A piece of content that users can experience (watch/listen to).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| title | VARCHAR(200) | NOT NULL | Dream title |
| description | TEXT | NULL | Longer description/synopsis |
| thumbnail_url | TEXT | NOT NULL | URL to preview image |
| mux_playback_id | VARCHAR(100) | NOT NULL | Mux playback ID for streaming |
| mux_asset_id | VARCHAR(100) | NOT NULL | Mux asset ID (for management) |
| duration_seconds | INTEGER | NOT NULL | Content duration in seconds |
| category_id | UUID | FK → Category | Primary category |
| is_featured | BOOLEAN | DEFAULT false | Show in featured section |
| created_at | TIMESTAMP | DEFAULT now() | When dream was added |
| view_count | INTEGER | DEFAULT 0 | Total views (for recommendations) |

**Validation Rules**:
- `title` must be 1-200 characters
- `duration_seconds` must be > 0
- `mux_playback_id` must be valid Mux format

---

### Category

Classification for organizing dreams.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| name | VARCHAR(50) | NOT NULL, UNIQUE | Display name ("Flying", "Underwater") |
| slug | VARCHAR(50) | NOT NULL, UNIQUE | URL-safe identifier |
| icon | VARCHAR(50) | NULL | Icon name (lucide icon) |
| color | VARCHAR(7) | NULL | Hex color for UI (#FF5733) |
| sort_order | INTEGER | DEFAULT 0 | Display order |

**Seed Categories** (MVP):
- Surreal, Flying, Underwater, Space, Nature, Lucid, Nightmare, Peaceful

---

### Favorite

Links users to dreams they've saved.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| user_id | UUID | FK → User, NOT NULL | Who favorited |
| dream_id | UUID | FK → Dream, NOT NULL | What was favorited |
| created_at | TIMESTAMP | DEFAULT now() | When favorited |

**Constraints**:
- UNIQUE(user_id, dream_id) - prevent duplicate favorites
- ON DELETE CASCADE for both FKs

---

### PlaybackProgress

Tracks user's position in a dream for resume functionality.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| user_id | UUID | FK → User, NOT NULL | Who was watching |
| dream_id | UUID | FK → Dream, NOT NULL | What was watched |
| position_seconds | INTEGER | NOT NULL, DEFAULT 0 | Current position |
| completed | BOOLEAN | DEFAULT false | Finished watching |
| updated_at | TIMESTAMP | DEFAULT now() | Last position update |

**Constraints**:
- UNIQUE(user_id, dream_id) - one progress record per user/dream
- `position_seconds` must be >= 0 and <= dream.duration_seconds

**State Transitions**:
- New view: Create with position=0, completed=false
- During playback: Update position_seconds
- On completion: Set completed=true, position=duration

---

### DreamTag

Many-to-many relationship for dream tags (for search/filtering).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| dream_id | UUID | FK → Dream, NOT NULL | Tagged dream |
| tag | VARCHAR(50) | NOT NULL | Tag value |

**Constraints**:
- PRIMARY KEY(dream_id, tag)
- Tags are lowercase, alphanumeric with hyphens

**Example Tags**: `relaxing`, `adventure`, `short`, `long-form`, `ai-generated`

---

### WearableDevice (P4)

Represents a connected sleep tracking device for dream launching.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| user_id | UUID | FK → User, NOT NULL | Device owner |
| device_type | VARCHAR(50) | NOT NULL | Type: 'apple_watch', 'fitbit', 'oura', 'garmin', 'generic' |
| device_name | VARCHAR(100) | NULL | User-friendly device name |
| platform_id | VARCHAR(200) | NULL | Platform-specific identifier (HealthKit/Health Connect) |
| is_connected | BOOLEAN | DEFAULT false | Current connection status |
| last_sync_at | TIMESTAMP | NULL | Last successful sleep data sync |
| created_at | TIMESTAMP | DEFAULT now() | When device was linked |

**Notes**:
- One user can have multiple wearable devices
- `device_type` determines which SDK/API to use for sleep data
- `platform_id` is opaque identifier from HealthKit/Health Connect

---

### DreamLaunchQueue (P4)

Queued dreams waiting to be launched during sleep.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| user_id | UUID | FK → User, NOT NULL | Who queued the dream |
| dream_id | UUID | FK → Dream, NOT NULL | Dream to launch |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | Status: 'pending', 'ready', 'launched', 'completed', 'cancelled' |
| trigger_mode | VARCHAR(20) | NOT NULL, DEFAULT 'manual' | 'auto' (sleep-stage) or 'manual' |
| target_sleep_stage | VARCHAR(20) | NULL | Target stage: 'rem', 'light', 'any' (for auto mode) |
| launched_at | TIMESTAMP | NULL | When dream was actually launched |
| created_at | TIMESTAMP | DEFAULT now() | When queued |

**Constraints**:
- Only one 'pending' or 'ready' dream per user at a time
- `target_sleep_stage` required when `trigger_mode` = 'auto'

**State Transitions**:
- Queue: Create with status='pending'
- User ready for sleep: Update to status='ready'
- Sleep stage detected (auto) or manual trigger: Update to status='launched', set launched_at
- Dream completes: Update to status='completed'
- User cancels: Update to status='cancelled'

---

## Row Level Security (RLS) Policies

### Users Table
```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

### Dreams Table
```sql
-- Anyone can read dreams (public content)
CREATE POLICY "Dreams are publicly readable"
  ON dreams FOR SELECT
  TO authenticated, anon
  USING (true);
```

### Favorites Table
```sql
-- Users can only see their own favorites
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to their own favorites
CREATE POLICY "Users can add own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);
```

### PlaybackProgress Table
```sql
-- Users can manage their own progress
CREATE POLICY "Users can manage own progress"
  ON playback_progress FOR ALL
  USING (auth.uid() = user_id);
```

### WearableDevice Table (P4)
```sql
-- Users can only manage their own devices
CREATE POLICY "Users can manage own wearables"
  ON wearable_devices FOR ALL
  USING (auth.uid() = user_id);
```

### DreamLaunchQueue Table (P4)
```sql
-- Users can only manage their own launch queue
CREATE POLICY "Users can manage own launch queue"
  ON dream_launch_queue FOR ALL
  USING (auth.uid() = user_id);
```

---

## Indexes

```sql
-- Fast dream lookup by category
CREATE INDEX idx_dreams_category ON dreams(category_id);

-- Fast featured dreams query
CREATE INDEX idx_dreams_featured ON dreams(is_featured) WHERE is_featured = true;

-- Fast user favorites lookup
CREATE INDEX idx_favorites_user ON favorites(user_id);

-- Fast progress lookup
CREATE INDEX idx_progress_user_dream ON playback_progress(user_id, dream_id);

-- Full-text search on dreams
CREATE INDEX idx_dreams_search ON dreams 
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Tag search
CREATE INDEX idx_dream_tags_tag ON dream_tags(tag);

-- P4: Wearable device lookup
CREATE INDEX idx_wearables_user ON wearable_devices(user_id);

-- P4: Active launch queue lookup
CREATE INDEX idx_launch_queue_user_status ON dream_launch_queue(user_id, status) 
  WHERE status IN ('pending', 'ready');
```

---

## TypeScript Types

```typescript
// types/database.ts

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dream {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string;
  mux_playback_id: string;
  mux_asset_id: string;
  duration_seconds: number;
  category_id: string;
  is_featured: boolean;
  created_at: string;
  view_count: number;
  // Joined fields
  category?: Category;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

export interface Favorite {
  id: string;
  user_id: string;
  dream_id: string;
  created_at: string;
  // Joined fields
  dream?: Dream;
}

export interface PlaybackProgress {
  id: string;
  user_id: string;
  dream_id: string;
  position_seconds: number;
  completed: boolean;
  updated_at: string;
}

export interface DreamTag {
  dream_id: string;
  tag: string;
}

export type DeviceType = 'apple_watch' | 'fitbit' | 'oura' | 'garmin' | 'generic';
export type SleepStage = 'rem' | 'light' | 'deep' | 'awake' | 'any';
export type LaunchStatus = 'pending' | 'ready' | 'launched' | 'completed' | 'cancelled';
export type TriggerMode = 'auto' | 'manual';

export interface WearableDevice {
  id: string;
  user_id: string;
  device_type: DeviceType;
  device_name: string | null;
  platform_id: string | null;
  is_connected: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export interface DreamLaunchQueue {
  id: string;
  user_id: string;
  dream_id: string;
  status: LaunchStatus;
  trigger_mode: TriggerMode;
  target_sleep_stage: SleepStage | null;
  launched_at: string | null;
  created_at: string;
  dream?: Dream;
}
```
