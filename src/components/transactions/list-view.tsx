import { Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Chip } from '@/components/add/chip';
import { ListSkeleton } from '@/components/list';
import { LoadError } from '@/components/screen-state';
import { DaySections } from '@/components/transactions/day-sections';
import { PeriodNav, PeriodTotals } from '@/components/transactions/period-nav';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { getTransactions } from '@/lib/data/queries';
import { type CashflowContext, totals } from '@/lib/finance/cashflow';
import { formatMonth, monthRange, shiftMonth } from '@/lib/finance/dates';
import { dayGroups } from '@/lib/finance/transaction-list';
import type { Account } from '@/lib/finance/types';

/** A month of transactions, newest first, with search and an account filter. */
export function ListView({
  month,
  onMonth,
  thisMonth,
  accounts,
  ctx,
}: {
  month: string;
  onMonth: (m: string) => void;
  thisMonth: string;
  accounts: Account[];
  ctx: CashflowContext;
}) {
  const [accountId, setAccountId] = useState<string>();
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');

  // Search after a short pause in typing, not on every key.
  useEffect(() => {
    const timer = setTimeout(() => setQ(typed.trim()), 350);
    return () => clearTimeout(timer);
  }, [typed]);

  const transactions = useCachedData(`transactions:${month}:${accountId ?? ''}:${q}`, () =>
    getTransactions({ ...monthRange(month), accountId, q }),
  );

  const controls = (
    <View className="gap-3 border-b border-border bg-background px-2 pb-3">
      <PeriodNav
        title={formatMonth(month)}
        onPrev={() => onMonth(shiftMonth(month, -1))}
        onNext={() => onMonth(shiftMonth(month, 1))}
        onToday={month !== thisMonth ? () => onMonth(thisMonth) : undefined}
        prevLabel="Previous month"
        nextLabel="Next month"
      />
      <View className="justify-center px-2">
        <Input
          value={typed}
          onChangeText={setTyped}
          placeholder="Search descriptions and notes"
          autoCorrect={false}
          returnKeyType="search"
          className="pl-9 pr-9"
        />
        <View className="absolute left-5" pointerEvents="none">
          <Icon as={Search} size={16} className="text-muted-foreground" />
        </View>
        {typed ? (
          <Pressable
            onPress={() => setTyped('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            className="absolute right-2 h-10 w-10 items-center justify-center">
            <Icon as={X} size={16} className="text-muted-foreground" />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-2">
        <Chip label="All accounts" selected={!accountId} onPress={() => setAccountId(undefined)} />
        {accounts
          .filter((a) => !a.is_archived || a.id === accountId)
          .map((a) => (
            <Chip
              key={a.id}
              label={a.name}
              selected={a.id === accountId}
              onPress={() => setAccountId(a.id === accountId ? undefined : a.id)}
            />
          ))}
      </ScrollView>
    </View>
  );

  if (!transactions.data) {
    return (
      <View className="flex-1 bg-muted">
        {controls}
        {transactions.error ? (
          <LoadError message={transactions.error} onRetry={transactions.refresh} />
        ) : (
          <ListSkeleton />
        )}
      </View>
    );
  }

  const rows = transactions.data;
  const sum = totals(rows, ctx);
  return (
    <View className="flex-1 bg-muted">
      {controls}
      <DaySections
        sections={dayGroups(rows, ctx)}
        rows={rows}
        accounts={accounts}
        ctx={ctx}
        refreshing={transactions.refreshing}
        onRefresh={transactions.refresh}
        header={<PeriodTotals income={sum.income} spending={sum.spending} net={sum.net} />}
        empty={
          accountId || q ? 'No transactions match these filters this month.' : 'No transactions this month yet. Tap + to add one.'
        }
        footer={
          rows.length >= 1000 ? (
            <Text className="px-4 py-4 text-center text-xs text-muted-foreground">
              Showing the latest 1000. Use search or an account filter to narrow it down.
            </Text>
          ) : undefined
        }
      />
    </View>
  );
}
