import { describe, expect, it } from 'vitest';

import { parseAmountInput } from '@/lib/amount-input';
import { makeContext } from '@/lib/finance/cashflow';
import { dayGroups, describeRow, formFromTransaction, transferLegs } from '@/lib/finance/transaction-list';
import type { Category, Transaction } from '@/lib/finance/types';

const cat = (id: string, name: string, kind: 'expense' | 'income', parent_id: string | null = null): Category => ({
  id, name, kind, parent_id, icon: parent_id ? null : '🍜', user_id: 'u', is_archived: false,
  sort_order: 0, created_at: '', updated_at: '',
});
const categories = [cat('food', 'Food', 'expense'), cat('groceries', 'Groceries', 'expense', 'food'), cat('salary', 'Salary', 'income')];
const categoryById = new Map(categories.map((c) => [c.id, c]));
const accountById = new Map([['bca', { name: 'BCA' }], ['wise', { name: 'Wise' }]]);
const ctx = makeContext([{ id: 'bca', currency: 'IDR' }, { id: 'wise', currency: 'USD' }], categories, { USD: 16000 });

let n = 0;
const tx = (p: Partial<Transaction>): Transaction => ({
  id: `t${++n}`, user_id: 'u', account_id: 'bca', amount: -10000, date: '2026-11-03', time: null, kind: 'regular',
  category_id: null, description: null, notes: null, transfer_id: null, recurring_item_id: null, import_id: null,
  created_at: '', updated_at: '', ...p,
} as Transaction);

describe('dayGroups', () => {
  it('groups by day with the net in IDR, ignoring transfers', () => {
    const rows = [
      tx({ date: '2026-11-03', amount: 100000, category_id: 'salary' }),
      tx({ date: '2026-11-03', amount: -25000, category_id: 'groceries' }),
      tx({ date: '2026-11-03', amount: -500000, kind: 'transfer', transfer_id: 'x' }),
      tx({ date: '2026-11-02', amount: -1, account_id: 'wise' }), // US$1 = Rp 16.000
    ];
    expect(dayGroups(rows, ctx).map((d) => [d.date, d.net, d.data.length])).toEqual([
      ['2026-11-03', 75000, 3],
      ['2026-11-02', -16000, 1],
    ]);
  });
});

describe('describeRow', () => {
  it('uses the description, then the category, like the web', () => {
    expect(describeRow(tx({ description: 'Sayur', category_id: 'groceries', time: '08:15:00' }), accountById, categoryById))
      .toEqual({ title: 'Sayur', subtitle: '08:15 · Groceries · BCA', icon: '🍜', tone: 'default' });
    expect(describeRow(tx({ category_id: 'groceries' }), accountById, categoryById).title).toBe('Groceries');
    expect(describeRow(tx({ amount: 5, category_id: 'salary' }), accountById, categoryById).tone).toBe('income');
  });

  it('labels transfers and balance updates', () => {
    expect(describeRow(tx({ kind: 'transfer', description: 'Transfer to Wise' }), accountById, categoryById))
      .toMatchObject({ subtitle: 'Transfer · BCA', icon: 'transfer', tone: 'muted' });
    expect(describeRow(tx({ kind: 'adjustment', amount: 5 }), accountById, categoryById))
      .toMatchObject({ title: 'Balance update', icon: 'adjustment', tone: 'muted' });
  });
});

describe('formFromTransaction', () => {
  it('fills the form for a regular transaction, refunds included', () => {
    const f = formFromTransaction({ row: tx({ amount: 45000, category_id: 'groceries', time: '12:30:00', description: 'Return' }) }, categories);
    expect(f).toMatchObject({ mode: 'expense', amount: '45.000', refund: true, time: '12:30', categoryId: 'groceries' });
    expect(formFromTransaction({ row: tx({ amount: 5000 }) }, categories).mode).toBe('income');
  });

  it('round-trips decimal amounts through the amount parser', () => {
    const f = formFromTransaction({ row: tx({ amount: -10.5, account_id: 'wise' }) }, categories);
    expect(f.amount).toBe('10,5');
    expect(parseAmountInput(f.amount, 'USD')).toBe(10.5);
    expect(parseAmountInput(formFromTransaction({ row: tx({ amount: -1250000 }) }, categories).amount)).toBe(1250000);
    const usd = formFromTransaction({ row: tx({ amount: -1250.75, account_id: 'wise' }) }, categories).amount;
    expect(usd).toBe('1.250,75');
    expect(parseAmountInput(usd, 'USD')).toBe(1250.75);
    expect(parseAmountInput(formFromTransaction({ row: tx({ amount: -1250, account_id: 'wise' }) }, categories).amount, 'USD')).toBe(1250);
  });

  it('fills both sides of a transfer', () => {
    const legs = transferLegs(
      tx({ amount: 100, account_id: 'wise', kind: 'transfer', transfer_id: 'x' }),
      tx({ amount: -1600000, kind: 'transfer', transfer_id: 'x' }),
    )!;
    expect(formFromTransaction(legs, categories)).toMatchObject({
      mode: 'transfer', amount: '1.600.000', toAmount: '100', accountId: 'bca', toAccountId: 'wise',
    });
    expect(transferLegs(legs.out, undefined)).toBeNull();
  });

  it("leaves the automatic transfer wording out, so each side gets its own text again", () => {
    const legs = (outText: string, inText: string) =>
      transferLegs(
        tx({ amount: -5, kind: 'transfer', transfer_id: 'y', description: outText }),
        tx({ amount: 5, kind: 'transfer', transfer_id: 'y', description: inText }),
      )!;
    expect(formFromTransaction(legs('Transfer to Wise', 'Transfer from BCA'), categories).description).toBe('');
    expect(formFromTransaction(legs('Rent share', 'Rent share'), categories).description).toBe('Rent share');
  });
});
