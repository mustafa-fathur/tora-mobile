import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Meter } from '@/components/home/meter';
import { HomeSection } from '@/components/home/section';
import { Loading, LoadError } from '@/components/screen-state';
import { openTransaction } from '@/components/transactions/open-transaction';
import { TransactionRow } from '@/components/transactions/transaction-row';
import { Separator } from '@/components/ui/separator';
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
    return error ? <LoadError message={error} onRetry={refresh} /> : <Loading />;
  }

  if (accounts.data!.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-lg font-medium">Welcome to Tora 🐯</Text>
        <Text className="text-center text-muted-foreground">
          Start by adding where your money lives: a bank account, an e-wallet or your cash. Adding accounts in
          the app is coming soon.
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
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}>
      {/* This month */}
      <HomeSection title={formatMonth(month)} action="Transactions" onAction={() => router.navigate('/transactions')}>
        <View className="gap-1.5 rounded-md bg-muted px-3 py-2.5">
          <Row label="Income" value={formatMoney(t.income)} />
          <Row label="Spending" value={formatMoney(t.spending)} />
          <Row
            label="Net"
            value={formatMoney(t.net, 'IDR', { signed: true })}
            className={cn(t.net > 0 && 'text-income', t.net < 0 && 'text-destructive')}
          />
        </View>
        {missingRates.length > 0 && (
          <Text className="text-xs text-muted-foreground">
            {missingRates.join(', ')} amounts aren&apos;t included yet: add exchange rates in Settings → Exchange
            rates.
          </Text>
        )}
      </HomeSection>

      {/* Budgets */}
      <HomeSection title="Budgets" action="See all" onAction={() => router.navigate('/budgets')}>
        {lines.length === 0 ? (
          <Text className="text-sm text-muted-foreground">No budgets this month.</Text>
        ) : (
          lines.map((l) => (
            <View key={l.group.id} className="gap-1.5">
              <View className="flex-row justify-between gap-2">
                <Text className="flex-1 text-sm" numberOfLines={1}>
                  {[l.group.icon, l.group.name].filter(Boolean).join(' ')}
                </Text>
                <Text className={cn('text-sm', l.total.status === 'over' && 'text-destructive')}>
                  {formatMoney(l.total.spent)}
                  <Text className="text-sm text-muted-foreground"> / {formatMoney(l.total.budget!)}</Text>
                </Text>
              </View>
              <Meter ratio={l.total.ratio ?? 0} status={l.total.status} />
            </View>
          ))
        )}
      </HomeSection>

      {/* Coming up */}
      <HomeSection title="Coming up" action="See all" onAction={() => router.navigate('/recurring')}>
        {upcoming.length === 0 ? (
          <Text className="text-sm text-muted-foreground">Nothing due in the next {UPCOMING_DAYS} days.</Text>
        ) : (
          upcoming.slice(0, 8).map(({ item, date, overdue }, i) => {
            const amount = Number(item.amount);
            return (
              <View key={`${item.id}-${date}`}>
                {i > 0 && <Separator className="mb-2.5" />}
                <View className="flex-row items-center gap-3">
                  <Text
                    className={cn('w-20 text-sm', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}
                    numberOfLines={1}>
                    {overdue ? 'Overdue' : date === today ? 'Today' : date === tomorrow ? 'Tomorrow' : shortDay(date)}
                  </Text>
                  <Text className="flex-1 text-sm" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className={cn('text-sm font-medium', amount > 0 && 'text-income')}>
                    {formatMoney(amount, accountById.get(item.account_id)?.currency, { signed: true })}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </HomeSection>

      {/* Recent transactions */}
      <HomeSection title="Recent transactions" action="See all" onAction={() => router.navigate('/transactions')}>
        {recent.data.length === 0 ? (
          <Text className="text-sm text-muted-foreground">No transactions yet. Tap + to record one.</Text>
        ) : (
          <View className="-mx-4 -mb-4">
            {recent.data.map((r) => {
              const look = describeRow(r, accountById, ctx.categoryById);
              return (
                <View key={r.id}>
                  <Separator />
                  <TransactionRow
                    transaction={r}
                    look={{ ...look, subtitle: [shortDay(r.date), look.subtitle].filter(Boolean).join(' · ') }}
                    currency={accountById.get(r.account_id)?.currency ?? 'IDR'}
                    onPress={() => openTransaction(r, recent.data!)}
                  />
                </View>
              );
            })}
          </View>
        )}
      </HomeSection>
      <View className="h-2" />
    </ScrollView>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className={cn('text-sm font-semibold', className)}>{value}</Text>
    </View>
  );
}
