import { useState, useEffect, useCallback } from 'react';
import {
  getFavorites,
  getFavoriteIds,
  toggleFavorite,
  addFavorite,
  removeFavorite,
} from '@/services/favorites';
import { useAuth } from './useAuth';
import type { DreamListItem } from '@/types/database';

interface UseFavoritesReturn {
  favorites: DreamListItem[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  toggleFavorite: (dreamId: string) => Promise<void>;
  isFavorited: (dreamId: string) => boolean;
}

export function useFavorites(): UseFavoritesReturn {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<DreamListItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setFavoriteIds(new Set());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [favList, favIds] = await Promise.all([
        getFavorites(user.id),
        getFavoriteIds(user.id),
      ]);
      setFavorites(favList);
      setFavoriteIds(favIds);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load favorites'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    } else {
      setFavorites([]);
      setFavoriteIds(new Set());
    }
  }, [isAuthenticated, fetchFavorites]);

  const handleToggle = useCallback(
    async (dreamId: string) => {
      if (!user) return;

      const wasFavorited = favoriteIds.has(dreamId);

      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorited) {
          next.delete(dreamId);
        } else {
          next.add(dreamId);
        }
        return next;
      });

      if (wasFavorited) {
        setFavorites((prev) => prev.filter((f) => f.id !== dreamId));
      }

      try {
        await toggleFavorite(user.id, dreamId, wasFavorited);
        if (!wasFavorited) {
          await fetchFavorites();
        }
      } catch (err) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorited) {
            next.add(dreamId);
          } else {
            next.delete(dreamId);
          }
          return next;
        });
        throw err;
      }
    },
    [user, favoriteIds, fetchFavorites]
  );

  const checkFavorited = useCallback(
    (dreamId: string) => favoriteIds.has(dreamId),
    [favoriteIds]
  );

  return {
    favorites,
    favoriteIds,
    isLoading,
    error,
    refresh: fetchFavorites,
    toggleFavorite: handleToggle,
    isFavorited: checkFavorited,
  };
}

export function useFavoriteStatus(dreamId: string) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || !dreamId) {
      setIsFavorited(false);
      return;
    }

    let mounted = true;
    const userId = user.id;

    async function checkStatus() {
      setIsLoading(true);
      try {
        const ids = await getFavoriteIds(userId);
        if (mounted) {
          setIsFavorited(ids.has(dreamId));
        }
      } catch {}
      if (mounted) {
        setIsLoading(false);
      }
    }

    checkStatus();

    return () => {
      mounted = false;
    };
  }, [user, dreamId]);

  const toggle = useCallback(async () => {
    if (!user) return;

    const newState = !isFavorited;
    setIsFavorited(newState);

    try {
      await toggleFavorite(user.id, dreamId, !newState);
    } catch {
      setIsFavorited(!newState);
    }
  }, [user, dreamId, isFavorited]);

  return { isFavorited, isLoading, toggle };
}
