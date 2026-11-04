import { Lightbulb, TrendingDown, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import type { Insight } from '@/lib/finance/insights';
import { cn } from '@/lib/utils';

const TONE = {
  good: { bg: 'bg-secondary', icon: TrendingDown, iconClass: 'text-primary' },
  warning: { bg: 'bg-warning/15', icon: TriangleAlert, iconClass: 'text-warning' },
  neutral: { bg: 'bg-muted', icon: Lightbulb, iconClass: 'text-muted-foreground' },
} as const;

/** Insights as cards you swipe sideways, one at a time, with dots showing where you are. */
export function InsightCards({ items }: { items: Insight[] }) {
  const { width } = useWindowDimensions();
  const cardWidth = width - 48;
  const gap = 12;
  const [index, setIndex] = useState(0);

  return (
    <View className="gap-3 py-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + gap}
        snapToAlignment="start"
        contentContainerStyle={{ paddingHorizontal: 16, gap }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + gap));
          if (i !== index) haptics.select();
          setIndex(i);
        }}>
        {items.map((it, i) => {
          const tone = TONE[it.tone];
          return (
            <View key={i} className={cn('gap-2 rounded-2xl p-4', tone.bg)} style={{ width: cardWidth, minHeight: 112 }}>
              <View className="flex-row items-center gap-2">
                <Icon as={tone.icon} size={18} className={tone.iconClass} />
                <Text className="flex-1 font-semibold" numberOfLines={2}>
                  {it.title}
                </Text>
              </View>
              <Text className="text-sm text-muted-foreground">{it.detail}</Text>
            </View>
          );
        })}
      </ScrollView>
      {items.length > 1 && (
        <View className="flex-row justify-center gap-1.5" accessibilityLabel={`Insight ${index + 1} of ${items.length}`}>
          {items.map((_, i) => (
            <View key={i} className={cn('h-1.5 rounded-full', i === index ? 'w-4 bg-primary' : 'w-1.5 bg-border')} />
          ))}
        </View>
      )}
    </View>
  );
}
