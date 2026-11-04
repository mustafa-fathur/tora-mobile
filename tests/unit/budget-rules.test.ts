import { describe, expect, it } from 'vitest';

import { budgetAmount } from '@/lib/finance/budget-rules';

describe('budgetAmount', () => {
  it('reads amounts, and empty or 0 clears the budget', () => {
    expect(budgetAmount('2.000.000')).toEqual({ ok: true, amount: 2000000 });
    expect(budgetAmount('1,5jt')).toEqual({ ok: true, amount: 1500000 });
    expect(budgetAmount('')).toEqual({ ok: true, amount: null });
    expect(budgetAmount('0')).toEqual({ ok: true, amount: null });
    expect(budgetAmount('abc')).toEqual({ ok: false, message: 'Enter a valid amount, or leave it empty to remove the budget.' });
  });
});
