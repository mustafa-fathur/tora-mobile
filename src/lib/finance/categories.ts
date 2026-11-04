// Copied from tora web: toCategoryGroups in src/lib/data/queries.ts @ dea6031
import type { Category, CategoryGroup } from '@/lib/finance/types';

// Groups (no parent) with their categories, in display order.
export function toCategoryGroups(categories: Category[]): CategoryGroup[] {
  const groups = categories.filter((c) => !c.parent_id).map((g) => ({ ...g, children: [] as Category[] }));
  const byId = new Map(groups.map((g) => [g.id, g]));
  for (const c of categories) {
    if (c.parent_id) byId.get(c.parent_id)?.children.push(c);
  }
  return groups;
}

// Ported from tora web: src/lib/data/transaction-filters.ts @ dea6031 (the category part).
export const UNCATEGORIZED = 'uncategorized';

/** A category (or group) id → the transaction filter: the group plus its categories, or uncategorized rows. */
export function categoryFilter(categories: Category[], id: string | undefined) {
  if (!id) return {};
  if (id === UNCATEGORIZED) return { uncategorized: true };
  return { categoryIds: [id, ...categories.filter((c) => c.parent_id === id).map((c) => c.id)] };
}

/** Display name for a category filter chip. */
export function categoryName(categories: Category[], id: string) {
  if (id === UNCATEGORIZED) return 'Uncategorized';
  const c = categories.find((x) => x.id === id);
  return c ? [c.icon, c.name].filter(Boolean).join(' ') : 'Category';
}
