-- Dream Stream MVP Schema
-- Version: 001
-- Date: 2025-01-10

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(50),
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dreams table
CREATE TABLE IF NOT EXISTS dreams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  thumbnail_url TEXT NOT NULL,
  mux_playback_id VARCHAR(100) NOT NULL,
  mux_asset_id VARCHAR(100) NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dream tags (many-to-many)
CREATE TABLE IF NOT EXISTS dream_tags (
  dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  PRIMARY KEY (dream_id, tag)
);

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, dream_id)
);

-- Playback progress
CREATE TABLE IF NOT EXISTS playback_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, dream_id)
);

-- Wearable devices (P4)
CREATE TABLE IF NOT EXISTS wearable_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_type VARCHAR(50) NOT NULL,
  device_name VARCHAR(100),
  platform_id VARCHAR(200),
  is_connected BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dream launch queue (P4)
CREATE TABLE IF NOT EXISTS dream_launch_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'launched', 'completed', 'cancelled')),
  trigger_mode VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (trigger_mode IN ('auto', 'manual')),
  target_sleep_stage VARCHAR(20) CHECK (target_sleep_stage IN ('rem', 'light', 'deep', 'awake', 'any')),
  launched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dreams_category ON dreams(category_id);
CREATE INDEX IF NOT EXISTS idx_dreams_featured ON dreams(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_dream ON playback_progress(user_id, dream_id);
CREATE INDEX IF NOT EXISTS idx_dream_tags_tag ON dream_tags(tag);
CREATE INDEX IF NOT EXISTS idx_wearables_user ON wearable_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_launch_queue_user_status ON dream_launch_queue(user_id, status) WHERE status IN ('pending', 'ready');

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_dreams_search ON dreams USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_launch_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies: Dreams (public read)
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dreams are publicly readable" ON dreams
  FOR SELECT TO authenticated, anon USING (TRUE);

CREATE POLICY "Categories are publicly readable" ON categories
  FOR SELECT TO authenticated, anon USING (TRUE);

CREATE POLICY "Dream tags are publicly readable" ON dream_tags
  FOR SELECT TO authenticated, anon USING (TRUE);

-- RLS Policies: Favorites
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: Playback Progress
CREATE POLICY "Users can manage own progress" ON playback_progress
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies: Wearable Devices
CREATE POLICY "Users can manage own wearables" ON wearable_devices
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies: Dream Launch Queue
CREATE POLICY "Users can manage own launch queue" ON dream_launch_queue
  FOR ALL USING (auth.uid() = user_id);

-- Function: Search dreams
CREATE OR REPLACE FUNCTION search_dreams(query TEXT, result_limit INTEGER DEFAULT 20)
RETURNS SETOF dreams AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM dreams
  WHERE to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', query)
  ORDER BY ts_rank(to_tsvector('english', title || ' ' || COALESCE(description, '')), plainto_tsquery('english', query)) DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Upsert playback progress
CREATE OR REPLACE FUNCTION upsert_progress(
  p_dream_id UUID,
  p_position_seconds INTEGER,
  p_completed BOOLEAN DEFAULT FALSE
)
RETURNS playback_progress AS $$
DECLARE
  result playback_progress;
BEGIN
  INSERT INTO playback_progress (user_id, dream_id, position_seconds, completed, updated_at)
  VALUES (auth.uid(), p_dream_id, p_position_seconds, p_completed, NOW())
  ON CONFLICT (user_id, dream_id)
  DO UPDATE SET
    position_seconds = EXCLUDED.position_seconds,
    completed = EXCLUDED.completed,
    updated_at = NOW()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
