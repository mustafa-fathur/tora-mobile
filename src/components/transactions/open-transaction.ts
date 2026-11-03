import { router } from 'expo-router';
import { Alert } from 'react-native';

import { handOff } from '@/lib/data/edit-store';
import { deleteTransaction } from '@/lib/data/transactions';
import type { Transaction } from '@/lib/finance/types';

/**
 * What tapping a transaction row does (Transactions tab and Home): open the edit
 * sheet, or for a balance update offer to delete it (they can't be edited, like the web).
 * `rows` are the other rows on screen, to find a transfer's other side without a fetch.
 */
export function openTransaction(t: Transaction, rows: Transaction[]) {
  if (t.kind === 'adjustment') return confirmDeleteAdjustment(t);
  const partner = t.transfer_id ? rows.find((r) => r.transfer_id === t.transfer_id && r.id !== t.id) : undefined;
  // Without the other side on screen, the sheet fetches it.
  if (t.kind === 'regular' || partner) handOff(t, partner);
  router.push({ pathname: '/add', params: { id: t.id } });
}

function confirmDeleteAdjustment(t: Transaction) {
  Alert.alert(
    'Delete this balance update?',
    'Balance updates can’t be edited. Delete it and update the balance again from Accounts on the web if needed.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const message = await deleteTransaction(t);
          if (message) Alert.alert('Not deleted', message);
        },
      },
    ],
  );
}
