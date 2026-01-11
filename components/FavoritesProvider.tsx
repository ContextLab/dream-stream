import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { storage } from '@/lib/storage';
import { DREAMS } from '@/lib/dreamData';
import type { DreamListItem } from '@/types/database';

interface FavoritesContextValue {
  favorites: DreamListItem[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  toggleFavorite: (dreamId: string) => Promise<void>;
  isFavorited: (dreamId: string) => boolean;
  refresh: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    try {
      const ids = await storage.getFavorites();
      setFavoriteIds(new Set(ids));
    } catch {
      setFavoriteIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const favorites = DREAMS.filter((dream) => favoriteIds.has(dream.id));

  const toggleFavorite = useCallback(
    async (dreamId: string) => {
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

      try {
        if (wasFavorited) {
          await storage.removeFavorite(dreamId);
        } else {
          await storage.addFavorite(dreamId);
        }
      } catch {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorited) {
            next.add(dreamId);
          } else {
            next.delete(dreamId);
          }
          return next;
        });
        throw new Error('Failed to update favorite');
      }
    },
    [favoriteIds]
  );

  const isFavorited = useCallback((dreamId: string) => favoriteIds.has(dreamId), [favoriteIds]);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoriteIds,
        isLoading,
        toggleFavorite,
        isFavorited,
        refresh: loadFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
}
