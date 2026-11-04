import { ChevronRight } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { RowSeparator } from '@/components/list';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { CategoryTotal } from '@/lib/finance/cashflow';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';

function Bar({ ratio, color, delay }: { ratio: number; color: string; delay: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = 0;
    width.value = withDelay(delay, withTiming(ratio, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [ratio, delay, width]);
  // The bar's width is animated on the UI thread (smooth even while JS is busy).
  const style = useAnimatedStyle(() => ({ width: `${Math.max(2, width.value * 100)}%` }));
  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <Animated.View style={[{ height: '100%', borderRadius: 999, backgroundColor: color }, style]} />
    </View>
  );
}

/** Categories as rows with bars that grow in; tapping a row opens its transactions. */
export function CategoryBars({
  items,
  total,
  tone,
  onPress,
}: {
  items: CategoryTotal[];
  total: number;
  tone: 'expense' | 'income';
  onPress?: (item: CategoryTotal) => void; // rows are tappable only when given
}) {
  const max = Math.max(...items.map((i) => i.amount), 1);
  const color = tone === 'income' ? COLORS.income : COLORS.expense;
  return (
    <View>
      {items.map((item, i) => (
        <View key={item.id}>
          {i > 0 && <RowSeparator />}
          <Pressable
            onPress={onPress ? () => onPress(item) : undefined}
            disabled={!onPress}
            accessibilityRole={onPress ? 'button' : 'text'}
            accessibilityHint={onPress ? 'Opens these transactions' : undefined}
            className="gap-2 bg-background px-4 py-3 active:bg-muted">
            <View className="flex-row items-center gap-2">
              <Text className="flex-1" numberOfLines={1}>
                {[item.icon, item.name].filter(Boolean).join(' ')}
              </Text>
              <Text className="text-sm text-muted-foreground">{total > 0 ? `${Math.round((item.amount / total) * 100)}%` : ''}</Text>
              <Text className="font-medium">{formatMoney(item.amount)}</Text>
              {onPress ? <Icon as={ChevronRight} size={16} className="text-muted-foreground" /> : null}
            </View>
            <Bar ratio={item.amount / max} color={color} delay={i * 40} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
