// Hands a tapped row from the Transactions list to the edit sheet, so it opens
// instantly instead of fetching the row again. The sheet falls back to a fetch.
import type { Transaction } from '@/lib/finance/types';

const pending = new Map<string, { row: Transaction; partner?: Transaction }>();

export function handOff(row: Transaction, partner?: Transaction) {
  pending.clear();
  pending.set(row.id, { row, partner });
}

export function peekHandOff(id: string) {
  return pending.get(id);
}
