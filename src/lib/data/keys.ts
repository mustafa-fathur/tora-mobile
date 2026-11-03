import { getAccounts, getCategories, getRates } from '@/lib/data/queries';

// One place for cache keys and their loaders, so screens share results.
export const DATA = {
  accounts: ['accounts', getAccounts],
  categories: ['categories', getCategories],
  rates: ['rates', getRates],
} as const;
