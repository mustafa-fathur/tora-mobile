// Home screen numbers. Rules follow tora web's src/lib/data/overview.ts and
// src/app/(app)/dashboard/page.tsx @ dea6031:
// - This month counts rows dated from the 1st up to today (future-dated rows wait).
// - Budgets: expense groups with a budget, highest % used first.
// - Recent transactions stop at today (mobile choice; the web's dashboard doesn't yet).
// - Coming up: active recurring items due from today to `days` ahead, plus overdue
//   ones (next due date already passed).
import { budgetLines } from '@/lib/finance/budgets';
import { type CashflowContext, spendingByCategory, totals, type TxLike } from '@/lib/finance/cashflow';
import { toBase } from '@/lib/finance/fx';
import { insights } from '@/lib/finance/insights';
import { addDays, occurrences, type Frequency } from '@/lib/finance/recurring';
import type { CategoryGroup } from '@/lib/finance/types';

/** Exclusive end date for "Recent transactions": rows dated after today don't count yet. */
export const recentEnd = (today: string) => addDays(today, 1);

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

/**
 * The dashboard's insights, with the same inputs as tora web's overview.ts:
 * this month so far, last month to the same day, all of last month, over-budget
 * groups, bills over the next 14 days, uncategorized rows this month.
 * `rows` must cover last month and this month.
 */
export function overviewInsights(args: {
  rows: TxLike[];
  today: string;
  ctx: CashflowContext;
  groups: CategoryGroup[];
  budgets: Map<string, number>;
  recurring: RecurringLike[];
  rates: Record<string, number>;
  currencyOf: Map<string, string>;
}) {
  const { rows, today, ctx } = args;
  const month = today.slice(0, 7);
  const prev = shiftMonthKey(month);
  const day = Number(today.slice(8, 10));
  const thisMonth = rows.filter((r) => r.date.startsWith(month) && r.date <= today);
  const lastMonth = rows.filter((r) => r.date.startsWith(prev));
  const lines = budgetLines(args.groups, args.budgets, spendingByCategory(thisMonth, ctx));
  const bills = comingUp(args.recurring, today, 14).filter((u) => Number(u.item.amount) < 0);
  return insights({
    ctx,
    thisMonth,
    lastMonthSamePeriod: lastMonth.filter((r) => Number(r.date.slice(8, 10)) <= day),
    lastMonth,
    overBudget: lines.filter((l) => l.total.status === 'over').map((l) => ({ name: l.group.name, over: -(l.total.remaining ?? 0) })),
    upcomingBills: {
      total: bills.reduce((s, u) => s - (toBase(Number(u.item.amount), args.currencyOf.get(u.item.account_id) ?? 'IDR', args.rates) ?? 0), 0),
      count: bills.length,
      days: 14,
    },
    uncategorized: thisMonth.filter((r) => r.kind === 'regular' && !r.category_id).length,
  });
}

function shiftMonthKey(month: string) {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
