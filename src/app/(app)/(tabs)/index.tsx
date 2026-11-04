import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Meter } from '@/components/home/meter';
import { ListGroup, ListHeader, ListHeaderLink, ListSkeleton, RowSeparator } from '@/components/list';
import { LoadError } from '@/components/screen-state';
import { SwipeableTransactionRow } from '@/components/transactions/swipeable-row';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { getBudgets, getRecentTransactions, getRecurringItems, getTransactionsBetween } from '@/lib/data/queries';
import { toCategoryGroups } from '@/lib/finance/categories';
import { makeContext } from '@/lib/finance/cashflow';
import { formatDay, formatMonth, monthRange } from '@/lib/finance/dates';
import { comingUp, homeTotals, topBudgets } from '@/lib/finance/home';
import { jakartaNow, shiftDay } from '@/lib/finance/now';
import { describeRow } from '@/lib/finance/transaction-list';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';

const UPCOMING_DAYS = 7;
const shortDay = (date: string) => formatDay(date).slice(0, -5); // "Fri, 6 Nov"

export default function HomeScreen() {
  const today = jakartaNow().date;
  const month = today.slice(0, 7);

  // Every key starts with "home" or a shared name, so add/edit/delete refreshes them all.
  const accounts = useCachedData(...DATA.accounts);
  const categories = useCachedData(...DATA.categories);
  const rates = useCachedData(...DATA.rates);
  const monthRows = useCachedData(`home:month:${month}`, () => {
    const { start, end } = monthRange(month);
    return getTransactionsBetween(start, end);
  });
  const budgets = useCachedData(`home:budgets:${month}`, () => getBudgets(month));
  const recurring = useCachedData('home:recurring', getRecurringItems);
  const recent = useCachedData(`home:recent:${today}`, () => getRecentTransactions(5, today));

  const all = [accounts, categories, rates, monthRows, budgets, recurring, recent];
  const refreshing = all.some((d) => d.refreshing);
  const refresh = () => all.forEach((d) => d.refresh());

  const ctx = useMemo(
    () => (accounts.data && categories.data && rates.data ? makeContext(accounts.data, categories.data, rates.data) : undefined),
    [accounts.data, categories.data, rates.data],
  );

  if (!ctx || !monthRows.data || !budgets.data || !recurring.data || !recent.data) {
    const error = all.map((d) => d.error).find(Boolean);
    return error ? <LoadError message={error} onRetry={refresh} /> : <ListSkeleton rows={8} />;
  }

  if (accounts.data!.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-lg font-medium">Welcome to Tora 🐯</Text>
        <Text className="text-center text-muted-foreground">
          Start by adding where your money lives: a bank account, an e-wallet or your cash. You&apos;ll find
          Accounts under Profile.
        </Text>
      </View>
    );
  }

  const t = homeTotals(monthRows.data, today, ctx);
  const groups = toCategoryGroups(categories.data!);
  const lines = topBudgets(groups, budgets.data, t.thisMonth, ctx);
  const upcoming = comingUp(recurring.data, today, UPCOMING_DAYS);
  const accountById = new Map(accounts.data!.map((a) => [a.id, a]));
  const missingRates = [...new Set(accounts.data!.map((a) => a.currency))].filter(
    (c) => c !== 'IDR' && !rates.data![c],
  );
  const tomorrow = shiftDay(today, 1);

  return (
    <ScrollView
      className="flex-1 bg-muted"
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}>
      {/* This month: net first, big, then income and spending side by side. */}
      <View className="gap-4 border-b border-border bg-background px-4 pb-5 pt-4">
        <View className="gap-1">
          <Text className="text-sm text-muted-foreground">Net in {formatMonth(month)}</Text>
          <Text
            className={cn('text-3xl font-semibold tracking-tight', t.net > 0 && 'text-income', t.net < 0 && 'text-destructive')}>
            {formatMoney(t.net, 'IDR', { signed: true })}
          </Text>
        </View>
        <View className="flex-row">
          <Figure label="Income" value={formatMoney(t.income)} className="text-income" />
          <View className="mx-3 w-px bg-border" />
          <Figure label="Spending" value={formatMoney(t.spending)} />
        </View>
        {missingRates.length > 0 && (
          <Text className="text-xs text-muted-foreground">
            {missingRates.join(', ')} amounts aren&apos;t included yet: add exchange rates in Profile → Exchange rates.
          </Text>
        )}
      </View>

      <ListHeader title="Budgets" right={<ListHeaderLink label="See all" onPress={() => router.push('/budgets')} />} />
      <ListGroup>
        {lines.length === 0 ? (
          <Text className="px-4 py-4 text-sm text-muted-foreground">No budgets this month.</Text>
        ) : (
          lines.map((l, i) => (
            <View key={l.group.id}>
              {i > 0 && <RowSeparator />}
              <View className="gap-2 px-4 py-3">
                <View className="flex-row justify-between gap-2">
                  <Text className="flex-1" numberOfLines={1}>
                    {[l.group.icon, l.group.name].filter(Boolean).join(' ')}
                  </Text>
                  <Text className={cn('text-sm', l.total.status === 'over' && 'text-destructive')}>
                    {formatMoney(l.total.spent)}
                    <Text className="text-sm text-muted-foreground"> / {formatMoney(l.total.budget!)}</Text>
                  </Text>
                </View>
                <Meter ratio={l.total.ratio ?? 0} status={l.total.status} />
              </View>
            </View>
          ))
        )}
      </ListGroup>

      <ListHeader
        title={`Coming up · next ${UPCOMING_DAYS} days`}
        right={<ListHeaderLink label="See all" onPress={() => router.push('/recurring')} />}
      />
      <ListGroup>
        {upcoming.length === 0 ? (
          <Text className="px-4 py-4 text-sm text-muted-foreground">Nothing due in the next {UPCOMING_DAYS} days.</Text>
        ) : (
          upcoming.slice(0, 8).map(({ item, date, overdue }, i) => {
            const amount = Number(item.amount);
            return (
              <View key={`${item.id}-${date}`}>
                {i > 0 && <RowSeparator />}
                <View className="min-h-[52px] flex-row items-center gap-3 px-4">
                  <Text
                    className={cn('w-20 text-sm', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}
                    numberOfLines={1}>
                    {overdue ? 'Overdue' : date === today ? 'Today' : date === tomorrow ? 'Tomorrow' : shortDay(date)}
                  </Text>
                  <Text className="flex-1" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className={cn('font-medium', amount > 0 && 'text-income')}>
                    {formatMoney(amount, accountById.get(item.account_id)?.currency, { signed: true })}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ListGroup>

      <ListHeader
        title="Recent transactions"
        right={<ListHeaderLink label="See all" onPress={() => router.navigate('/transactions')} />}
      />
      <ListGroup>
        {recent.data.length === 0 ? (
          <Text className="px-4 py-4 text-sm text-muted-foreground">No transactions yet. Tap + to add one.</Text>
        ) : (
          recent.data.map((r, i) => {
            const look = describeRow(r, accountById, ctx.categoryById);
            return (
              <View key={r.id}>
                {i > 0 && <RowSeparator inset={64} />}
                <SwipeableTransactionRow
                  transaction={r}
                  rows={recent.data!}
                  look={{ ...look, subtitle: [shortDay(r.date), look.subtitle].filter(Boolean).join(' · ') }}
                  currency={accountById.get(r.account_id)?.currency ?? 'IDR'}
                />
              </View>
            );
          })
        )}
      </ListGroup>
    </ScrollView>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className={cn('text-lg font-semibold', className)} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}
