import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

/** ◀ title ▶ for moving between days, weeks or months, with an optional "Today" jump. */
export function PeriodNav({
  title,
  onPrev,
  onNext,
  onToday,
  prevLabel,
  nextLabel,
}: {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday?: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  const step = (fn: () => void) => () => {
    haptics.select();
    fn();
  };
  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={step(onPrev)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={prevLabel}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-muted">
        <Icon as={ChevronLeft} size={22} />
      </Pressable>
      <Text className="flex-1 text-center text-base font-semibold" numberOfLines={1}>
        {title}
      </Text>
      {onToday ? (
        <Pressable
          onPress={step(onToday)}
          hitSlop={6}
          accessibilityRole="button"
          className="mr-1 rounded-full bg-secondary px-3 py-1 active:bg-accent">
          <Text className="text-xs font-semibold text-primary">Today</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={step(onNext)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-muted">
        <Icon as={ChevronRight} size={22} />
      </Pressable>
    </View>
  );
}

/** Income / Spending / Net for a period, as one full-width row. */
export function PeriodTotals({ income, spending, net }: { income: number; spending: number; net: number }) {
  return (
    <View className="flex-row border-b border-border bg-background px-4 py-3">
      <Figure label="Income" value={formatMoney(income)} className="text-income" />
      <Figure label="Spending" value={formatMoney(spending)} />
      <Figure
        label="Net"
        value={formatMoney(net, 'IDR', { signed: true })}
        className={cn(net > 0 && 'text-income', net < 0 && 'text-destructive')}
      />
    </View>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className={cn('text-sm font-semibold', className)} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}
