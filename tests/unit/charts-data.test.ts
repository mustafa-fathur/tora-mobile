import { describe, expect, it } from 'vitest';

import { formatIdrLive } from '@/lib/idr-live';
import { monthRange } from '@/lib/finance/dates';
import { netWorthHistory } from '@/lib/finance/networth';
import { hasHistory, netWorthSeries, rangeDates, seriesChange } from '@/lib/finance/net-worth-series';
import { addDays } from '@/lib/finance/recurring';
import { savingsRate, topShares } from '@/lib/finance/shares';
import { formatMoney } from '@/lib/money';

const accts = [
  { id: 'bca', currency: 'IDR', opening_balance: 1000, include_in_net_worth: true, created_at: '2026-10-03T00:00:00Z' },
  { id: 'card', currency: 'IDR', opening_balance: -500, include_in_net_worth: true, created_at: '2026-11-01T00:00:00Z' },
  { id: 'hidden', currency: 'IDR', opening_balance: 9999, include_in_net_worth: false, created_at: '2026-09-01T00:00:00Z' },
  { id: 'usd', currency: 'USD', opening_balance: 1, include_in_net_worth: true, created_at: '2026-11-01T00:00:00Z' },
];
const rows = [
  { account_id: 'bca', date: '2026-10-20', amount: -200 },
  { account_id: 'bca', date: '2026-11-10', amount: 300 },
];

describe('netWorthSeries', () => {
  it("matches the web's netWorthHistory at month ends", () => {
    const months = ['2026-09', '2026-10', '2026-11'];
    const monthEnds = months.map((m) => addDays(monthRange(m).end, -1));
    expect(netWorthSeries(accts, rows, monthEnds, { USD: 16000 }).map((p) => p.netWorth)).toEqual(
      netWorthHistory(accts, rows, months, { USD: 16000 }).map((p) => p.netWorth),
    );
  });

  it('follows transactions day by day', () => {
    const s = netWorthSeries(accts, rows, ['2026-10-19', '2026-10-20', '2026-11-09', '2026-11-10'], {});
    expect(s.map((p) => p.netWorth)).toEqual([1000, 800, 300, 600]);
  });
});

describe('rangeDates', () => {
  it('spans each range with the same number of points, ending today', () => {
    for (const r of ['1M', '3M', '6M', '1Y'] as const) {
      const d = rangeDates(r, '2026-11-04');
      expect(d).toHaveLength(30);
      expect(d.at(-1)).toBe('2026-11-04');
      expect([...d].sort()).toEqual(d); // ascending
    }
    expect(rangeDates('1Y', '2026-11-04')[0]).toBe('2025-11-04');
  });
});

describe('seriesChange / hasHistory', () => {
  it('reports the change over the range', () => {
    expect(seriesChange([{ netWorth: 1000 }, { netWorth: 1250 }])).toEqual({ amount: 250, ratio: 0.25 });
    expect(seriesChange([{ netWorth: 0 }, { netWorth: 5 }]).ratio).toBeNull();
    expect(hasHistory([{ netWorth: 5 }, { netWorth: 5 }])).toBe(false);
    expect(hasHistory([{ netWorth: 5 }, { netWorth: 6 }])).toBe(true);
  });
});

describe('formatIdrLive', () => {
  it.each([0, 7, 999, 1000, 45000, 1250000, -350000, 1234567890, 999.6])('formats %d like formatMoney', (n) => {
    expect(formatIdrLive(n)).toBe(formatMoney(n).replace(/\s/g, ' '));
  });
  it('can show a sign', () => {
    expect(formatIdrLive(50000, true)).toBe('+Rp 50.000');
    expect(formatIdrLive(-50000, true)).toBe('-Rp 50.000');
    expect(formatIdrLive(0, true)).toBe('Rp 0');
  });
});

describe('topShares', () => {
  const item = (id: string, amount: number) => ({ id, name: id, icon: null, amount });
  it('keeps the top categories and folds the rest into Other', () => {
    const out = topShares([item('a', 50), item('b', 20), item('c', 10), item('d', 10), item('e', 5), item('f', 3), item('g', 2)], 5);
    expect(out.map((s) => [s.id, s.amount])).toEqual([['a', 50], ['b', 20], ['c', 10], ['d', 10], ['e', 5], ['other', 5]]);
    expect(out.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1);
    expect(topShares([])).toEqual([]);
  });
});

describe('savingsRate', () => {
  it('is net ÷ income, or nothing without income', () => {
    expect(savingsRate({ income: 10_000_000, net: 2_500_000 })).toBe(25);
    expect(savingsRate({ income: 0, net: -5 })).toBeNull();
  });
});

describe('categoryFilter', async () => {
  const { categoryFilter, categoryName } = await import('@/lib/finance/categories');
  const c = (id: string, parent_id: string | null) =>
    ({ id, name: id, kind: 'expense', parent_id, icon: null, user_id: 'u', is_archived: false, sort_order: 0, created_at: '', updated_at: '' }) as const;
  const cats = [c('food', null), c('groceries', 'food'), c('eating', 'food'), c('fun', null)];
  it('expands a group to its categories, like the web', () => {
    expect(categoryFilter(cats, 'food')).toEqual({ categoryIds: ['food', 'groceries', 'eating'] });
    expect(categoryFilter(cats, 'groceries')).toEqual({ categoryIds: ['groceries'] });
    expect(categoryFilter(cats, 'uncategorized')).toEqual({ uncategorized: true });
    expect(categoryFilter(cats, undefined)).toEqual({});
    expect(categoryName(cats, 'uncategorized')).toBe('Uncategorized');
  });
});
