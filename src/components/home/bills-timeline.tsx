import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatDay } from '@/lib/finance/dates';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';

type Item = { key: string; date: string; name: string; amount: number; currency?: string; overdue: boolean };

/** Bills and income coming up, as a vertical timeline: a dot per item on a line. */
export function BillsTimeline({ items, today, tomorrow }: { items: Item[]; today: string; tomorrow: string }) {
  return (
    <View className="px-4 py-2">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const dot = it.overdue ? COLORS.destructive : it.amount > 0 ? COLORS.income : COLORS.expense;
        return (
          <View key={it.key} className="flex-row gap-3">
            {/* The rail: a dot, and a line down to the next item */}
            <View className="w-3 items-center">
              <View className="mt-1.5 h-3 w-3 rounded-full border-2 bg-background" style={{ borderColor: dot }} />
              {!last && <View className="w-0.5 flex-1 bg-border" />}
            </View>
            <View className={cn('flex-1 flex-row items-start justify-between gap-3', last ? 'pb-1' : 'pb-4')}>
              <View className="flex-1">
                <Text className={cn('text-xs font-medium', it.overdue ? 'text-destructive' : 'text-muted-foreground')}>
                  {it.overdue
                    ? `Overdue · ${formatDay(it.date).slice(0, -5)}`
                    : it.date === today
                      ? 'Today'
                      : it.date === tomorrow
                        ? 'Tomorrow'
                        : formatDay(it.date).slice(0, -5)}
                </Text>
                <Text className="text-base" numberOfLines={1}>
                  {it.name}
                </Text>
              </View>
              <Text className={cn('pt-3 font-medium', it.amount > 0 && 'text-income')}>
                {formatMoney(it.amount, it.currency, { signed: true })}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
