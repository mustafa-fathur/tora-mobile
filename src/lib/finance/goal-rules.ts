// Ported from tora web: src/app/(app)/goals/actions.ts and goals/page.tsx @ dea6031
// (saveGoal, addToGoal, progress per goal). Pure so they can be tested.
// Mobile difference: amounts also accept the shorthand 45rb / 1,5jt.
import { parseAmountInput } from '@/lib/amount-input';
import { isIsoDate } from '@/lib/finance/dates';
import { monthsUntil } from '@/lib/finance/recurring';

type Fail = { ok: false; message: string };
const fail = (message: string): Fail => ({ ok: false, message });

export type GoalInput = { name: string; target: string; saved: string; accountId: string | null; targetDate: string | null };

export function buildGoal(input: GoalInput, accounts: { id: string; currency: string }[]) {
  const name = input.name.trim();
  if (!name) return fail('Give the goal a name.');
  if (name.length > 80) return fail('Name is too long.');
  if (input.targetDate && !isIsoDate(input.targetDate)) return fail('Pick a valid target date.');
  let currency = 'IDR';
  if (input.accountId) {
    const account = accounts.find((a) => a.id === input.accountId);
    if (!account) return fail('That account no longer exists.');
    currency = account.currency;
  }
  const target = parseAmountInput(input.target, currency);
  if (target === null) return fail('Enter a target amount greater than zero.');
  const savedRaw = input.saved.trim();
  const saved = savedRaw === '' || savedRaw === '0' ? 0 : parseAmountInput(savedRaw, currency);
  if (saved === null) return fail("Saved so far isn't a valid amount.");
  return {
    ok: true as const,
    row: {
      name,
      target_amount: target,
      currency,
      target_date: input.targetDate || null,
      account_id: input.accountId || null,
      // A goal linked to an account follows that account's balance instead.
      saved_amount: input.accountId ? 0 : saved,
    },
  };
}

/** Add money to (or take it out of) a manual goal; never below zero. */
export function movedSaved(current: number, raw: string, currency: string, withdraw: boolean) {
  const amount = parseAmountInput(raw, currency);
  if (amount === null) return fail('Enter an amount greater than zero.');
  return { ok: true as const, saved: Math.max(0, current + (withdraw ? -amount : amount)) };
}

/** Progress like the web's Goals page: linked goals use the account balance (never below 0). */
export function goalProgress(
  goal: { saved_amount: number | string; target_amount: number | string; target_date: string | null },
  accountBalance: number | undefined,
  today: string,
) {
  const saved = accountBalance !== undefined ? Math.max(0, accountBalance) : Number(goal.saved_amount);
  const target = Number(goal.target_amount);
  const left = target - saved;
  const months = goal.target_date ? monthsUntil(today, goal.target_date) : null;
  return {
    saved,
    left: Math.max(0, left),
    ratio: target > 0 ? saved / target : 0,
    perMonth: left > 0 && months ? Math.ceil(left / months) : null,
    done: left <= 0,
  };
}
