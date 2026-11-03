// Writes to the transactions table. Ported from tora web: saveTransaction and
// deleteTransaction in src/app/(app)/transactions/actions.ts @ dea6031.
import { randomUUID } from 'expo-crypto';

import { invalidate } from '@/lib/data/cache';
import { dbErrorMessage } from '@/lib/finance/form';
import { buildTransactionRows, type TransactionInput } from '@/lib/finance/transaction-rows';
import type { Account, Category, Transaction } from '@/lib/finance/types';
import { supabase } from '@/lib/supabase/client';

/** What's being edited: a regular transaction, or both legs of a transfer. */
export type Editing = { row: Transaction } | { out: Transaction; in: Transaction };

// Every screen showing transactions or balances reloads after a change.
const changed = () => invalidate('transactions', 'accounts', 'home');

/** Validates and saves a new or edited transaction. Returns an error message, or nothing on success. */
export async function saveTransaction(
  input: TransactionInput,
  accounts: Account[],
  categories: Category[],
  editing?: Editing,
): Promise<string | undefined> {
  if (editing && ('out' in editing) !== (input.mode === 'transfer')) {
    return "A transfer can't become an expense or income (or the other way round). Delete it and add a new one.";
  }
  // When editing a transfer, keep its transfer_id.
  const newId = editing && 'out' in editing ? () => editing.out.transfer_id ?? randomUUID() : randomUUID;
  const built = buildTransactionRows(input, accounts, categories, newId);
  if (!built.ok) return built.message;

  if (!editing) {
    // A transfer's two rows go in one insert, so both are saved or neither is.
    const { error } = await supabase.from('transactions').insert(built.rows);
    if (error) return dbErrorMessage(error);
  } else if ('row' in editing) {
    const { error } = await supabase.from('transactions').update(built.rows[0]).eq('id', editing.row.id);
    if (error) return dbErrorMessage(error);
  } else {
    // Same as the web: update the money-out leg, then the money-in leg.
    for (const [row, leg] of [
      [editing.out, built.rows[0]],
      [editing.in, built.rows[1]],
    ] as const) {
      const { account_id, amount, description, date, time } = leg;
      const { error } = await supabase
        .from('transactions')
        .update({ account_id, amount, description, date, time })
        .eq('id', row.id);
      if (error) {
        changed();
        return dbErrorMessage(error);
      }
    }
  }
  changed();
}

/** Deletes a transaction; for a transfer, both rows. Returns an error message, or nothing. */
export async function deleteTransaction(t: Pick<Transaction, 'id' | 'transfer_id'>): Promise<string | undefined> {
  const query = supabase.from('transactions').delete();
  const { error } = t.transfer_id ? await query.eq('transfer_id', t.transfer_id) : await query.eq('id', t.id);
  if (error) return "Couldn't delete. Please try again.";
  changed();
}
