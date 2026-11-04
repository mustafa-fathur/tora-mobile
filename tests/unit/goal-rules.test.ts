import { describe, expect, it } from 'vitest';

import { buildGoal, goalProgress, movedSaved } from '@/lib/finance/goal-rules';

const accounts = [{ id: 'save', currency: 'IDR' }, { id: 'usd', currency: 'USD' }];
const input = { name: 'Laptop', target: '15jt', saved: '2.000.000', accountId: null, targetDate: '2027-05-04' };
const msg = (r: { ok: boolean; message?: string }) => (r.ok ? null : r.message);

describe('buildGoal', () => {
  it('builds a manual goal in IDR', () => {
    expect(buildGoal(input, accounts)).toEqual({
      ok: true,
      row: { name: 'Laptop', target_amount: 15000000, currency: 'IDR', target_date: '2027-05-04', account_id: null, saved_amount: 2000000 },
    });
  });
  it('takes the currency from a linked account and ignores saved', () => {
    expect(buildGoal({ ...input, accountId: 'usd', target: '1000' }, accounts)).toMatchObject({ row: { currency: 'USD', saved_amount: 0, account_id: 'usd' } });
  });
  it('rejects bad input with the web messages', () => {
    expect(msg(buildGoal({ ...input, name: '' }, accounts))).toBe('Give the goal a name.');
    expect(msg(buildGoal({ ...input, target: '' }, accounts))).toBe('Enter a target amount greater than zero.');
    expect(msg(buildGoal({ ...input, saved: 'x' }, accounts))).toBe("Saved so far isn't a valid amount.");
    expect(msg(buildGoal({ ...input, accountId: 'gone' }, accounts))).toBe('That account no longer exists.');
  });
});

describe('movedSaved', () => {
  it('adds and takes out, never below zero', () => {
    expect(movedSaved(100000, '50rb', 'IDR', false)).toEqual({ ok: true, saved: 150000 });
    expect(movedSaved(100000, '500rb', 'IDR', true)).toEqual({ ok: true, saved: 0 });
    expect(msg(movedSaved(1, '', 'IDR', false))).toBe('Enter an amount greater than zero.');
  });
});

describe('goalProgress', () => {
  const goal = { saved_amount: 3000000, target_amount: 15000000, target_date: '2027-05-04' };
  it('works out progress and the monthly amount to reach it', () => {
    expect(goalProgress(goal, undefined, '2026-11-04')).toMatchObject({ saved: 3000000, left: 12000000, ratio: 0.2, perMonth: 2000000, done: false });
  });
  it('uses the linked account balance, never below zero', () => {
    expect(goalProgress(goal, -5, '2026-11-04').saved).toBe(0);
    expect(goalProgress(goal, 16000000, '2026-11-04')).toMatchObject({ done: true, left: 0, perMonth: null });
  });
});
