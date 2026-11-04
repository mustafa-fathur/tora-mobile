import { Pencil, Trash2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { confirmDelete, openTransaction } from '@/components/transactions/open-transaction';
import { TransactionRow } from '@/components/transactions/transaction-row';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import type { RowLook } from '@/lib/finance/transaction-list';
import type { Transaction } from '@/lib/finance/types';

function Action({
  label,
  icon,
  className,
  onPress,
}: {
  label: string;
  icon: typeof Pencil;
  className: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className={className}>
      <Icon as={icon} size={20} className="text-white" />
      <Text className="text-xs font-medium text-white">{label}</Text>
    </Pressable>
  );
}

/**
 * A transaction row you can tap (edit) or swipe left to reveal Edit and Delete.
 * Balance updates only offer Delete (they can't be edited).
 */
export function SwipeableTransactionRow({
  transaction,
  rows,
  look,
  currency,
}: {
  transaction: Transaction;
  rows: Transaction[];
  look: RowLook;
  currency: string;
}) {
  const editable = transaction.kind !== 'adjustment';

  const actions = (_progress: unknown, _translation: unknown, swipe: SwipeableMethods) => (
    <View className="flex-row">
      {editable && (
        <Action
          label="Edit"
          icon={Pencil}
          className="w-20 items-center justify-center gap-1 bg-primary"
          onPress={() => {
            swipe.close();
            openTransaction(transaction, rows);
          }}
        />
      )}
      <Action
        label="Delete"
        icon={Trash2}
        className="w-20 items-center justify-center gap-1 bg-destructive"
        onPress={() => {
          swipe.close();
          confirmDelete(transaction);
        }}
      />
    </View>
  );

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={actions}
      onSwipeableWillOpen={() => haptics.select()}>
      <TransactionRow
        transaction={transaction}
        look={look}
        currency={currency}
        onPress={() => openTransaction(transaction, rows)}
      />
    </ReanimatedSwipeable>
  );
}
