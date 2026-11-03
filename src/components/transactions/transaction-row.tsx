import { ArrowLeftRight, Scale } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { RowLook } from '@/lib/finance/transaction-list';
import type { Transaction } from '@/lib/finance/types';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

/** One transaction: icon, title, time · category · account, and the signed amount. */
export function TransactionRow({
  transaction,
  look,
  currency,
  onPress,
}: {
  transaction: Transaction;
  look: RowLook;
  currency: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={transaction.kind === 'adjustment' ? 'Delete this balance update' : 'Edit this transaction'}
      className="flex-row items-center gap-3 bg-card px-4 py-3 active:bg-muted">
      <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        {look.icon === 'transfer' ? (
          <Icon as={ArrowLeftRight} size={16} className="text-muted-foreground" />
        ) : look.icon === 'adjustment' ? (
          <Icon as={Scale} size={16} className="text-muted-foreground" />
        ) : (
          <Text className="text-base">{look.icon}</Text>
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-medium" numberOfLines={1}>
          {look.title}
        </Text>
        {look.subtitle ? (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {look.subtitle}
          </Text>
        ) : null}
      </View>
      <Text
        className={cn(
          'shrink-0 font-medium',
          look.tone === 'income' && 'text-income',
          look.tone === 'muted' && 'text-muted-foreground',
        )}>
        {formatMoney(Number(transaction.amount), currency, { signed: true })}
      </Text>
    </Pressable>
  );
}
