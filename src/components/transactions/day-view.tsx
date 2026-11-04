import { View } from 'react-native';

import { ListSkeleton, RowSeparator } from '@/components/list';
import { LoadError } from '@/components/screen-state';
import { DaySections } from '@/components/transactions/day-sections';
import { PeriodNav, PeriodTotals } from '@/components/transactions/period-nav';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { getTransactions } from '@/lib/data/queries';
import { dueBetween } from '@/lib/finance/calendar-view';
import { type CashflowContext, totals } from '@/lib/finance/cashflow';
import { formatDay } from '@/lib/finance/dates';
import { addDays } from '@/lib/finance/recurring';
import { dayGroups } from '@/lib/finance/transaction-list';
import type { Account } from '@/lib/finance/types';
import { formatMoney } from '@/lib/money';
import type { Database } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';

type Recurring = Database['public']['Tables']['recurring_items']['Row'];

/** One day: its transactions and totals, plus recurring items due that day (today or later). */
export function DayView({
  date,
  onDate,
  today,
  accounts,
  ctx,
  recurring,
}: {
  date: string;
  onDate: (d: string) => void;
  today: string;
  accounts: Account[];
  ctx: CashflowContext;
  recurring: Recurring[];
}) {
  const transactions = useCachedData(`transactions:day:${date}`, () =>
    getTransactions({ start: date, end: addDays(date, 1) }),
  );
  const due = dueBetween(recurring, date, date, today);
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));

  const nav = (
    <View className="border-b border-border bg-background px-2 pb-2">
      <PeriodNav
        title={date === today ? `Today, ${formatDay(date).slice(5, -5)}` : formatDay(date)}
        onPrev={() => onDate(addDays(date, -1))}
        onNext={() => onDate(addDays(date, 1))}
        onToday={date !== today ? () => onDate(today) : undefined}
        prevLabel="Previous day"
        nextLabel="Next day"
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
  const sum = totals(rows, ctx);
  return (
    <View className="flex-1 bg-muted">
      {nav}
      <DaySections
        sections={dayGroups(rows, ctx)}
        rows={rows}
        accounts={accounts}
        ctx={ctx}
        refreshing={transactions.refreshing}
        onRefresh={transactions.refresh}
        header={
          <View>
            <PeriodTotals income={sum.income} spending={sum.spending} net={sum.net} />
            {due.length > 0 && (
              <View>
                <Text className="bg-muted px-4 pb-1.5 pt-4 text-sm font-semibold text-muted-foreground">Due</Text>
                <View className="border-y border-border bg-background">
                  {due.map(({ item }, i) => {
                    const amount = Number(item.amount);
                    return (
                      <View key={item.id}>
                        {i > 0 && <RowSeparator />}
                        <View className="min-h-[48px] flex-row items-center gap-3 px-4">
                          <Text className="flex-1" numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text className={cn('font-medium', amount > 0 && 'text-income')}>
                            {formatMoney(amount, currencyOf.get(item.account_id), { signed: true })}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        }
        empty="No transactions on this day."
      />
    </View>
  );
}
