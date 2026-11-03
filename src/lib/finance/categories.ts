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
