import { describe, expect, it } from 'vitest';

import { adjustmentFor, buildAccount, signedBalance } from '@/lib/finance/account-rules';

const types = [
  { id: 'bank', class: 'cash' as const },
  { id: 'stocks', class: 'investment' as const },
  { id: 'card', class: 'liability' as const },
];
const input = { name: 'BCA', typeId: 'bank', currency: 'IDR', openingBalance: '1.250.000', institution: ' BCA ', includeInNetWorth: true };
const msg = (r: { ok: boolean; message?: string }) => (r.ok ? null : r.message);

describe('signedBalance', () => {
  it('stores debts negative and treats empty as zero', () => {
    expect(signedBalance('500.000', 'liability', 'IDR')).toBe(-500000);
    expect(signedBalance('500.000', 'cash', 'IDR')).toBe(500000);
    expect(signedBalance('', 'cash', 'IDR')).toBe(0);
    expect(signedBalance('abc', 'cash', 'IDR')).toBeNull();
  });
});

describe('buildAccount', () => {
  it('builds the fields like the web', () => {
    expect(buildAccount(input, types)).toEqual({
      ok: true,
      currency: 'IDR',
      fields: { name: 'BCA', type_id: 'bank', opening_balance: 1250000, institution: 'BCA', include_in_net_worth: true },
    });
    expect(buildAccount({ ...input, typeId: 'card', openingBalance: '2jt' }, types)).toMatchObject({ fields: { opening_balance: -2000000 } });
    expect(buildAccount({ ...input, typeId: 'card', openingBalance: '2.000.000' }, types)).toMatchObject({ fields: { opening_balance: -2000000 } });
  });

  it('rejects bad input with the web messages', () => {
    expect(msg(buildAccount({ ...input, name: ' ' }, types))).toBe('Give the account a name.');
    expect(msg(buildAccount({ ...input, name: 'x'.repeat(81) }, types))).toBe('Name is too long (80 characters max).');
    expect(msg(buildAccount({ ...input, typeId: '' }, types))).toBe('Choose an account type.');
    expect(msg(buildAccount({ ...input, typeId: 'gone' }, types))).toBe('That account type no longer exists.');
    expect(msg(buildAccount({ ...input, openingBalance: 'x' }, types))).toBe("Opening balance isn't a valid amount.");
  });

  it("keeps the currency and won't switch between debt and asset when editing", () => {
    expect(buildAccount({ ...input, currency: 'USD' }, types, { currency: 'IDR', class: 'cash' })).toMatchObject({ currency: 'IDR' });
    expect(msg(buildAccount({ ...input, typeId: 'card' }, types, { currency: 'IDR', class: 'cash' }))).toMatch(/can't switch between a debt type/);
    expect(buildAccount({ ...input, typeId: 'stocks' }, types, { currency: 'IDR', class: 'cash' })).toMatchObject({ ok: true });
  });
});

describe('adjustmentFor', () => {
  it('records the difference to the new balance', () => {
    expect(adjustmentFor('1.500.000', 'cash', 'IDR', 1250000)).toEqual({ ok: true, diff: 250000 });
    expect(adjustmentFor('300.000', 'liability', 'IDR', -500000)).toEqual({ ok: true, diff: 200000 }); // paid down a card
    expect(adjustmentFor('1.250.000', 'cash', 'IDR', 1250000)).toEqual({ ok: true, diff: 0 });
    expect(msg(adjustmentFor('?', 'cash', 'IDR', 0))).toBe("New balance isn't a valid amount.");
  });
});
