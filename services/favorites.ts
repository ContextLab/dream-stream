import { supabase } from './supabase';
import type { Favorite, DreamListItem } from '@/types/database';

export async function getFavorites(userId: string): Promise<DreamListItem[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      id,
      dream_id,
      created_at,
      dream:dreams(
        id,
        title,
        thumbnail_url,
        duration_seconds,
        is_featured,
        category:categories(name, slug, color)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch favorites: ${error.message}`);
  }

  return (data || [])
    .filter((item) => item.dream)
    .map((item) => item.dream as unknown as DreamListItem);
}

export async function addFavorite(userId: string, dreamId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, dream_id: dreamId });

  if (error) {
    if (error.code === '23505') {
      return;
    }
    throw new Error(`Failed to add favorite: ${error.message}`);
  }
}

export async function removeFavorite(userId: string, dreamId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('dream_id', dreamId);

  if (error) {
    throw new Error(`Failed to remove favorite: ${error.message}`);
  }
}

export async function isFavorite(userId: string, dreamId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('dream_id', dreamId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return false;
    }
    throw new Error(`Failed to check favorite: ${error.message}`);
  }

  return !!data;
}

export async function getFavoriteIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('favorites')
    .select('dream_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to fetch favorite IDs: ${error.message}`);
  }

  return new Set((data || []).map((item) => item.dream_id));
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
