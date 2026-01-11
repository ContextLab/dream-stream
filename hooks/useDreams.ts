import { useState, useEffect, useCallback } from 'react';
import type { DreamListItem, PaginatedResponse } from '@/types/database';
import { getDreams, searchDreams, type DreamListOptions } from '@/services/dreams';

interface UseDreamsState {
  dreams: DreamListItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  page: number;
  totalCount: number;
}

interface UseDreamsReturn extends UseDreamsState {
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useDreams(options: DreamListOptions = {}): UseDreamsReturn {
  const [state, setState] = useState<UseDreamsState>({
    dreams: [],
    isLoading: true,
    isLoadingMore: false,
    error: null,
    hasMore: false,
    page: 1,
    totalCount: 0,
  });

  const fetchDreams = useCallback(
    async (page = 1, append = false) => {
      try {
        setState((prev) => ({
          ...prev,
          isLoading: page === 1 && !append,
          isLoadingMore: page > 1 || append,
          error: null,
        }));

        const result = await getDreams({ ...options, page });

        setState((prev) => ({
          ...prev,
          dreams: append ? [...prev.dreams, ...result.data] : result.data,
          isLoading: false,
          isLoadingMore: false,
          hasMore: result.hasMore,
          page: result.page,
          totalCount: result.count,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isLoadingMore: false,
          error: err instanceof Error ? err : new Error('Failed to fetch dreams'),
        }));
      }
    },
    [JSON.stringify(options)]
  );

  useEffect(() => {
    fetchDreams(1, false);
  }, [fetchDreams]);

  const refresh = useCallback(async () => {
    await fetchDreams(1, false);
  }, [fetchDreams]);

  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.isLoadingMore) return;
    await fetchDreams(state.page + 1, true);
  }, [fetchDreams, state.hasMore, state.isLoadingMore, state.page]);

  return {
    ...state,
    refresh,
    loadMore,
  };
}

interface UseSearchDreamsReturn {
  results: DreamListItem[];
  isSearching: boolean;
  error: Error | null;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

export function useSearchDreams(): UseSearchDreamsReturn {
  const [results, setResults] = useState<DreamListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      const data = await searchDreams(query);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'));
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, isSearching, error, search, clear };
}
