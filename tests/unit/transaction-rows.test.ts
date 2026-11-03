import { describe, expect, it } from 'vitest';

import { buildTransactionRows, type TransactionInput } from '@/lib/finance/transaction-rows';

const accounts = [
  { id: 'bca', name: 'BCA', currency: 'IDR' },
  { id: 'cash', name: 'Cash', currency: 'IDR' },
  { id: 'wise', name: 'Wise', currency: 'USD' },
];
const categories = [
  { id: 'food', kind: 'expense' as const },
  { id: 'salary', kind: 'income' as const },
];
const build = (p: Partial<TransactionInput>) =>
  buildTransactionRows(
    { mode: 'expense', accountId: 'bca', amount: '45rb', date: '2026-11-03', time: '12:30', ...p },
    accounts,
    categories,
    () => 'tid',
  );
const rows = (p: Partial<TransactionInput>) => {
  const r = build(p);
  if (!r.ok) throw new Error(r.message);
  return r.rows;
};
const error = (p: Partial<TransactionInput>) => {
  const r = build(p);
  return r.ok ? null : r.message;
};

describe('buildTransactionRows', () => {
  it('saves spending as a negative amount', () => {
    expect(rows({ categoryId: 'food', description: ' Lunch ' })).toEqual([
      {
        account_id: 'bca',
        kind: 'regular',
        amount: -45000,
        date: '2026-11-03',
        time: '12:30',
        description: 'Lunch',
        category_id: 'food',
      },
    ]);
  });

  it('saves income and refunds as positive amounts', () => {
    expect(rows({ mode: 'income', categoryId: 'salary', amount: '5jt' })[0].amount).toBe(5000000);
    expect(rows({ categoryId: 'food', refund: true })[0].amount).toBe(45000);
    // "refund" only means something for expenses
    expect(rows({ mode: 'income', refund: true })[0].amount).toBe(45000);
  });

  it('allows no category and no time', () => {
    const [row] = rows({ time: '' });
    expect(row.category_id).toBeNull();
    expect(row.time).toBeNull();
  });

  it('builds a transfer as two legs sharing one transfer_id', () => {
    expect(rows({ mode: 'transfer', toAccountId: 'cash', amount: '1,5jt', categoryId: 'food' })).toEqual([
      {
        kind: 'transfer',
        transfer_id: 'tid',
        date: '2026-11-03',
        time: '12:30',
        account_id: 'bca',
        amount: -1500000,
        description: 'Transfer to Cash',
      },
      {
        kind: 'transfer',
        transfer_id: 'tid',
        date: '2026-11-03',
        time: '12:30',
        account_id: 'cash',
        amount: 1500000,
        description: 'Transfer from BCA',
      },
    ]);
  });

  it('uses the amount received for transfers between currencies', () => {
    const legs = rows({ mode: 'transfer', toAccountId: 'wise', amount: '1.600.000', toAmount: '100' });
    expect(legs.map((l) => l.amount)).toEqual([-1600000, 100]);
    expect(error({ mode: 'transfer', toAccountId: 'wise', amount: '1.600.000' })).toBe(
      'Enter the amount received in USD.',
    );
  });

  it('rejects bad input with the web messages', () => {
    expect(error({ amount: '0' })).toBe('Enter an amount greater than zero.');
    expect(error({ accountId: '' })).toBe('Choose an account.');
    expect(error({ accountId: 'gone' })).toBe('That account no longer exists.');
    expect(error({ date: '03-11-2026' })).toBe('Pick a valid date.');
    expect(error({ time: '25:00' })).toBe('Pick a valid time, or leave it empty.');
    expect(error({ categoryId: 'salary' })).toBe('Pick an expense category.');
    expect(error({ mode: 'transfer' })).toBe('Choose the account the money goes to.');
    expect(error({ mode: 'transfer', toAccountId: 'bca' })).toBe('Pick two different accounts.');
    expect(error({ description: 'x'.repeat(201) })).toBe('Description is too long.');
  });
});
