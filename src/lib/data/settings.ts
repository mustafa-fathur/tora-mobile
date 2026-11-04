// Settings writes. Ported from tora web: src/app/(app)/settings/actions.ts @ dea6031;
// checks in lib/finance/settings-rules.ts (tested).
import { invalidate } from '@/lib/data/cache';
import { dbErrorMessage } from '@/lib/finance/form';
import { ACCOUNT_TYPE_IN_USE, buildAccountType, buildCategory, parseRate, ratesFromApi } from '@/lib/finance/settings-rules';
import type { AccountClass, AccountType, Category, CategoryKind } from '@/lib/finance/types';
import { supabase } from '@/lib/supabase/client';

// Categories and types label rows everywhere; rates change every IDR total.
const changedAll = () => invalidate('categories', 'account-types', 'accounts', 'rates', 'home', 'transactions', 'budgets');

export async function saveCategory(
  input: { name: string; icon: string; parentId: string | null; kind: CategoryKind },
  categories: Category[],
  editing?: Category,
) {
  const built = buildCategory(input, categories, !!editing);
  if (!built.ok) return built.message;
  const { error } = built.update
    ? await supabase.from('categories').update(built.update).eq('id', editing!.id)
    : await supabase.from('categories').insert(built.insert!);
  if (error) return dbErrorMessage(error);
  changedAll();
}

/** Transactions become uncategorized and its budgets go; deleting a group deletes its categories. */
export async function deleteCategory(id: string) {
  const { error: childError } = await supabase.from('categories').delete().eq('parent_id', id);
  if (childError) return dbErrorMessage(childError);
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return dbErrorMessage(error);
  changedAll();
}

export async function saveAccountType(input: { name: string; cls: AccountClass }, editing?: AccountType) {
  let usedBy = 0;
  if (editing && editing.class !== input.cls) {
    const { count } = await supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('type_id', editing.id);
    usedBy = count ?? 0;
  }
  const built = buildAccountType(input, editing, usedBy);
  if (!built.ok) return built.message;
  const { error } = editing
    ? await supabase.from('account_types').update(built.row).eq('id', editing.id)
    : await supabase.from('account_types').insert({ ...built.row, sort_order: 999 });
  if (error) return dbErrorMessage(error);
  changedAll();
}

export async function deleteAccountType(id: string) {
  const { error } = await supabase.from('account_types').delete().eq('id', id);
  if (error?.code === '23503') return ACCOUNT_TYPE_IN_USE;
  if (error) return dbErrorMessage(error);
  changedAll();
}

/** Saves typed rates (1 CODE = x IDR); an empty field removes that rate. */
export async function saveRates(typed: Record<string, string>) {
  for (const [currency, raw] of Object.entries(typed)) {
    if (!/^[A-Z]{3}$/.test(currency) || currency === 'IDR') continue;
    const r = parseRate(raw, currency);
    if (!r.ok) return r.message;
    const { error } =
      r.rate === null
        ? await supabase.from('exchange_rates').delete().eq('currency', currency)
        : await supabase.from('exchange_rates').upsert({ currency, rate: r.rate, source: 'manual' }, { onConflict: 'user_id,currency' });
    if (error) return dbErrorMessage(error);
  }
  changedAll();
}

/** Fetches today's rates from open.er-api.com (free, no key), like the web. Returns [error, updated count]. */
export async function fetchRates(currencies: string[]): Promise<[string | undefined, number]> {
  const wanted = currencies.filter((c) => /^[A-Z]{3}$/.test(c) && c !== 'IDR');
  if (!wanted.length) return ['No foreign currencies to update.', 0];
  let rows: ReturnType<typeof ratesFromApi>;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/IDR');
    rows = res.ok ? ratesFromApi(wanted, await res.json()) : null;
  } catch {
    rows = null;
  }
  if (!rows) return ["Couldn't reach the exchange rate service. Try again later or enter rates by hand.", 0];
  const { error } = await supabase.from('exchange_rates').upsert(rows, { onConflict: 'user_id,currency' });
  if (error) return [dbErrorMessage(error), 0];
  changedAll();
  return [undefined, rows.length];
}
