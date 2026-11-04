import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, SectionList, View } from 'react-native';

import { Chip } from '@/components/add/chip';
import { Loading, LoadError } from '@/components/screen-state';
import { openTransaction } from '@/components/transactions/open-transaction';
import { TransactionRow } from '@/components/transactions/transaction-row';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { getTransactions } from '@/lib/data/queries';
import { makeContext, totals } from '@/lib/finance/cashflow';
import { formatDay, formatMonth, monthRange, shiftMonth } from '@/lib/finance/dates';
import { jakartaNow } from '@/lib/finance/now';
import { dayGroups, describeRow } from '@/lib/finance/transaction-list';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function TransactionsScreen() {
  const [month, setMonth] = useState(() => jakartaNow().date.slice(0, 7));
  const [accountId, setAccountId] = useState<string>();
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');

  // Search after a short pause in typing, not on every key.
  useEffect(() => {
    const timer = setTimeout(() => setQ(typed.trim()), 350);
    return () => clearTimeout(timer);
  }, [typed]);

  const accounts = useCachedData(...DATA.accounts);
  const categories = useCachedData(...DATA.categories);
  const rates = useCachedData(...DATA.rates);
  const transactions = useCachedData(`transactions:${month}:${accountId ?? ''}:${q}`, () =>
    getTransactions({ ...monthRange(month), accountId, q }),
  );

  const ready = accounts.data && categories.data && rates.data;
  const ctx = useMemo(
    () => (ready ? makeContext(accounts.data!, categories.data!, rates.data!) : undefined),
    [ready, accounts.data, categories.data, rates.data],
  );

  const refresh = () => {
    transactions.refresh();
    accounts.refresh();
    categories.refresh();
    rates.refresh();
  };

  const filters = (
    <View className="gap-3 border-b border-border bg-background px-4 pb-3 pt-2">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => setMonth((m) => shiftMonth(m, -1))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          className="h-9 w-9 items-center justify-center rounded-full active:bg-accent">
          <Icon as={ChevronLeft} size={20} />
        </Pressable>
        <Text className="text-base font-semibold">{formatMonth(month)}</Text>
        <Pressable
          onPress={() => setMonth((m) => shiftMonth(m, 1))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          className="h-9 w-9 items-center justify-center rounded-full active:bg-accent">
          <Icon as={ChevronRight} size={20} />
        </Pressable>
      </View>
      <View className="justify-center">
        <Input
          value={typed}
          onChangeText={setTyped}
          placeholder="Search descriptions and notes"
          autoCorrect={false}
          returnKeyType="search"
          className="pl-9 pr-9"
        />
        <View className="absolute left-3" pointerEvents="none">
          <Icon as={Search} size={16} className="text-muted-foreground" />
        </View>
        {typed ? (
          <Pressable
            onPress={() => setTyped('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            className="absolute right-0 h-10 w-10 items-center justify-center">
            <Icon as={X} size={16} className="text-muted-foreground" />
          </Pressable>
        ) : null}
      </View>
      {accounts.data && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
          <Chip label="All accounts" selected={!accountId} onPress={() => setAccountId(undefined)} />
          {accounts.data
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
      )}
    </View>
  );

  const error = transactions.error ?? accounts.error ?? categories.error ?? rates.error;
  if (!transactions.data || !ctx) {
    return (
      <View className="flex-1 bg-background">
        {filters}
        {error ? <LoadError message={error} onRetry={refresh} /> : <Loading />}
      </View>
    );
  }

  const rows = transactions.data;
  const sections = dayGroups(rows, ctx);
  const sum = totals(rows, ctx);
  const accountById = new Map(accounts.data!.map((a) => [a.id, a]));
  const categoryById = new Map(categories.data!.map((c) => [c.id, c]));

  return (
    <View className="flex-1 bg-background">
      {filters}
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={transactions.refreshing} onRefresh={refresh} colors={[COLORS.primary]} />
        }
        ListHeaderComponent={
          <View className="mx-4 mt-3 gap-1.5 rounded-md bg-muted px-3 py-2.5">
            <Total label="Income" value={sum.income} />
            <Total label="Spending" value={sum.spending} />
            <Total label="Net" value={sum.net} signed />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="flex-row justify-between bg-background px-4 pb-1.5 pt-4">
            <Text className="text-sm font-medium text-muted-foreground">{formatDay(section.date)}</Text>
            {section.net ? (
              <Text className={cn('text-sm font-medium text-muted-foreground', section.net > 0 && 'text-income')}>
                {formatMoney(section.net, 'IDR', { signed: true })}
              </Text>
            ) : null}
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            className={cn(
              'mx-4 overflow-hidden border-x border-border',
              index === 0 && 'rounded-t-xl border-t',
              index === section.data.length - 1 ? 'rounded-b-xl border-b' : 'border-b',
            )}>
            <TransactionRow
              transaction={item}
              look={describeRow(item, accountById, categoryById)}
              currency={accountById.get(item.account_id)?.currency ?? 'IDR'}
              onPress={() => openTransaction(item, rows)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View className="m-4 rounded-xl border border-dashed border-border p-8">
            <Text className="text-center text-muted-foreground">
              {accountId || q
                ? 'No transactions match these filters this month.'
                : 'No transactions this month yet. Tap + to record one.'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View className="px-4 py-4">
            {rows.length >= 1000 && (
              <Text className="text-center text-xs text-muted-foreground">
                Showing the latest 1000. Use search or an account filter to narrow it down.
              </Text>
            )}
          </View>
        }
      />
    </View>
  );
}

function Total({ label, value, signed = false }: { label: string; value: number; signed?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text
        className={cn('text-sm font-semibold', signed && value > 0 && 'text-income', signed && value < 0 && 'text-destructive')}>
        {formatMoney(value, 'IDR', signed ? { signed: true } : undefined)}
      </Text>
    </View>
  );
}
