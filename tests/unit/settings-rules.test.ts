import { describe, expect, it } from 'vitest';

import { buildAccountType, buildCategory, parseRate, ratesFromApi } from '@/lib/finance/settings-rules';

const groups = [
  { id: 'food', kind: 'expense' as const, parent_id: null },
  { id: 'groceries', kind: 'expense' as const, parent_id: 'food' },
  { id: 'income', kind: 'income' as const, parent_id: null },
];
const msg = (r: { ok: boolean; message?: string }) => (r.ok ? null : r.message);

describe('buildCategory', () => {
  it('creates groups and categories (a category takes its group kind)', () => {
    expect(buildCategory({ name: ' Pets ', icon: '🐶', parentId: null, kind: 'expense' }, groups, false)).toEqual({
      ok: true, insert: { name: 'Pets', icon: '🐶', parent_id: null, kind: 'expense', sort_order: 999 },
    });
    expect(buildCategory({ name: 'Bonus', icon: '', parentId: 'income', kind: 'expense' }, groups, false)).toMatchObject({ insert: { kind: 'income', icon: null } });
    expect(buildCategory({ name: 'Sayur', icon: '', parentId: 'food', kind: 'expense' }, groups, true)).toEqual({ ok: true, update: { name: 'Sayur', icon: null } });
  });
  it('rejects bad input with the web messages', () => {
    expect(msg(buildCategory({ name: '', icon: '', parentId: null, kind: 'expense' }, groups, false))).toBe('Give it a name.');
    expect(msg(buildCategory({ name: 'x'.repeat(61), icon: '', parentId: null, kind: 'expense' }, groups, false))).toBe('Name is too long (60 characters max).');
    expect(msg(buildCategory({ name: 'A', icon: 'abcde', parentId: null, kind: 'expense' }, groups, false))).toBe('Use a single emoji as the icon.');
    expect(msg(buildCategory({ name: 'A', icon: '', parentId: 'groceries', kind: 'expense' }, groups, false))).toBe('Choose a valid group.');
  });
});

describe('buildAccountType', () => {
  it("won't change the kind while accounts use the type", () => {
    expect(buildAccountType({ name: 'Card', cls: 'liability' })).toEqual({ ok: true, row: { name: 'Card', class: 'liability' } });
    expect(msg(buildAccountType({ name: 'Card', cls: 'cash' }, { class: 'liability' }, 2))).toBe("Its kind can't change while 2 accounts use it.");
    expect(msg(buildAccountType({ name: 'Card', cls: 'cash' }, { class: 'liability' }, 1))).toBe("Its kind can't change while 1 account uses it.");
    expect(buildAccountType({ name: 'Card', cls: 'cash' }, { class: 'liability' }, 0)).toMatchObject({ ok: true });
    expect(msg(buildAccountType({ name: 'x'.repeat(41), cls: 'cash' }))).toBe('Name is too long (40 characters max).');
  });
});

describe('rates', () => {
  it('reads typed rates the Indonesian way; empty removes', () => {
    expect(parseRate('16.250', 'USD')).toEqual({ ok: true, rate: 16250 });
    expect(parseRate('16250,5', 'USD')).toEqual({ ok: true, rate: 16250.5 });
    expect(parseRate('', 'USD')).toEqual({ ok: true, rate: null });
    expect(msg(parseRate('abc', 'USD'))).toBe("The rate for USD isn't a valid number.");
  });
  it('turns the API (1 IDR = x CODE) into 1 CODE = x IDR', () => {
    expect(ratesFromApi(['USD', 'IDR', 'XYZ'], { result: 'success', rates: { USD: 0.0000625, IDR: 1 } })).toEqual([
      { currency: 'USD', rate: 16000, source: 'api' },
    ]);
    expect(ratesFromApi(['USD'], { result: 'error' })).toBeNull();
  });
});
