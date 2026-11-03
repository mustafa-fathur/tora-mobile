// Reads from Supabase. Ported from tora web: src/lib/data/queries.ts @ dea6031
// (getAccounts, getCategories, getRateMap). RLS limits every query to the signed-in user.
import type { Rates } from '@/lib/finance/fx';
import type { Account, Category } from '@/lib/finance/types';
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
