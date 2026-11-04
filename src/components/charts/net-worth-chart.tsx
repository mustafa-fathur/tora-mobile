import { Circle, LinearGradient, vec } from '@shopify/react-native-skia';
import { useState } from 'react';
import { View } from 'react-native';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { Area, CartesianChart, Line, useChartPressState } from 'victory-native';

import { Text } from '@/components/ui/text';
import { formatDay } from '@/lib/finance/dates';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';

type Point = { date: string; netWorth: number };

/**
 * Net worth over time as a soft green area. Drag a finger across it to read a day's
 * value. The series always has the same number of points, so switching ranges
 * morphs the shape smoothly instead of jumping.
 */
export function NetWorthChart({ series, height = 140 }: { series: Point[]; height?: number }) {
  const data = series.map((p, i) => ({ i, y: p.netWorth }));
  const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });
  const [touchedIndex, setTouchedIndex] = useState(-1);
  const touched = touchedIndex >= 0 ? (series[touchedIndex] ?? null) : null;

  // Runs on the UI thread while the finger moves; only the index crosses to JS.
  useAnimatedReaction(
    () => (isActive ? Math.round(state.x.value.value) : -1),
    (i, prev) => {
      if (i !== prev) runOnJS(setTouchedIndex)(i);
    },
    [isActive],
  );

  const values = series.map((p) => p.netWorth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat line sits in the middle instead of at the bottom edge.
  const pad = max === min ? Math.max(1, Math.abs(max) * 0.1) : (max - min) * 0.15;

  return (
    <View>
      <Text className="h-5 text-xs text-muted-foreground">
        {touched ? `${formatDay(touched.date)} · ${formatMoney(touched.netWorth)}` : ' '}
      </Text>
      <View style={{ height }}>
        <CartesianChart
          data={data}
          xKey="i"
          yKeys={['y']}
          domain={{ y: [min - pad, max + pad] }}
          chartPressState={state}
          frame={{ lineWidth: 0 }}
          xAxis={{ lineWidth: 0, tickCount: 0 }}
          yAxis={[{ lineWidth: 0, tickCount: 0 }]}>
          {({ points, chartBounds }) => (
            <>
              <Area points={points.y} y0={chartBounds.bottom} curveType="monotoneX" animate={{ type: 'timing', duration: 500 }}>
                <LinearGradient
                  start={vec(0, chartBounds.top)}
                  end={vec(0, chartBounds.bottom)}
                  colors={['rgba(17, 92, 59, 0.28)', 'rgba(17, 92, 59, 0.02)']}
                />
              </Area>
              <Line
                points={points.y}
                color={COLORS.primary}
                strokeWidth={2.5}
                curveType="monotoneX"
                animate={{ type: 'timing', duration: 500 }}
              />
              {isActive && <Circle cx={state.x.position} cy={state.y.y.position} r={5} color={COLORS.primary} />}
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}
