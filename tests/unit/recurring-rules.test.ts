import { describe, expect, it } from 'vitest';

import { advanceFields, buildRecurring, paidDefaultDate, paidTransaction, type RecurringInput } from '@/lib/finance/recurring-rules';

const accounts = [{ id: 'bca', currency: 'IDR' }];
const input: RecurringInput = {
  name: 'Internet', direction: 'expense', amount: '350rb', accountId: 'bca', categoryId: null,
  frequency: 'monthly', interval: '1', nextDue: '2026-11-20', endDate: null,
};
const msg = (r: { ok: boolean; message?: string }) => (r.ok ? null : r.message);

describe('buildRecurring', () => {
  it('signs bills negative and income positive', () => {
    expect(buildRecurring(input, accounts)).toMatchObject({ ok: true, row: { amount: -350000, interval_count: 1, end_date: null } });
    expect(buildRecurring({ ...input, direction: 'income', amount: '5jt' }, accounts)).toMatchObject({ row: { amount: 5000000 } });
  });

  it('rejects bad input with the web messages', () => {
    expect(msg(buildRecurring({ ...input, name: '' }, accounts))).toBe('Give it a name, e.g. Internet or Salary.');
    expect(msg(buildRecurring({ ...input, interval: '0' }, accounts))).toBe('Repeat every 1–52.');
    expect(msg(buildRecurring({ ...input, interval: '53' }, accounts))).toBe('Repeat every 1–52.');
    expect(msg(buildRecurring({ ...input, nextDue: '' }, accounts))).toBe('Pick the next due date.');
    expect(msg(buildRecurring({ ...input, endDate: '2026-11-01' }, accounts))).toBe('The end date must be after the next due date.');
    expect(msg(buildRecurring({ ...input, accountId: 'gone' }, accounts))).toBe('That account no longer exists.');
    expect(msg(buildRecurring({ ...input, amount: '0' }, accounts))).toBe('Enter an amount greater than zero.');
  });
});

describe('mark paid / skip', () => {
  const item = { id: 'r', name: 'Internet', amount: -350000, account_id: 'bca', category_id: 'c', next_due_date: '2026-11-20', frequency: 'monthly' as const, interval_count: 1, end_date: null };

  it('records a transaction with the item sign and link', () => {
    expect(paidTransaction(item, '360.000', '2026-11-19', accounts)).toEqual({
      ok: true,
      row: { account_id: 'bca', amount: -360000, date: '2026-11-19', description: 'Internet', category_id: 'c', recurring_item_id: 'r' },
    });
    expect(msg(paidTransaction(item, '', '2026-11-19', accounts))).toBe('Enter an amount greater than zero.');
  });

  it('defaults the paid date to the due date, or today if due later', () => {
    expect(paidDefaultDate(item, '2026-11-25')).toBe('2026-11-20');
    expect(paidDefaultDate(item, '2026-11-04')).toBe('2026-11-04');
  });

  it('advances the due date, and pauses once past the end date', () => {
    expect(advanceFields(item)).toEqual({ next_due_date: '2026-12-20' });
    expect(advanceFields({ ...item, end_date: '2026-12-01' })).toEqual({ is_active: false });
  });
});
