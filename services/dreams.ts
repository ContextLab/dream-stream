import type { Dream, DreamListItem, PaginatedResponse } from '@/types/database';
import { PAGINATION } from '@/lib/constants';
import {
  DREAMS,
  getDreamById as getLocalDreamById,
  searchDreams as searchLocalDreams,
} from '@/lib/dreamData';

export interface DreamFilters {
  categoryId?: string;
  categorySlugs?: string[];
  tags?: string[];
}

export interface DreamListOptions {
  page?: number;
  pageSize?: number;
  filters?: DreamFilters;
  orderBy?: 'created_at' | 'view_count' | 'title';
  orderDirection?: 'asc' | 'desc';
  favoriteIds?: Set<string>;
}

export async function getDreams(
  options: DreamListOptions = {}
): Promise<PaginatedResponse<DreamListItem>> {
  const { page = 1, pageSize = PAGINATION.DEFAULT_PAGE_SIZE, filters = {}, favoriteIds } = options;

  let filtered = [...DREAMS];

  if (filters.categorySlugs && filters.categorySlugs.length > 0) {
    filtered = filtered.filter(
      (d) => d.category?.slug && filters.categorySlugs!.includes(d.category.slug)
    );
  } else if (filters.categoryId) {
    filtered = filtered.filter((d) => d.category?.slug === filters.categoryId);
  }

  filtered.sort((a, b) => {
    const aIsFavorite = favoriteIds?.has(a.id) ? 0 : 1;
    const bIsFavorite = favoriteIds?.has(b.id) ? 0 : 1;
    if (aIsFavorite !== bIsFavorite) return aIsFavorite - bIsFavorite;

    const aCategoryName = a.category?.name ?? '';
    const bCategoryName = b.category?.name ?? '';
    if (aCategoryName !== bCategoryName) return aCategoryName.localeCompare(bCategoryName);

    return a.title.localeCompare(b.title);
  });

  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const paged = filtered.slice(from, to);

  return {
    data: paged,
    count: filtered.length,
    page,
    pageSize,
    hasMore: filtered.length > page * pageSize,
  };
}

export async function getDreamById(id: string): Promise<Dream | null> {
  return getLocalDreamById(id);
}

export async function searchDreams(
  query: string,
  limit = PAGINATION.DEFAULT_PAGE_SIZE
): Promise<DreamListItem[]> {
  return searchLocalDreams(query).slice(0, limit);
}

export async function incrementViewCount(dreamId: string): Promise<void> {
  // No-op for local storage mode
}

export async function getDreamsByCategory(
  categorySlug: string,
  options: Omit<DreamListOptions, 'filters'> = {}
): Promise<PaginatedResponse<DreamListItem>> {
  return getDreams({
    ...options,
    filters: { categoryId: categorySlug },
  });
}

export async function getRelatedDreams(dreamId: string, limit = 6): Promise<DreamListItem[]> {
  const dream = await getDreamById(dreamId);

  const sameCategoryDreams = dream?.category?.slug
    ? DREAMS.filter((d) => d.category?.slug === dream.category?.slug && d.id !== dreamId)
    : [];

  if (sameCategoryDreams.length >= limit) {
    return sameCategoryDreams.slice(0, limit);
  }

  const otherDreams = DREAMS.filter(
    (d) => d.id !== dreamId && !sameCategoryDreams.some((r) => r.id === d.id)
  ).slice(0, limit - sameCategoryDreams.length);

  return [...sameCategoryDreams, ...otherDreams];
}
