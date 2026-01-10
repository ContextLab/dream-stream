import type { Category } from '@/types/database';
import { CATEGORIES } from '@/lib/dreamData';

export async function getCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return CATEGORIES.find((c) => c.slug === slug) || null;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  return CATEGORIES.find((c) => c.id === id) || null;
}
