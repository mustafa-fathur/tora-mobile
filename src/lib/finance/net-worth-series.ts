// Net worth over time for the Home chart. Same rules as tora web's
// src/lib/finance/networth.ts (netWorthHistory), but at any set of dates instead of
// month ends, so short ranges (1M) have enough points to draw:
// - only accounts marked "include in net worth" count (archived ones too);
// - an account's opening balance counts from the month it was added to Tora,
//   or earlier if it has transactions before that;
// - other currencies convert with today's rates.
import { round } from '@/lib/finance/cashflow';
import { toBase, type Rates } from '@/lib/finance/fx';
import { addDays } from '@/lib/finance/recurring';

type AccountLike = {
  id: string;
  currency: string;
  opening_balance: number | string;
  include_in_net_worth: boolean;
  created_at: string;
};

export type NetWorthRange = '1M' | '3M' | '6M' | '1Y';
export const NET_WORTH_RANGES: NetWorthRange[] = ['1M', '3M', '6M', '1Y'];
const RANGE_DAYS: Record<NetWorthRange, number> = { '1M': 30, '3M': 91, '6M': 182, '1Y': 365 };

/** `count` evenly spaced dates from the start of the range to today (both included). */
export function rangeDates(range: NetWorthRange, today: string, count = 30): string[] {
  const span = RANGE_DAYS[range];
  const start = addDays(today, -span);
  return Array.from({ length: count }, (_, i) => addDays(start, Math.round((i * span) / (count - 1))));
}

/** Net worth at the end of each date (inclusive), in IDR. */
export function netWorthSeries(
  accounts: AccountLike[],
  rows: { account_id: string; date: string; amount: number | string }[],
  dates: string[],
  rates: Rates,
) {
  const counted = accounts.filter((a) => a.include_in_net_worth);
  const byAccount = new Map<string, { date: string; amount: number }[]>();
  for (const r of rows) {
    const list = byAccount.get(r.account_id) ?? [];
    list.push({ date: r.date, amount: Number(r.amount) });
    byAccount.set(r.account_id, list);
  }
  return dates.map((date) => {
    let total = 0;
    for (const a of counted) {
      const tx = (byAccount.get(a.id) ?? []).filter((t) => t.date <= date);
      const started = a.created_at.slice(0, 7) <= date.slice(0, 7) || tx.length > 0;
      if (!started) continue;
      const balance = Number(a.opening_balance) + tx.reduce((s, t) => s + t.amount, 0);
      total += toBase(balance, a.currency, rates) ?? 0;
    }
    return { date, netWorth: round(total) };
  });
}

/** Change from the first to the last point, and as a share of the first (null when it started at 0). */
export function seriesChange(series: { netWorth: number }[]) {
  if (series.length < 2) return { amount: 0, ratio: null as number | null };
  const first = series[0].netWorth;
  const amount = round(series[series.length - 1].netWorth - first);
  return { amount, ratio: first !== 0 ? amount / Math.abs(first) : null };
}

/** True when the range has at least two different values worth drawing. */
export const hasHistory = (series: { netWorth: number }[]) =>
  series.length > 1 && series.some((p) => p.netWorth !== series[0].netWorth);

