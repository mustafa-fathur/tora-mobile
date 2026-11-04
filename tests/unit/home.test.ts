import { describe, expect, it } from 'vitest';

import { makeContext, type TxLike } from '@/lib/finance/cashflow';
import { comingUp, homeTotals, recentEnd, topBudgets } from '@/lib/finance/home';
import type { Category, CategoryGroup } from '@/lib/finance/types';

const cat = (id: string, name: string, kind: 'expense' | 'income', parent_id: string | null = null): Category => ({
  id, name, kind, parent_id, icon: null, user_id: 'u', is_archived: false, sort_order: 0, created_at: '', updated_at: '',
});
const food = cat('food', 'Food', 'expense');
const groceries = cat('groceries', 'Groceries', 'expense', 'food');
const transport = cat('transport', 'Transport', 'expense');
const fun = cat('fun', 'Fun', 'expense');
const salary = cat('salary', 'Salary', 'income');
const categories = [food, groceries, transport, fun, salary];
const groups: CategoryGroup[] = [
  { ...food, children: [groceries] },
  { ...transport, children: [] },
  { ...fun, children: [] },
  { ...salary, children: [] },
];
const ctx = makeContext([{ id: 'bca', currency: 'IDR' }], categories, {});
const tx = (p: Partial<TxLike>): TxLike => ({
  account_id: 'bca', amount: -10000, date: '2026-11-03', kind: 'regular', category_id: null, ...p,
});

describe('homeTotals', () => {
  it("counts this month up to today only, like the web's dashboard", () => {
    const rows = [
      tx({ amount: 5000000, category_id: 'salary', date: '2026-11-01' }),
      tx({ amount: -45000, category_id: 'groceries' }),
      tx({ amount: -99000, date: '2026-11-20' }), // future-dated: not yet
      tx({ amount: -1, date: '2026-10-31' }), // last month
      tx({ amount: -500000, kind: 'transfer' }), // never counts
    ];
    const t = homeTotals(rows, '2026-11-03', ctx);
    expect(t).toMatchObject({ income: 5000000, spending: 45000, net: 4955000 });
    expect(t.thisMonth).toHaveLength(3);
  });
});

describe('topBudgets', () => {
  it('lists budgeted groups by % used, at most three', () => {
    const rows = [
      tx({ amount: -900000, category_id: 'groceries' }),
      tx({ amount: -150000, category_id: 'transport' }),
      tx({ amount: -10000, category_id: 'fun' }),
    ];
    const budgets = new Map([
      ['groceries', 1000000], // 90%
      ['transport', 100000], // 150%
      ['fun', 500000], // 2%
    ]);
    expect(topBudgets(groups, budgets, rows, ctx).map((l) => [l.group.id, l.total.status])).toEqual([
      ['transport', 'over'],
      ['food', 'warning'],
      ['fun', 'ok'],
    ]);
    expect(topBudgets(groups, budgets, rows, ctx, 1)).toHaveLength(1);
    expect(topBudgets(groups, new Map(), rows, ctx)).toEqual([]);
  });
});

describe('comingUp', () => {
  const item = (p: Partial<Parameters<typeof comingUp>[0][number]>) => ({
    id: 'x', name: 'Rent', amount: -3000000, account_id: 'bca', is_active: true,
    next_due_date: '2026-11-05', frequency: 'monthly' as const, interval_count: 1, end_date: null, ...p,
  });

  it('shows the next 7 days, soonest first, and flags overdue items', () => {
    const list = comingUp(
      [
        item({ id: 'rent' }),
        item({ id: 'netflix', name: 'Netflix', next_due_date: '2026-10-28', amount: -186000 }), // overdue
        item({ id: 'salary', name: 'Salary', next_due_date: '2026-11-10', amount: 5000000 }), // day 7
        item({ id: 'later', next_due_date: '2026-11-11' }), // day 8: too far
        item({ id: 'off', is_active: false }),
      ],
      '2026-11-03',
    );
    expect(list.map((u) => [u.item.id, u.date, u.overdue])).toEqual([
      ['netflix', '2026-10-28', true],
      ['rent', '2026-11-05', false],
      ['salary', '2026-11-10', false],
    ]);
  });

  it('repeats weekly items within the window', () => {
    const list = comingUp([item({ frequency: 'weekly', next_due_date: '2026-11-03' })], '2026-11-03');
    expect(list.map((u) => u.date)).toEqual(['2026-11-03', '2026-11-10']);
  });
});

describe('recentEnd', () => {
  it('ends "recent" after today (exclusive), across month and year ends', () => {
    expect(recentEnd('2026-11-04')).toBe('2026-11-05');
    expect(recentEnd('2026-11-30')).toBe('2026-12-01');
    expect(recentEnd('2026-12-31')).toBe('2027-01-01');
  });
});

describe('overviewInsights', async () => {
  const { overviewInsights } = await import('@/lib/finance/home');
  it("builds the dashboard's insights from two months of rows", () => {
    const rows = [
      tx({ date: '2026-10-02', amount: 10000000, category_id: 'salary' }),
      tx({ date: '2026-10-02', amount: -100000, category_id: 'groceries' }),
      tx({ date: '2026-11-02', amount: -400000, category_id: 'groceries' }),
    ];
    const out = overviewInsights({
      rows, today: '2026-11-03', ctx, groups, budgets: new Map([['food', 300000]]),
      recurring: [], rates: {}, currencyOf: new Map([['bca', 'IDR']]),
    }).map((i) => i.title);
    expect(out).toContain('Spending is up 300%');
    expect(out).toContain('Over budget: Food');
    expect(out).toContain('You saved 99% of your income last month');
  });
});
