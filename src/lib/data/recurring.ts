// Recurring writes. Ported from tora web: src/app/(app)/recurring/actions.ts @ dea6031;
// checks in lib/finance/recurring-rules.ts (tested).
import { invalidate } from '@/lib/data/cache';
import { dbErrorMessage } from '@/lib/finance/form';
import { advanceFields, buildRecurring, paidTransaction, type RecurringInput } from '@/lib/finance/recurring-rules';
import type { Account } from '@/lib/finance/types';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

export type RecurringItem = Database['public']['Tables']['recurring_items']['Row'];

// "home:recurring" is the shared recurring list (Home, Transactions, Recurring).
const changed = () => invalidate('home', 'recurring', 'transactions', 'accounts');

export async function saveRecurring(input: RecurringInput, accounts: Account[], editing?: RecurringItem) {
  const built = buildRecurring(input, accounts);
  if (!built.ok) return built.message;
  const { error } = editing
    ? await supabase.from('recurring_items').update(built.row).eq('id', editing.id)
    : await supabase.from('recurring_items').insert(built.row);
  if (error) return dbErrorMessage(error);
  changed();
}

async function advance(item: RecurringItem) {
  const { error } = await supabase.from('recurring_items').update(advanceFields(item)).eq('id', item.id);
  if (error) return dbErrorMessage(error);
  changed();
}

/** Records this occurrence as a real transaction, then moves the due date forward. */
export async function markPaid(item: RecurringItem, raw: string, date: string, accounts: Account[]) {
  const built = paidTransaction(item, raw, date, accounts);
  if (!built.ok) return built.message;
  const { error } = await supabase.from('transactions').insert(built.row);
  if (error) return dbErrorMessage(error);
  return advance(item);
}

/** Moves to the next due date without recording a transaction. */
export const skipOccurrence = (item: RecurringItem) => advance(item);

export async function setRecurringActive(id: string, active: boolean) {
  const { error } = await supabase.from('recurring_items').update({ is_active: active }).eq('id', id);
  if (error) return dbErrorMessage(error);
  changed();
}

export async function deleteRecurring(id: string) {
  const { error } = await supabase.from('recurring_items').delete().eq('id', id);
  if (error) return dbErrorMessage(error);
  changed();
}
