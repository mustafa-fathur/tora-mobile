import { randomUUID } from 'expo-crypto';

import { dbErrorMessage } from '@/lib/finance/form';
import { buildTransactionRows, type TransactionInput } from '@/lib/finance/transaction-rows';
import type { Account, Category } from '@/lib/finance/types';
import { supabase } from '@/lib/supabase/client';

/** Validates and saves a new transaction. Returns an error message, or nothing on success. */
export async function addTransaction(
  input: TransactionInput,
  accounts: Account[],
  categories: Category[],
): Promise<string | undefined> {
  const built = buildTransactionRows(input, accounts, categories, randomUUID);
  if (!built.ok) return built.message;
  // A transfer's two rows go in one insert, so both are saved or neither is.
  const { error } = await supabase.from('transactions').insert(built.rows);
  if (error) return dbErrorMessage(error);
}
