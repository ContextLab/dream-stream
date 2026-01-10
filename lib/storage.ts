import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';
import type { MusicStyle, PlaybackMode } from '@/types/database';

export interface UserPreferences {
  defaultPlaybackMode: PlaybackMode;
  defaultMusicStyle: MusicStyle;
  musicVolume: number;
  voiceVolume: number;
  autoPlayNext: boolean;
  enableMusic: boolean;
  preferredVoice: string | null;
  voiceSpeed: number;
  theme: 'dark' | 'light' | 'system';
}

export interface LocalPlaybackProgress {
  dreamId: string;
  positionSeconds: number;
  completed: boolean;
  playbackMode: PlaybackMode;
  updatedAt: string;
}

export interface DreamHistoryEntry {
  dreamId: string;
  playedAt: string;
  playbackMode: PlaybackMode;
  durationListened: number;
  completed: boolean;
}

export interface TTSCacheEntry {
  dreamId: string;
  playbackMode: PlaybackMode;
  audioUrl: string;
  durationSeconds: number;
  cachedAt: string;
  sizeBytes?: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultPlaybackMode: 'preview',
  defaultMusicStyle: 'ambient',
  musicVolume: 0.3,
  voiceVolume: 0.8,
  autoPlayNext: false,
  enableMusic: true,
  preferredVoice: null,
  voiceSpeed: 0.85,
  theme: 'dark',
};

const MAX_HISTORY_ENTRIES = 100;

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function removeItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export async function clear(): Promise<boolean> {
  try {
    await AsyncStorage.clear();
    return true;
  } catch {
    return false;
  }
}

export async function getPreferences(): Promise<UserPreferences> {
  const stored = await getItem<Partial<UserPreferences>>(STORAGE_KEYS.USER_PREFERENCES);
  return { ...DEFAULT_PREFERENCES, ...stored };
}

export async function setPreferences(prefs: Partial<UserPreferences>): Promise<boolean> {
  const current = await getPreferences();
  return setItem(STORAGE_KEYS.USER_PREFERENCES, { ...current, ...prefs });
}

export async function resetPreferences(): Promise<boolean> {
  return setItem(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_PREFERENCES);
}

export async function getFavorites(): Promise<string[]> {
  const favorites = await getItem<string[]>(STORAGE_KEYS.FAVORITES);
  return favorites ?? [];
}

export async function addFavorite(dreamId: string): Promise<boolean> {
  const favorites = await getFavorites();
  if (favorites.includes(dreamId)) return true;
  return setItem(STORAGE_KEYS.FAVORITES, [...favorites, dreamId]);
}

export async function removeFavorite(dreamId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return setItem(STORAGE_KEYS.FAVORITES, favorites.filter(id => id !== dreamId));
}

export async function isFavorite(dreamId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.includes(dreamId);
}

export async function toggleFavorite(dreamId: string): Promise<boolean> {
  const favorites = await getFavorites();
  if (favorites.includes(dreamId)) {
    return removeFavorite(dreamId);
  } else {
    return addFavorite(dreamId);
  }
}

export async function getPlaybackProgress(dreamId: string): Promise<LocalPlaybackProgress | null> {
  const allProgress = await getItem<Record<string, LocalPlaybackProgress>>(STORAGE_KEYS.PLAYBACK_PROGRESS);
  return allProgress?.[dreamId] ?? null;
}

export async function setPlaybackProgress(progress: LocalPlaybackProgress): Promise<boolean> {
  const allProgress = await getItem<Record<string, LocalPlaybackProgress>>(STORAGE_KEYS.PLAYBACK_PROGRESS) ?? {};
  allProgress[progress.dreamId] = {
    ...progress,
    updatedAt: new Date().toISOString(),
  };
  return setItem(STORAGE_KEYS.PLAYBACK_PROGRESS, allProgress);
}

export async function clearPlaybackProgress(dreamId: string): Promise<boolean> {
  const allProgress = await getItem<Record<string, LocalPlaybackProgress>>(STORAGE_KEYS.PLAYBACK_PROGRESS) ?? {};
  delete allProgress[dreamId];
  return setItem(STORAGE_KEYS.PLAYBACK_PROGRESS, allProgress);
}

export async function getAllPlaybackProgress(): Promise<Record<string, LocalPlaybackProgress>> {
  return await getItem<Record<string, LocalPlaybackProgress>>(STORAGE_KEYS.PLAYBACK_PROGRESS) ?? {};
}

export async function getDreamHistory(): Promise<DreamHistoryEntry[]> {
  return await getItem<DreamHistoryEntry[]>(STORAGE_KEYS.DREAM_HISTORY) ?? [];
}

export async function addToHistory(entry: Omit<DreamHistoryEntry, 'playedAt'>): Promise<boolean> {
  const history = await getDreamHistory();
  const newEntry: DreamHistoryEntry = {
    ...entry,
    playedAt: new Date().toISOString(),
  };
  const updatedHistory = [newEntry, ...history].slice(0, MAX_HISTORY_ENTRIES);
  return setItem(STORAGE_KEYS.DREAM_HISTORY, updatedHistory);
}

export async function clearHistory(): Promise<boolean> {
  return setItem(STORAGE_KEYS.DREAM_HISTORY, []);
}

export async function getTTSCache(): Promise<Record<string, TTSCacheEntry>> {
  return await getItem<Record<string, TTSCacheEntry>>(STORAGE_KEYS.TTS_CACHE) ?? {};
}

export async function getCachedAudio(dreamId: string, mode: PlaybackMode): Promise<TTSCacheEntry | null> {
  const cache = await getTTSCache();
  const key = `${dreamId}:${mode}`;
  return cache[key] ?? null;
}

export async function setCachedAudio(entry: TTSCacheEntry): Promise<boolean> {
  const cache = await getTTSCache();
  const key = `${entry.dreamId}:${entry.playbackMode}`;
  cache[key] = {
    ...entry,
    cachedAt: new Date().toISOString(),
  };
  return setItem(STORAGE_KEYS.TTS_CACHE, cache);
}

export async function clearTTSCache(): Promise<boolean> {
  return setItem(STORAGE_KEYS.TTS_CACHE, {});
}

export const storage = {
  get: getItem,
  set: setItem,
  remove: removeItem,
  clear,
  getPreferences,
  setPreferences,
  resetPreferences,
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  toggleFavorite,
  getPlaybackProgress,
  setPlaybackProgress,
  clearPlaybackProgress,
  getAllPlaybackProgress,
  getDreamHistory,
  addToHistory,
  clearHistory,
  getTTSCache,
  getCachedAudio,
  setCachedAudio,
  clearTTSCache,
};
