import type { DreamListItem } from '@/types/database';
import { DREAMS } from '@/lib/dreamData';
import { storage } from '@/lib/storage';

export async function getFavorites(userId: string): Promise<DreamListItem[]> {
  const favoriteIds = await storage.getFavorites();
  return DREAMS.filter((dream) => favoriteIds.includes(dream.id));
}

export async function addFavorite(userId: string, dreamId: string): Promise<void> {
  await storage.addFavorite(dreamId);
}

export async function removeFavorite(userId: string, dreamId: string): Promise<void> {
  await storage.removeFavorite(dreamId);
}

export async function isFavorite(userId: string, dreamId: string): Promise<boolean> {
  return storage.isFavorite(dreamId);
}

export async function getFavoriteIds(userId: string): Promise<Set<string>> {
  const ids = await storage.getFavorites();
  return new Set(ids);
}

export async function toggleFavorite(
  userId: string,
  dreamId: string,
  currentlyFavorited: boolean
): Promise<boolean> {
  if (currentlyFavorited) {
    await removeFavorite(userId, dreamId);
    return false;
  } else {
    await addFavorite(userId, dreamId);
    return true;
  }
}
