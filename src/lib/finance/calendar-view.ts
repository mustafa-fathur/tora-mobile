// Data for the Transactions tab's Day / Week / Month views. Builds on tora web's
// calendar helpers (src/lib/finance/calendar.ts: monthGrid, dailyTotals) and its
// calendar page rules: income/spending per day in IDR, upcoming recurring items
// on today and future days.
import { type DayTotals, monthGrid } from '@/lib/finance/calendar';
import { occurrences, type Frequency } from '@/lib/finance/recurring';

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

export type Due<R> = { item: R; date: string };

/** Active recurring items due from max(start, today) to end (inclusive), by date. */
export function dueBetween<R extends RecurringLike>(items: R[], start: string, end: string, today: string): Due<R>[] {
  const from = start > today ? start : today;
  return items
    .filter((r) => r.is_active)
    .flatMap((r) => occurrences(r, end, 62).filter((d) => d >= from).map((date) => ({ item: r, date })))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type MonthCell = {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  income: number;
  spending: number;
  /** 0..1: this day's spending compared with the month's biggest spending day. */
  tint: number;
  bills: number; // recurring bills due (today or later)
  incomeDue: number; // recurring income due (today or later)
};

/** Weeks (Mon–Sun) of cells for a month ("YYYY-MM"). */
export function monthCells<R extends RecurringLike>(
  month: string,
  today: string,
  totals: Record<string, DayTotals>,
  due: Due<R>[],
): MonthCell[][] {
  const grid = monthGrid(`${month}-01`);
  const inMonth = (d: string) => d.startsWith(month);
  const maxSpending = Math.max(0, ...grid.flat().filter(inMonth).map((d) => totals[d]?.spending ?? 0));
  return grid.map((week) =>
    week.map((date) => {
      const t = totals[date];
      const spending = t?.spending ?? 0;
      const dueToday = due.filter((x) => x.date === date);
      return {
        date,
        day: Number(date.slice(8, 10)),
        inMonth: inMonth(date),
        isToday: date === today,
        income: t?.income ?? 0,
        spending,
        tint: maxSpending > 0 && spending > 0 ? Math.min(1, spending / maxSpending) : 0,
        bills: dueToday.filter((x) => Number(x.item.amount) < 0).length,
        incomeDue: dueToday.filter((x) => Number(x.item.amount) > 0).length,
      };
    }),
  );
}
