// Account writes. Ported from tora web: src/app/(app)/accounts/actions.ts @ dea6031;
// the checks live in lib/finance/account-rules.ts (tested).
import { invalidate } from '@/lib/data/cache';
import { adjustmentFor, buildAccount, type AccountInput } from '@/lib/finance/account-rules';
import { dbErrorMessage } from '@/lib/finance/form';
import { jakartaNow } from '@/lib/finance/now';
import type { Account, AccountType } from '@/lib/finance/types';
import { supabase } from '@/lib/supabase/client';

// Balances show on Accounts, Home and in Transactions' account chips.
const changed = () => invalidate('accounts', 'home', 'transactions');

/** Creates or updates an account. Returns an error message, or nothing on success. */
export async function saveAccount(input: AccountInput, types: AccountType[], editing?: Account) {
  const built = buildAccount(input, types, editing ? { currency: editing.currency, class: editing.class } : undefined);
  if (!built.ok) return built.message;
  const { error } = editing
    ? await supabase.from('accounts').update(built.fields).eq('id', editing.id)
    : await supabase.from('accounts').insert({ ...built.fields, currency: built.currency });
  if (error) return dbErrorMessage(error);
  changed();
}

/** Sets the balance by recording an adjustment for the difference (dated today). */
export async function adjustBalance(account: Account, typed: string) {
  const r = adjustmentFor(typed, account.class, account.currency, account.balance);
  if (!r.ok) return r.message;
  if (r.diff === 0) return;
  const { error } = await supabase.from('transactions').insert({
    account_id: account.id,
    kind: 'adjustment',
    amount: r.diff,
    date: jakartaNow().date,
    description: 'Balance update',
  });
  if (error) return dbErrorMessage(error);
  changed();
}

export async function setAccountArchived(id: string, archived: boolean) {
  const { error } = await supabase.from('accounts').update({ is_archived: archived }).eq('id', id);
  if (error) return dbErrorMessage(error);
  changed();
}

export async function deleteAccount(id: string) {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) return dbErrorMessage(error);
  changed();
}
