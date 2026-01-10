export const API_CONFIG = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  MUX_ENV_KEY: process.env.EXPO_PUBLIC_MUX_ENV_KEY ?? '',
} as const;

export const APP_CONFIG = {
  name: 'Dream Stream',
  scheme: 'dreamstream',
  version: '1.0.0',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const PLAYBACK = {
  PROGRESS_SAVE_INTERVAL_MS: 5000,
  COMPLETION_THRESHOLD: 0.9,
  RESUME_THRESHOLD_SECONDS: 10,
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  PLAYBACK_PROGRESS: 'playback_progress',
  LAST_CONNECTED_WEARABLE: 'last_wearable',
  FAVORITES: 'favorites',
  DREAM_HISTORY: 'dream_history',
  TTS_CACHE: 'tts_cache',
} as const;

export const FEATURE_FLAGS = {
  ENABLE_SLEEP_TRACKING: false,
  ENABLE_WEARABLE_INTEGRATION: false,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_ANALYTICS: false,
} as const;

export const ROUTES = {
  HOME: '/(tabs)/',
  SEARCH: '/(tabs)/search',
  FAVORITES: '/(tabs)/favorites',
  PROFILE: '/(tabs)/profile',
  DREAM_DETAIL: '/dream/[id]',
  DREAM_LAUNCH: '/dream/launch',
  SLEEP: '/sleep/',
  AUTH_LOGIN: '/auth/login',
  AUTH_SIGNUP: '/auth/signup',
} as const;

export const MUX_TEST_PLAYBACK_ID = 'qxb01i6T202018GFS02vp9RIe01icTcDCjVzQpmaB00CUisJ4';
