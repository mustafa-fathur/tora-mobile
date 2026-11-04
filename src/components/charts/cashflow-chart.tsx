import { matchFont, Rect } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { BarGroup, CartesianChart, Line, type ChartBounds } from 'victory-native';

import { compactIdr } from '@/lib/compact';
import { haptics } from '@/lib/haptics';
import { COLORS } from '@/lib/theme';

export type MonthTotals = { month: string; income: number; spending: number; net: number };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (month: string) => MONTHS[Number(month.slice(5, 7)) - 1];

/**
 * Twelve months of income (green) and spending (coral) bars, with net as a line.
 * Tapping anywhere over a month selects it (a soft green band behind its bars).
 */
export function CashflowChart({
  months,
  selected,
  onSelect,
  height = 220,
}: {
  months: MonthTotals[];
  selected: number;
  onSelect: (index: number) => void;
  height?: number;
}) {
  // Axis labels use the phone's own font (no font file to bundle). If the system font
  // can't be matched (the web preview), the chart still draws, just without labels.
  const font = useMemo(() => {
    try {
      return matchFont({ fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }), fontSize: 10 });
    } catch {
      return null;
    }
  }, []);
  const [bounds, setBounds] = useState<ChartBounds | null>(null);
  const data = months.map((m, i) => ({ i, income: m.income, spending: m.spending, net: m.net }));
  const top = Math.max(1, ...months.map((m) => Math.max(m.income, m.spending, m.net)));
  const bottom = Math.min(0, ...months.map((m) => m.net));

  function pick(x: number) {
    if (!bounds || !Number.isFinite(x)) return;
    const step = (bounds.right - bounds.left) / months.length;
    const i = Math.max(0, Math.min(months.length - 1, Math.floor((x - bounds.left) / step)));
    if (!Number.isFinite(i)) return;
    if (i !== selected) haptics.select();
    onSelect(i);
  }

  // e.x is the tap's position inside the layer, on Android and the web alike.
  const tap = Gesture.Tap().onEnd((e) => {
    runOnJS(pick)(e.x);
  });

  return (
    <View style={{ height }}>
      <CartesianChart
        data={data}
        xKey="i"
        yKeys={['income', 'spending', 'net']}
        domain={{ y: [bottom, top * 1.08] }}
        domainPadding={{ left: 14, right: 14 }}
        onChartBoundsChange={setBounds}
        frame={{ lineWidth: 0 }}
        xAxis={{
          font,
          tickCount: months.length,
          lineWidth: 0,
          labelColor: COLORS.mutedForeground,
          formatXLabel: (i) => short(months[Number(i)]?.month ?? '2000-01'),
        }}
        yAxis={[
          {
            font,
            tickCount: 4,
            lineColor: COLORS.border,
            labelColor: COLORS.mutedForeground,
            formatYLabel: (v) => (Number(v) === 0 ? '0' : compactIdr(Number(v))),
          },
        ]}>
        {({ points, chartBounds }) => {
          const step = (chartBounds.right - chartBounds.left) / months.length;
          const sx = points.income[selected]?.x;
          return (
            <>
              {sx !== undefined && (
                <Rect
                  x={sx - step / 2}
                  y={chartBounds.top}
                  width={step}
                  height={chartBounds.bottom - chartBounds.top}
                  color={COLORS.secondary}
                />
              )}
              <BarGroup chartBounds={chartBounds} betweenGroupPadding={0.35} withinGroupPadding={0.12} roundedCorners={{ topLeft: 3, topRight: 3 }}>
                <BarGroup.Bar points={points.income} color={COLORS.income} animate={{ type: 'spring' }} />
                <BarGroup.Bar points={points.spending} color={COLORS.expense} animate={{ type: 'spring' }} />
              </BarGroup>
              <Line points={points.net} color={COLORS.foreground} strokeWidth={2} curveType="monotoneX" animate={{ type: 'timing', duration: 500 }} />
            </>
          );
        }}
      </CartesianChart>
      {/* A transparent layer over the plot: tapping picks the month under the finger. */}
      <GestureDetector gesture={tap}>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel="Pick a month"
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
      </GestureDetector>
    </View>
  );
}
