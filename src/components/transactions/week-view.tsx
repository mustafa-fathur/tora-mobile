import { View } from 'react-native';

import { ListSkeleton } from '@/components/list';
import { LoadError } from '@/components/screen-state';
import { DaySections } from '@/components/transactions/day-sections';
import { PeriodNav, PeriodTotals } from '@/components/transactions/period-nav';
import { useCachedData } from '@/lib/data/cache';
import { getTransactions } from '@/lib/data/queries';
import { calendarTitle, dailyTotals, weekDays, weekStart } from '@/lib/finance/calendar';
import { type CashflowContext, totals } from '@/lib/finance/cashflow';
import { addDays } from '@/lib/finance/recurring';
import type { DaySection } from '@/lib/finance/transaction-list';
import type { Account } from '@/lib/finance/types';

/** Monday to Sunday: every day with its total, including days without transactions. */
export function WeekView({
  date,
  onDate,
  today,
  accounts,
  ctx,
}: {
  date: string;
  onDate: (d: string) => void;
  today: string;
  accounts: Account[];
  ctx: CashflowContext;
}) {
  const start = weekStart(date);
  const transactions = useCachedData(`transactions:week:${start}`, () =>
    getTransactions({ start, end: addDays(start, 7) }),
  );

  const nav = (
    <View className="border-b border-border bg-background px-2 pb-2">
      <PeriodNav
        title={calendarTitle('week', date)}
        onPrev={() => onDate(addDays(start, -7))}
        onNext={() => onDate(addDays(start, 7))}
        onToday={weekStart(today) !== start ? () => onDate(today) : undefined}
        prevLabel="Previous week"
        nextLabel="Next week"
      />
    </View>
  );

  if (!transactions.data) {
    return (
      <View className="flex-1 bg-muted">
        {nav}
        {transactions.error ? <LoadError message={transactions.error} onRetry={transactions.refresh} /> : <ListSkeleton />}
      </View>
    );
  }

  const rows = transactions.data;
  const byDay = dailyTotals(rows, ctx);
  const sections: DaySection[] = weekDays(start).map((d) => ({
    date: d,
    net: byDay[d] ? Math.round((byDay[d].income - byDay[d].spending) * 100) / 100 : 0,
    data: rows.filter((r) => r.date === d),
  }));
  const sum = totals(rows, ctx);
  return (
    <View className="flex-1 bg-muted">
      {nav}
      <DaySections
        sections={sections}
        rows={rows}
        accounts={accounts}
        ctx={ctx}
        refreshing={transactions.refreshing}
        onRefresh={transactions.refresh}
        header={<PeriodTotals income={sum.income} spending={sum.spending} net={sum.net} />}
        emptyDayText="No transactions"
      />
    </View>
  );
}
