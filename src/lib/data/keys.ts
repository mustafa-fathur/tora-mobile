import { getAccounts, getAccountTypes, getCategories, getCurrencies, getRates } from '@/lib/data/queries';

// One place for cache keys and their loaders, so screens share results.
export const DATA = {
  accounts: ['accounts', getAccounts],
  categories: ['categories', getCategories],
  rates: ['rates', getRates],
  accountTypes: ['account-types', getAccountTypes],
  currencies: ['currencies', getCurrencies],
} as const;
