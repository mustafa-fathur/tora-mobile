import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { compactIdr } from '@/lib/compact';
import type { BudgetStatus } from '@/lib/finance/budgets';
import { COLORS } from '@/lib/theme';

const SIZE = 76;
const STROKE = 8;

/** One budget as a ring that fills to the share used (green, amber from 80%, red when over). */
export function BudgetRing({
  label,
  ratio,
  status,
  spent,
  budget,
}: {
  label: string;
  ratio: number;
  status: BudgetStatus | null;
  spent: number;
  budget: number;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(1, ratio)), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [ratio, progress]);

  // A circle path starting at 12 o'clock; Skia draws only the part from 0 to `end`.
  const path = useMemo(() => {
    const r = (SIZE - STROKE) / 2;
    // Skia 2.x paths are immutable: build one with a PathBuilder.
    return Skia.PathBuilder.Make()
      .addArc({ x: STROKE / 2, y: STROKE / 2, width: r * 2, height: r * 2 }, -90, 359.9)
      .build();
  }, []);
  const color = status === 'over' ? COLORS.destructive : status === 'warning' ? COLORS.warning : COLORS.primary;

  return (
    <View className="flex-1 items-center gap-1.5" accessibilityLabel={`${label}: ${Math.round(ratio * 100)}% used`}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Canvas style={{ width: SIZE, height: SIZE }}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={(SIZE - STROKE) / 2} style="stroke" strokeWidth={STROKE} color={COLORS.muted} />
          <Path path={path} style="stroke" strokeWidth={STROKE} strokeCap="round" color={color} start={0} end={progress} />
        </Canvas>
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <Text className="text-sm font-semibold" style={{ color: status === 'over' ? COLORS.destructive : COLORS.foreground }}>
            {Math.round(ratio * 100)}%
          </Text>
        </View>
      </View>
      <Text className="text-sm font-medium" numberOfLines={1}>
        {label}
      </Text>
      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
        {compactIdr(spent)} / {compactIdr(budget)}
      </Text>
    </View>
  );
}
