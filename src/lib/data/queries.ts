// Reads from Supabase. Ported from tora web: src/lib/data/queries.ts @ dea6031
// (getAccounts, getCategories, getRateMap). RLS limits every query to the signed-in user.
import type { Rates } from '@/lib/finance/fx';
import { recentEnd } from '@/lib/finance/home';
import type { Account, Category, Transaction } from '@/lib/finance/types';
import { supabase } from '@/lib/supabase/client';

/** Accounts with their current balance and their type's name and class, in display order. */
export async function getAccounts(): Promise<Account[]> {
  const [accounts, balances, types] = await Promise.all([
    supabase.from('accounts').select('*').order('sort_order').order('created_at'),
    supabase.from('account_balances').select('account_id, balance'),
    supabase.from('account_types').select('*').order('sort_order').order('name'),
  ]);
  if (accounts.error) throw accounts.error;
  if (balances.error) throw balances.error;
  if (types.error) throw types.error;
  const balanceOf = new Map(balances.data.map((b) => [b.account_id, Number(b.balance ?? 0)]));
  const typeOf = new Map(types.data.map((t) => [t.id, t]));
  return accounts.data.map((a) => ({
    ...a,
    balance: balanceOf.get(a.id) ?? Number(a.opening_balance),
    type_name: typeOf.get(a.type_id)?.name ?? 'Account',
    class: typeOf.get(a.type_id)?.class ?? 'cash',
  }));
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order').order('name');
  if (error) throw error;
  return data;
}

/** 1 unit of each currency in IDR, from the rates set on the web. */
export async function getRates(): Promise<Rates> {
  const { data, error } = await supabase.from('exchange_rates').select('currency, rate');
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.currency, Number(r.rate)]));
}

export type TransactionFilters = {
  start: string;
  end: string; // exclusive
  accountId?: string;
  q?: string; // matches description or notes
  categoryIds?: string[]; // a category, or a group plus its categories
  uncategorized?: boolean; // regular rows without a category
  limit?: number; // default 1000
};

/** Transactions matching the filters, newest first (at most 1000, like the web). */
export async function getTransactions(f: TransactionFilters): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .gte('date', f.start)
    .lt('date', f.end)
    .order('date', { ascending: false })
    .order('time', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (f.accountId) query = query.eq('account_id', f.accountId);
  // Same as the web's transactionsQuery.
  if (f.uncategorized) query = query.is('category_id', null).eq('kind', 'regular');
  else if (f.categoryIds?.length) query = query.in('category_id', f.categoryIds);
  if (f.q) {
    const term = f.q.replace(/[%_,()]/g, ' ').trim();
    if (term) query = query.or(`description.ilike.%${term}%,notes.ilike.%${term}%`);
  }
  const { data, error } = await query.limit(f.limit ?? 1000);
  if (error) throw error;
  return data;
}

/** One transaction plus, for a transfer, its other leg. */
export async function getTransactionWithPartner(id: string): Promise<{ row: Transaction; partner?: Transaction } | null> {
  const { data: row, error } = await supabase.from('transactions').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  if (!row.transfer_id) return { row };
  const { data: legs, error: legsError } = await supabase
    .from('transactions')
    .select('*')
    .eq('transfer_id', row.transfer_id);
  if (legsError) throw legsError;
  return { row, partner: legs.find((l) => l.id !== row.id) };
}

// The Supabase API returns at most 1000 rows per request; this pages through all of them.
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

/** Light rows for totals (every row, no cap). `end` is exclusive. */
export function getTransactionsBetween(start: string, end: string) {
  return fetchAll((from, to) =>
    supabase
      .from('transactions')
      .select('id, account_id, amount, date, kind, category_id, description')
      .gte('date', start)
      .lt('date', end)
      .order('date')
      .order('id')
      .range(from, to),
  );
}

/** Budget per category for a month ("YYYY-MM"), in IDR. */
export async function getBudgets(month: string): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('budgets').select('category_id, amount').eq('month', `${month}-01`);
  if (error) throw error;
  return new Map(data.map((b) => [b.category_id, Number(b.amount)]));
}

export async function getRecurringItems() {
  const { data, error } = await supabase
    .from('recurring_items')
    .select('*')
    .order('is_active', { ascending: false })
    .order('next_due_date');
  if (error) throw error;
  return data;
}

/** The newest transactions up to `today` (YYYY-MM-DD); future-dated rows aren't "recent" yet. */
export function getRecentTransactions(limit: number, today: string) {
  return getTransactions({ start: '1900-01-01', end: recentEnd(today), limit });
}

/** Every transaction's account, date and amount up to `until` (inclusive), for net worth over time. */
export function getBalanceMovements(until: string) {
  return fetchAll((from, to) =>
    supabase
      .from('transactions')
      .select('account_id, date, amount')
      .lte('date', until)
      .order('date')
      .order('id')
      .range(from, to),
  );
}

export async function getAccountTypes() {
  const { data, error } = await supabase.from('account_types').select('*').order('sort_order').order('name');
  if (error) throw error;
  return data;
}

/** Currencies, IDR first (like the web). */
export async function getCurrencies() {
  const { data, error } = await supabase.from('currencies').select('*').order('code');
  if (error) throw error;
  return [...data].sort((a, b) => (a.code === 'IDR' ? -1 : b.code === 'IDR' ? 1 : 0));
}

export async function getGoals() {
  const { data, error } = await supabase.from('goals').select('*').order('is_archived').order('created_at');
  if (error) throw error;
  return data;
}
