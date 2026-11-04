// Ported from tora web: src/app/(app)/accounts/actions.ts @ dea6031 (saveAccount,
// adjustBalance). Same checks and messages; pure so they can be tested.
// One mobile difference: amounts also accept the shorthand 45rb / 1,5jt.
import { isLiability } from '@/lib/finance/accounts';
import type { AccountClass } from '@/lib/finance/types';
import { parseAmountInput } from '@/lib/amount-input';

// Balances typed in the form are positive ("amount owed" for debts); debts are stored negative.
export function signedBalance(raw: string, cls: AccountClass, currency: string) {
  const s = raw.trim();
  if (s === '' || s === '0') return 0;
  const value = parseAmountInput(s, currency); // also accepts 45rb / 1,5jt, like quick Add
  if (value === null) return null;
  return isLiability(cls) ? -value : value;
}

export type AccountInput = {
  name: string;
  typeId: string;
  currency: string;
  openingBalance: string;
  institution: string;
  includeInNetWorth: boolean;
};

type Fail = { ok: false; message: string };

export function buildAccount(
  input: AccountInput,
  types: { id: string; class: AccountClass }[],
  current?: { currency: string; class: AccountClass }, // when editing
):
  | Fail
  | {
      ok: true;
      fields: {
        name: string;
        type_id: string;
        opening_balance: number;
        institution: string | null;
        include_in_net_worth: boolean;
      };
      currency: string;
    } {
  const name = input.name.trim();
  if (!name) return { ok: false, message: 'Give the account a name.' };
  if (name.length > 80) return { ok: false, message: 'Name is too long (80 characters max).' };
  if (!input.typeId) return { ok: false, message: 'Choose an account type.' };
  const type = types.find((t) => t.id === input.typeId);
  if (!type) return { ok: false, message: 'That account type no longer exists.' };

  let currency = input.currency || 'IDR';
  if (current) {
    // Moving between an asset and a debt type would flip the meaning of every amount.
    if (current.class !== type.class && (current.class === 'liability' || type.class === 'liability')) {
      return { ok: false, message: "An account can't switch between a debt type and an asset type. Create a new account instead." };
    }
    currency = current.currency; // the currency can't change once created
  }
  const opening = signedBalance(input.openingBalance, type.class, currency);
  if (opening === null) return { ok: false, message: "Opening balance isn't a valid amount." };
  return {
    ok: true,
    currency,
    fields: {
      name,
      type_id: type.id,
      opening_balance: opening,
      institution: input.institution.trim() || null,
      include_in_net_worth: input.includeInNetWorth,
    },
  };
}

/** The adjustment that moves `balance` to the typed target; 0 means nothing to record. */
export function adjustmentFor(raw: string, cls: AccountClass, currency: string, balance: number): Fail | { ok: true; diff: number } {
  const target = signedBalance(raw, cls, currency);
  if (target === null) return { ok: false, message: "New balance isn't a valid amount." };
  return { ok: true, diff: Math.round((target - balance) * 100) / 100 };
}

/** What the form shows for a stored balance: positive, debts as the amount owed. */
export const typedBalance = (stored: number, cls: AccountClass) => String(Math.abs(stored)).replace('.', ',');
