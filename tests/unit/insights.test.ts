// The web has no tests for insights.ts; these cover each rule of the copied file.
import { describe, expect, it } from 'vitest';

import { makeContext, type TxLike } from '@/lib/finance/cashflow';
import { insights } from '@/lib/finance/insights';
import type { Category } from '@/lib/finance/types';

const cat = (id: string, name: string, kind: 'expense' | 'income'): Category => ({
  id, name, kind, parent_id: null, icon: kind === 'expense' ? '🍜' : null, user_id: 'u', is_archived: false,
  sort_order: 0, created_at: '', updated_at: '',
});
const ctx = makeContext([{ id: 'a', currency: 'IDR' }], [cat('food', 'Food', 'expense'), cat('pay', 'Salary', 'income')], {});
const tx = (amount: number, category_id: string | null = 'food'): TxLike => ({
  account_id: 'a', amount, date: '2026-11-03', kind: 'regular', category_id,
});
const base = {
  ctx,
  thisMonth: [] as TxLike[],
  lastMonthSamePeriod: [] as TxLike[],
  lastMonth: [] as TxLike[],
  overBudget: [] as { name: string; over: number }[],
  upcomingBills: { total: 0, count: 0, days: 14 },
  uncategorized: 0,
};
const titles = (p: Partial<typeof base>) => insights({ ...base, ...p }).map((i) => [i.tone, i.title]);
// Intl uses non-breaking spaces; normalise for readable assertions.
const details = (p: Partial<typeof base>) => insights({ ...base, ...p }).map((i) => i.detail.replace(/\s/g, ' '));

describe('insights', () => {
  it('says nothing without data', () => {
    expect(insights(base)).toEqual([]);
  });

  it('compares spending with the same point last month (only moves of 10% or more)', () => {
    expect(titles({ thisMonth: [tx(-120000)], lastMonthSamePeriod: [tx(-100000)] })).toContainEqual(['warning', 'Spending is up 20%']);
    expect(titles({ thisMonth: [tx(-80000)], lastMonthSamePeriod: [tx(-100000)] })).toContainEqual(['good', 'Spending is down 20%']);
    expect(titles({ thisMonth: [tx(-105000)], lastMonthSamePeriod: [tx(-100000)] }).some(([, t]) => t.startsWith('Spending is'))).toBe(false);
  });

  it('names the biggest category increase when it is large enough', () => {
    const out = titles({ thisMonth: [tx(-400000)], lastMonthSamePeriod: [tx(-100000)] });
    expect(out).toContainEqual(['neutral', '🍜 Food is your biggest increase']);
    expect(titles({ thisMonth: [tx(-150000)], lastMonthSamePeriod: [tx(-100000)] }).some(([, t]) => t.includes('biggest'))).toBe(false);
  });

  it('lists at most two over-budget groups', () => {
    const out = titles({ overBudget: [{ name: 'Food', over: 1 }, { name: 'Fun', over: 2 }, { name: 'Car', over: 3 }] });
    expect(out.filter(([, t]) => t.startsWith('Over budget'))).toEqual([
      ['warning', 'Over budget: Food'],
      ['warning', 'Over budget: Fun'],
    ]);
  });

  it("rates last month's savings", () => {
    expect(titles({ lastMonth: [tx(10000000, 'pay'), tx(-7000000)] })).toContainEqual(['good', 'You saved 30% of your income last month']);
    expect(titles({ lastMonth: [tx(10000000, 'pay'), tx(-9000000)] })).toContainEqual(['neutral', 'You saved 10% of your income last month']);
    expect(titles({ lastMonth: [tx(10000000, 'pay'), tx(-12000000)] })).toContainEqual(['warning', 'You saved -20% of your income last month']);
  });

  it('counts upcoming bills and uncategorized rows', () => {
    expect(titles({ upcomingBills: { total: 2500000, count: 2, days: 14 } })).toEqual([['neutral', '2 bills due in the next 14 days']]);
    expect(details({ upcomingBills: { total: 2500000, count: 1, days: 14 } })).toEqual(['Rp 2.500.000 in total.']);
    expect(titles({ uncategorized: 2 })).toEqual([]);
    expect(titles({ uncategorized: 3 })).toEqual([['neutral', '3 transactions need a category']]);
  });
});
