import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { LoadError } from '@/components/screen-state';
import { PeriodNav, PeriodTotals } from '@/components/transactions/period-nav';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { compactIdr } from '@/lib/compact';
import { useCachedData } from '@/lib/data/cache';
import { getTransactionsBetween } from '@/lib/data/queries';
import { calendarRange, dailyTotals } from '@/lib/finance/calendar';
import { dueBetween, monthCells, type MonthCell } from '@/lib/finance/calendar-view';
import { type CashflowContext, totals } from '@/lib/finance/cashflow';
import { formatMonth, shiftMonth } from '@/lib/finance/dates';
import { addDays } from '@/lib/finance/recurring';
import { haptics } from '@/lib/haptics';
import { COLORS } from '@/lib/theme';
import type { Database } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';

type Recurring = Database['public']['Tables']['recurring_items']['Row'];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Spending tint: the coral "spending" colour, stronger on bigger days.
const tint = (t: number) => (t > 0 ? `rgba(220, 120, 95, ${(0.08 + 0.32 * t).toFixed(2)})` : undefined);

/**
 * A calendar of the month: each day's income and spending, tinted by how much was
 * spent, and dots for recurring bills (coral) and income (green) due on coming days.
 * Tapping a day opens the Day view.
 */
export function MonthView({
  month,
  onMonth,
  onPickDay,
  today,
  ctx,
  recurring,
  onRefreshRecurring,
}: {
  month: string;
  onMonth: (m: string) => void;
  onPickDay: (date: string) => void;
  today: string;
  ctx: CashflowContext;
  recurring: Recurring[];
  onRefreshRecurring: () => void;
}) {
  const { start, end } = calendarRange('month', `${month}-01`);
  const transactions = useCachedData(`transactions:grid:${month}`, () => getTransactionsBetween(start, end));

  const nav = (
    <View className="border-b border-border bg-background px-2 pb-2">
      <PeriodNav
        title={formatMonth(month)}
        onPrev={() => onMonth(shiftMonth(month, -1))}
        onNext={() => onMonth(shiftMonth(month, 1))}
        onToday={month !== today.slice(0, 7) ? () => onMonth(today.slice(0, 7)) : undefined}
        prevLabel="Previous month"
        nextLabel="Next month"
      />
    </View>
  );

  if (!transactions.data) {
    return (
      <View className="flex-1 bg-muted">
        {nav}
        {transactions.error ? (
          <LoadError message={transactions.error} onRetry={transactions.refresh} />
        ) : (
          <View className="gap-1 bg-background p-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </View>
        )}
      </View>
    );
  }

  const rows = transactions.data;
  const weeks = monthCells(month, today, dailyTotals(rows, ctx), dueBetween(recurring, start, addDays(end, -1), today));
  const sum = totals(rows.filter((r) => r.date.startsWith(month)), ctx);

  return (
    <View className="flex-1 bg-muted">
      {nav}
      <ScrollView
        contentContainerClassName="pb-10"
        refreshControl={
          <RefreshControl
            refreshing={transactions.refreshing}
            onRefresh={() => {
              transactions.refresh();
              onRefreshRecurring();
            }}
            colors={[COLORS.primary]}
          />
        }>
        <PeriodTotals income={sum.income} spending={sum.spending} net={sum.net} />
        <View className="mt-3 border-y border-border bg-background">
          <View className="flex-row border-b border-border">
            {WEEKDAYS.map((d) => (
              <Text key={d} className="flex-1 py-1.5 text-center text-xs font-medium text-muted-foreground">
                {d}
              </Text>
            ))}
          </View>
          {weeks.map((week) => (
            <View key={week[0].date} className="flex-row border-b border-border">
              {week.map((cell) => (
                <DayCell
                  key={cell.date}
                  cell={cell}
                  onPress={() => {
                    haptics.select();
                    onPickDay(cell.date);
                  }}
                />
              ))}
            </View>
          ))}
        </View>
        <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-3">
          <Legend color="rgba(220, 120, 95, 0.4)" label="Darker = more spending" square />
          <Legend color={COLORS.expense} label="Bill due" />
          <Legend color={COLORS.income} label="Income due" />
        </View>
      </ScrollView>
    </View>
  );
}

function DayCell({ cell, onPress }: { cell: MonthCell; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${cell.date}: income ${cell.income}, spending ${cell.spending}`}
      className={cn('min-h-[68px] flex-1 items-center gap-0.5 px-0.5 pb-1 pt-1 active:bg-muted', !cell.inMonth && 'opacity-40')}
      style={{ backgroundColor: tint(cell.tint) }}>
      <View
        className={cn(
          'h-6 w-6 items-center justify-center rounded-full',
          cell.isToday ? 'bg-primary' : 'bg-transparent',
        )}>
        <Text className={cn('text-xs font-semibold', cell.isToday ? 'text-primary-foreground' : 'text-foreground')}>
          {cell.day}
        </Text>
      </View>
      {cell.income > 0 && (
        <Text className="text-[10px] font-medium text-income" numberOfLines={1}>
          +{compactIdr(cell.income)}
        </Text>
      )}
      {cell.spending > 0 && (
        <Text className="text-[10px] font-medium text-foreground" numberOfLines={1}>
          −{compactIdr(cell.spending)}
        </Text>
      )}
      {(cell.bills > 0 || cell.incomeDue > 0) && (
        <View className="flex-row gap-0.5 pt-0.5">
          {cell.bills > 0 && <View className="h-1.5 w-1.5 rounded-full bg-expense" />}
          {cell.incomeDue > 0 && <View className="h-1.5 w-1.5 rounded-full bg-income" />}
        </View>
      )}
    </Pressable>
  );
}

function Legend({ color, label, square = false }: { color: string; label: string; square?: boolean }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ backgroundColor: color, width: 10, height: 10, borderRadius: square ? 2 : 5 }} />
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}
