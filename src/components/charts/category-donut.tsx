import { View } from 'react-native';
import { Pie, PolarChart } from 'victory-native';

import { Text } from '@/components/ui/text';
import { compactIdr } from '@/lib/compact';
import type { Share } from '@/lib/finance/shares';
import { formatMoney } from '@/lib/money';
import { CATEGORY_COLORS, OTHER_COLOR } from '@/lib/theme';

export const shareColor = (s: Share, i: number) => (s.id === 'other' ? OTHER_COLOR : CATEGORY_COLORS[i % CATEGORY_COLORS.length]);

/** Spending by category as a donut with the total in the middle, and a legend. */
export function CategoryDonut({ shares, total, onPress }: { shares: Share[]; total: number; onPress?: (s: Share) => void }) {
  const data = shares.map((s, i) => ({ label: s.name, value: s.amount, color: shareColor(s, i) }));
  return (
    <View className="flex-row items-center gap-4">
      <View style={{ width: 132, height: 132 }}>
        <PolarChart data={data} labelKey="label" valueKey="value" colorKey="color">
          <Pie.Chart innerRadius="64%">
            {() => <Pie.Slice animate={{ type: 'timing', duration: 600 }} />}
          </Pie.Chart>
        </PolarChart>
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <Text className="text-[11px] text-muted-foreground">Spent</Text>
          <Text className="text-base font-semibold">{compactIdr(total)}</Text>
        </View>
      </View>
      <View className="flex-1 gap-2">
        {shares.map((s, i) => (
          <Text
            key={s.id}
            onPress={onPress ? () => onPress(s) : undefined}
            className="text-sm"
            numberOfLines={1}
            accessibilityLabel={`${s.name}: ${formatMoney(s.amount)}, ${Math.round(s.share * 100)}%`}>
            <Text style={{ color: shareColor(s, i) }}>● </Text>
            {[s.icon, s.name].filter(Boolean).join(' ')}
            <Text className="text-sm text-muted-foreground">  {Math.round(s.share * 100)}%</Text>
          </Text>
        ))}
      </View>
    </View>
  );
}
