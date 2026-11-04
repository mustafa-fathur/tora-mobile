import { router } from 'expo-router';
import { Alert } from 'react-native';

import { handOff } from '@/lib/data/edit-store';
import { deleteTransaction } from '@/lib/data/transactions';
import { haptics } from '@/lib/haptics';
import type { Transaction } from '@/lib/finance/types';

/**
 * What tapping a transaction row does: open the edit sheet, or for a balance
 * update offer to delete it (balance updates can't be edited, same as the web).
 * `rows` are the other rows on screen, to find a transfer's other side without a fetch.
 */
export function openTransaction(t: Transaction, rows: Transaction[]) {
  if (t.kind === 'adjustment') return confirmDelete(t);
  const partner = t.transfer_id ? rows.find((r) => r.transfer_id === t.transfer_id && r.id !== t.id) : undefined;
  // Without the other side on screen, the sheet fetches it.
  if (t.kind === 'regular' || partner) handOff(t, partner);
  router.push({ pathname: '/add', params: { id: t.id } });
}

/** Asks first, then deletes (a transfer: both sides). */
export function confirmDelete(t: Transaction) {
  haptics.warning();
  const [title, message] =
    t.kind === 'adjustment'
      ? ['Delete this balance update?', "Balance updates can't be edited. Delete it and update the balance again if needed."]
      : t.kind === 'transfer'
        ? ['Delete this transfer?', "Both sides of the transfer will be deleted. This can't be undone."]
        : ['Delete this transaction?', "This can't be undone."];
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        const error = await deleteTransaction(t);
        if (error) Alert.alert('Not deleted', error);
        else haptics.success();
      },
    },
  ]);
}
