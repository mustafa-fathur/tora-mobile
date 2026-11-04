// Ported from tora web: src/app/(app)/recurring/actions.ts @ dea6031 (saveRecurring,
// markPaid, skipOccurrence). Same checks and messages; pure so they can be tested.
// Mobile difference: amounts also accept the shorthand 45rb / 1,5jt.
import { parseAmountInput } from '@/lib/amount-input';
import { isIsoDate } from '@/lib/finance/dates';
import { type Frequency, nextDate } from '@/lib/finance/recurring';

export const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];
type Fail = { ok: false; message: string };
const fail = (message: string): Fail => ({ ok: false, message });

export type RecurringInput = {
  name: string;
  direction: 'expense' | 'income';
  amount: string;
  accountId: string;
  categoryId: string | null;
  frequency: Frequency;
  interval: string;
  nextDue: string;
  endDate: string | null;
};

export function buildRecurring(input: RecurringInput, accounts: { id: string; currency: string }[]) {
  const name = input.name.trim();
  const interval = Number(input.interval.trim() || '1');
  const endDate = input.endDate || null;
  if (!name) return fail('Give it a name, e.g. Internet or Salary.');
  if (name.length > 80) return fail('Name is too long.');
  if (!input.accountId) return fail('Choose an account.');
  if (!FREQUENCIES.includes(input.frequency)) return fail('Choose how often it repeats.');
  if (!Number.isInteger(interval) || interval < 1 || interval > 52) return fail('Repeat every 1–52.');
  if (!isIsoDate(input.nextDue)) return fail('Pick the next due date.');
  if (endDate && (!isIsoDate(endDate) || endDate < input.nextDue)) return fail('The end date must be after the next due date.');
  const account = accounts.find((a) => a.id === input.accountId);
  if (!account) return fail('That account no longer exists.');
  const amount = parseAmountInput(input.amount, account.currency);
  if (amount === null) return fail('Enter an amount greater than zero.');
  return {
    ok: true as const,
    row: {
      name,
      amount: input.direction === 'income' ? amount : -amount,
      account_id: account.id,
      category_id: input.categoryId || null,
      frequency: input.frequency,
      interval_count: interval,
      next_due_date: input.nextDue,
      end_date: endDate,
    },
  };
}

type ItemLike = {
  id: string;
  name: string;
  amount: number | string;
  account_id: string;
  category_id: string | null;
  next_due_date: string;
  frequency: Frequency;
  interval_count: number;
  end_date: string | null;
};

/** Default date for "mark paid": the due date, or today if it's due later. */
export const paidDefaultDate = (item: Pick<ItemLike, 'next_due_date'>, today: string) =>
  item.next_due_date < today ? item.next_due_date : today;

/** The transaction "mark paid" records (keeps the item's sign: bills negative). */
export function paidTransaction(item: ItemLike, raw: string, date: string, accounts: { id: string; currency: string }[]) {
  if (!isIsoDate(date)) return fail('Pick a valid date.');
  const account = accounts.find((a) => a.id === item.account_id);
  if (!account) return fail('Its account no longer exists.');
  const amount = parseAmountInput(raw, account.currency);
  if (amount === null) return fail('Enter an amount greater than zero.');
  return {
    ok: true as const,
    row: {
      account_id: item.account_id,
      amount: Number(item.amount) < 0 ? -amount : amount,
      date,
      description: item.name,
      category_id: item.category_id,
      recurring_item_id: item.id,
    },
  };
}

/** After paying or skipping: the next due date, or pause the item once past its end date. */
export function advanceFields(item: Pick<ItemLike, 'next_due_date' | 'frequency' | 'interval_count' | 'end_date'>) {
  const next = nextDate(item.next_due_date, item.frequency, item.interval_count);
  return item.end_date && next > item.end_date ? { is_active: false } : { next_due_date: next };
}
