import { supabase } from './supabase';
import type { Category } from '@/types/database';

let categoriesCache: Category[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000;

export async function getCategories(): Promise<Category[]> {
  if (categoriesCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
    return categoriesCache;
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  categoriesCache = (data as Category[]) || [];
  cacheTimestamp = Date.now();

  return categoriesCache;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) || null;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.id === id) || null;
}

export function clearCategoriesCache(): void {
  categoriesCache = null;
  cacheTimestamp = null;
}
