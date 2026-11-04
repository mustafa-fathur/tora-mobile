import { describe, expect, it } from 'vitest';

import { dailyTotals } from '@/lib/finance/calendar';
import { dueBetween, monthCells } from '@/lib/finance/calendar-view';
import { makeContext, type TxLike } from '@/lib/finance/cashflow';

const ctx = makeContext([{ id: 'a', currency: 'IDR' }], [], {});
const tx = (p: Partial<TxLike>): TxLike => ({ account_id: 'a', amount: -1, date: '2026-11-03', kind: 'regular', category_id: null, ...p });
const item = (p: Partial<Parameters<typeof dueBetween>[0][number]>) => ({
  id: 'x', name: 'Rent', amount: -3000000, account_id: 'a', is_active: true,
  next_due_date: '2026-11-20', frequency: 'monthly' as const, interval_count: 1, end_date: null, ...p,
});

describe('dueBetween', () => {
  it('lists due dates from today on, never past ones', () => {
    const due = dueBetween(
      [item({}), item({ id: 'w', name: 'Gym', next_due_date: '2026-10-27', frequency: 'weekly' }), item({ id: 'off', is_active: false })],
      '2026-10-26',
      '2026-12-06',
      '2026-11-04',
    );
    expect(due.map((d) => [d.item.id, d.date])).toEqual([
      ['w', '2026-11-10'], ['w', '2026-11-17'], ['x', '2026-11-20'], ['w', '2026-11-24'], ['w', '2026-12-01'],
    ]);
  });
});

describe('monthCells', () => {
  const totals = dailyTotals(
    [tx({ date: '2026-11-03', amount: -100000 }), tx({ date: '2026-11-04', amount: -25000 }), tx({ date: '2026-11-04', amount: 500000 }), tx({ date: '2026-10-30', amount: -999999 })],
    ctx,
  );
  const due = dueBetween([item({}), item({ id: 'pay', amount: 5000000, next_due_date: '2026-11-25' })], '2026-10-26', '2026-12-06', '2026-11-04');
  const weeks = monthCells('2026-11', '2026-11-04', totals, due);
  const cell = (d: string) => weeks.flat().find((c) => c.date === d)!;

  it('covers the month in Monday-first weeks', () => {
    expect(weeks).toHaveLength(6);
    expect(weeks[0][0]).toMatchObject({ date: '2026-10-26', inMonth: false });
    expect(weeks[0].every((c) => c.date.startsWith('2026-1'))).toBe(true);
  });

  it("shows each day's money and tints spending against the month's biggest day", () => {
    expect(cell('2026-11-03')).toMatchObject({ spending: 100000, income: 0, tint: 1 });
    expect(cell('2026-11-04')).toMatchObject({ spending: 25000, income: 500000, tint: 0.25, isToday: true });
    expect(cell('2026-11-05').tint).toBe(0);
    // A bigger day outside the month doesn't change the scale, and tints stop at 1.
    expect(cell('2026-10-30').tint).toBe(1);
  });

  it('marks upcoming bills and income on their days', () => {
    expect(cell('2026-11-20')).toMatchObject({ bills: 1, incomeDue: 0 });
    expect(cell('2026-11-25')).toMatchObject({ bills: 0, incomeDue: 1 });
  });
});
