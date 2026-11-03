// Ported from tora web: saveTransaction in src/app/(app)/transactions/actions.ts @ dea6031
// (the "add" path; editing comes later). Same checks, messages and signed amounts.
// Kept pure (no Supabase, no React Native) so it can be unit tested; the caller
// passes the accounts and categories it already loaded (RLS limits them to the user).
import { parseAmountInput } from '@/lib/amount-input';
import { isIsoDate, isTime } from '@/lib/finance/dates';
import type { CategoryKind } from '@/lib/finance/types';
import type { TablesInsert } from '@/lib/supabase/database.types';

export type Mode = 'expense' | 'income' | 'transfer';

export type TransactionInput = {
  mode: Mode;
  accountId: string;
  toAccountId?: string; // transfer: where the money goes
  amount: string; // as typed: "45.000", "45rb", "1,5jt"
  toAmount?: string; // transfer between currencies: amount received
  categoryId?: string | null;
  refund?: boolean; // expense only: money back into an expense category
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:MM
  description?: string | null;
};

type AccountRef = { id: string; name: string; currency: string };
type CategoryRef = { id: string; kind: CategoryKind };
type Row = TablesInsert<'transactions'>;

export type BuildResult = { ok: true; rows: Row[] } | { ok: false; message: string };

const fail = (message: string): BuildResult => ({ ok: false, message });

export function buildTransactionRows(
  input: TransactionInput,
  accounts: AccountRef[],
  categories: CategoryRef[],
  newId: () => string,
): BuildResult {
  const { mode, date } = input;
  const time = input.time?.trim() || null;
  const description = input.description?.trim() || null;

  if (!['expense', 'income', 'transfer'].includes(mode)) return fail('Choose expense, income or transfer.');
  if (!isIsoDate(date)) return fail('Pick a valid date.');
  if (time && !isTime(time)) return fail('Pick a valid time, or leave it empty.');
  if (!input.accountId) return fail('Choose an account.');
  if (description && description.length > 200) return fail('Description is too long.');

  const account = accounts.find((a) => a.id === input.accountId);
  if (!account) return fail('That account no longer exists.');

  const amount = parseAmountInput(input.amount, account.currency);
  if (amount === null) return fail('Enter an amount greater than zero.');

  if (mode === 'transfer') {
    if (!input.toAccountId) return fail('Choose the account the money goes to.');
    if (input.toAccountId === account.id) return fail('Pick two different accounts.');
    const to = accounts.find((a) => a.id === input.toAccountId);
    if (!to) return fail('That account no longer exists.');

    // Different currencies need the amount that arrived, too.
    let received = amount;
    if (to.currency !== account.currency) {
      const parsed = parseAmountInput(input.toAmount ?? '', to.currency);
      if (parsed === null) return fail(`Enter the amount received in ${to.currency}.`);
      received = parsed;
    }

    // Both legs in one insert so they're saved together or not at all.
    const transferId = newId();
    const common = { kind: 'transfer' as const, transfer_id: transferId, date, time };
    return {
      ok: true,
      rows: [
        { ...common, account_id: account.id, amount: -amount, description: description ?? `Transfer to ${to.name}` },
        { ...common, account_id: to.id, amount: received, description: description ?? `Transfer from ${account.name}` },
      ],
    };
  }

  // Expense or income. A refund is money back into an expense category.
  const refund = mode === 'expense' && Boolean(input.refund);
  const categoryId = input.categoryId || null;
  if (categoryId) {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return fail('That category no longer exists.');
    if (category.kind !== mode) return fail(`Pick an ${mode} category.`);
  }

  return {
    ok: true,
    rows: [
      {
        account_id: account.id,
        kind: 'regular',
        amount: mode === 'income' || refund ? amount : -amount,
        date,
        time,
        description,
        category_id: categoryId,
      },
    ],
  };
}
