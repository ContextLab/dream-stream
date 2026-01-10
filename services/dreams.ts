import { supabase } from './supabase';
import type { Dream, DreamListItem, Category, PaginatedResponse } from '@/types/database';
import { PAGINATION } from '@/lib/constants';

export interface DreamFilters {
  categoryId?: string;
  isFeatured?: boolean;
  tags?: string[];
}

export interface DreamListOptions {
  page?: number;
  pageSize?: number;
  filters?: DreamFilters;
  orderBy?: 'created_at' | 'view_count' | 'title';
  orderDirection?: 'asc' | 'desc';
}

export async function getDreams(
  options: DreamListOptions = {}
): Promise<PaginatedResponse<DreamListItem>> {
  const {
    page = 1,
    pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
    filters = {},
    orderBy = 'created_at',
    orderDirection = 'desc',
  } = options;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('dreams')
    .select('id, title, thumbnail_url, duration_seconds, is_featured, category:categories(name, slug, color)', { count: 'exact' })
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .range(from, to);

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters.isFeatured !== undefined) {
    query = query.eq('is_featured', filters.isFeatured);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch dreams: ${error.message}`);
  }

  return {
    data: (data as unknown as DreamListItem[]) || [],
    count: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > page * pageSize,
  };
}

export async function getFeaturedDreams(limit = 5): Promise<DreamListItem[]> {
  const { data, error } = await supabase
    .from('dreams')
    .select('id, title, thumbnail_url, duration_seconds, is_featured, category:categories(name, slug, color)')
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch featured dreams: ${error.message}`);
  }

  return (data as unknown as DreamListItem[]) || [];
}

export async function getDreamById(id: string): Promise<Dream | null> {
  const { data, error } = await supabase
    .from('dreams')
    .select('*, category:categories(*), tags:dream_tags(tag)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch dream: ${error.message}`);
  }

  const rawDream = data as Record<string, unknown>;
  const tagsData = rawDream.tags as Array<{ tag: string }> | undefined;
  return {
    ...rawDream,
    tags: tagsData?.map((t) => t.tag) || [],
  } as Dream;
}

export async function searchDreams(
  query: string,
  limit = PAGINATION.DEFAULT_PAGE_SIZE
): Promise<DreamListItem[]> {
  const { data, error } = await supabase
    .rpc('search_dreams', { query, result_limit: limit });

  if (error) {
    throw new Error(`Failed to search dreams: ${error.message}`);
  }

  return (data as unknown as DreamListItem[]) || [];
}

export async function incrementViewCount(dreamId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_view_count', { dream_id: dreamId });
  
  if (error) {
    console.warn(`Failed to increment view count: ${error.message}`);
  }
}

export async function getDreamsByCategory(
  categorySlug: string,
  options: Omit<DreamListOptions, 'filters'> = {}
): Promise<PaginatedResponse<DreamListItem>> {
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .single();

  if (!category) {
    return { data: [], count: 0, page: 1, pageSize: PAGINATION.DEFAULT_PAGE_SIZE, hasMore: false };
  }

  return getDreams({
    ...options,
    filters: { categoryId: category.id },
  });
}

export async function getRelatedDreams(
  dreamId: string,
  limit = 6
): Promise<DreamListItem[]> {
  const dream = await getDreamById(dreamId);
  
  if (!dream?.category_id) {
    return getFeaturedDreams(limit);
  }

  const { data, error } = await supabase
    .from('dreams')
    .select('id, title, thumbnail_url, duration_seconds, is_featured, category:categories(name, slug, color)')
    .eq('category_id', dream.category_id)
    .neq('id', dreamId)
    .order('view_count', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) {
    return getFeaturedDreams(limit);
  }

  return data as unknown as DreamListItem[];
}
