// Home screen numbers. Rules follow tora web's src/lib/data/overview.ts and
// src/app/(app)/dashboard/page.tsx @ dea6031:
// - This month counts rows dated from the 1st up to today (future-dated rows wait).
// - Budgets: expense groups with a budget, highest % used first.
// - Coming up: active recurring items due from today to `days` ahead, plus overdue
//   ones (next due date already passed).
import { budgetLines } from '@/lib/finance/budgets';
import { type CashflowContext, spendingByCategory, totals, type TxLike } from '@/lib/finance/cashflow';
import { addDays, occurrences, type Frequency } from '@/lib/finance/recurring';
import type { CategoryGroup } from '@/lib/finance/types';

/** This month's rows up to today, and their income / spending / net in IDR. */
export function homeTotals<T extends TxLike>(rows: T[], today: string, ctx: CashflowContext) {
  const month = today.slice(0, 7);
  const thisMonth = rows.filter((r) => r.date.startsWith(month) && r.date <= today);
  return { thisMonth, ...totals(thisMonth, ctx) };
}

/** Expense groups with a budget, most used first (`ratio` = spent / budget). */
export function topBudgets(
  groups: CategoryGroup[],
  budgets: Map<string, number>,
  thisMonth: TxLike[],
  ctx: CashflowContext,
  limit = 3,
) {
  return budgetLines(groups, budgets, spendingByCategory(thisMonth, ctx))
    .filter((l) => l.total.budget !== null)
    .sort((a, b) => (b.total.ratio ?? 0) - (a.total.ratio ?? 0))
    .slice(0, limit);
}

type RecurringLike = {
  id: string;
  name: string;
  amount: number | string; // negative = bill, positive = income
  account_id: string;
  is_active: boolean;
  next_due_date: string;
  frequency: Frequency;
  interval_count: number;
  end_date: string | null;
};

/** Due dates in the next `days` days (and overdue ones), soonest first. */
export function comingUp<R extends RecurringLike>(items: R[], today: string, days = 7) {
  const until = addDays(today, days);
  return items
    .filter((r) => r.is_active)
    .flatMap((r) =>
      occurrences(r, until, 5)
        .filter((d) => d >= today || d === r.next_due_date)
        .map((date) => ({ item: r, date, overdue: date < today })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}
