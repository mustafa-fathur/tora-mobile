// Helpers for the category charts (Home donut, Cash flow bars) and the savings rate.
// Category totals themselves come from tora web's cashflow.ts (byGroup).
import type { CategoryTotal } from '@/lib/finance/cashflow';

export type Share = CategoryTotal & { share: number };

/** The biggest `limit` categories, then everything else as "Other"; shares add up to 1. */
export function topShares(items: CategoryTotal[], limit = 5): Share[] {
  const positive = items.filter((i) => i.amount > 0);
  const total = positive.reduce((s, i) => s + i.amount, 0);
  if (total <= 0) return [];
  const top = positive.slice(0, limit);
  const rest = positive.slice(limit);
  const other = rest.reduce((s, i) => s + i.amount, 0);
  const out = top.map((i) => ({ ...i, share: i.amount / total }));
  if (other > 0) out.push({ id: 'other', name: 'Other', icon: null, amount: other, share: other / total });
  return out;
}

/** Net ÷ income as a whole percent (same as the web's Cash flow page), or null without income. */
export const savingsRate = (t: { income: number; net: number }) =>
  t.income > 0 ? Math.round((t.net / t.income) * 100) : null;
