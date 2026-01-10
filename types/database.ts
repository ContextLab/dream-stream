export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type PlaybackMode = 'preview' | 'full' | 'dream';

export type MusicStyle = 
  | 'ambient'
  | 'nature'
  | 'cosmic'
  | 'piano'
  | 'binaural'
  | 'silence';

export interface MusicSettings {
  style: MusicStyle;
  base_intensity: number;
  adaptive: boolean;
}

export interface Dream {
  id: string;
  title: string;
  summary: string;
  content: string;
  artwork_url: string;
  voice_id: string;
  default_music: MusicSettings;
  preview_duration_seconds: number;
  full_duration_seconds: number;
  category_id: string;
  is_featured: boolean;
  created_at: string;
  play_count: number;
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

export type DreamListItem = Pick<
  Dream,
  'id' | 'title' | 'artwork_url' | 'preview_duration_seconds' | 'full_duration_seconds' | 'is_featured'
> & {
  category?: Pick<Category, 'name' | 'slug' | 'color'>;
};

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: string;
}
