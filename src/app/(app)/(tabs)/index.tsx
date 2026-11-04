// Home: net worth (counts up, with a chart and ranges), this month, insights,
// spending by category, budgets, what's coming up, and recent transactions.
// Numbers follow the web's dashboard rules (src/lib/finance/*).
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { BudgetRing } from '@/components/charts/budget-ring';
import { CategoryDonut } from '@/components/charts/category-donut';
import { CountUp } from '@/components/charts/count-up';
import { NetWorthChart } from '@/components/charts/net-worth-chart';
import { BillsTimeline } from '@/components/home/bills-timeline';
import { InsightCards } from '@/components/home/insight-cards';
import { ListGroup, ListHeader, ListHeaderLink, ListSkeleton, RowSeparator } from '@/components/list';
import { LoadError } from '@/components/screen-state';
import { SegmentedControl } from '@/components/segmented-control';
import { SwipeableTransactionRow } from '@/components/transactions/swipeable-row';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import {
  getBalanceMovements,
  getBudgets,
  getRecentTransactions,
  getRecurringItems,
  getTransactionsBetween,
} from '@/lib/data/queries';
import { budgetLines } from '@/lib/finance/budgets';
import { toCategoryGroups } from '@/lib/finance/categories';
import { byGroup, makeContext, spendingByCategory } from '@/lib/finance/cashflow';
import { formatDay, formatMonth, monthRange, shiftMonth } from '@/lib/finance/dates';
import { toBase } from '@/lib/finance/fx';
import { comingUp, homeTotals } from '@/lib/finance/home';
import { insights } from '@/lib/finance/insights';
import { netWorthSummary } from '@/lib/finance/net-worth';
import {
  hasHistory,
  NET_WORTH_RANGES,
  netWorthSeries,
  rangeDates,
  seriesChange,
  type NetWorthRange,
} from '@/lib/finance/net-worth-series';
import { jakartaNow, shiftDay } from '@/lib/finance/now';
import { topShares } from '@/lib/finance/shares';
import { describeRow } from '@/lib/finance/transaction-list';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';

const UPCOMING_DAYS = 7;
const INSIGHT_BILL_DAYS = 14; // same horizon as the web's insights
const shortDay = (date: string) => formatDay(date).slice(0, -5); // "Fri, 6 Nov"
const RANGE_TEXT: Record<NetWorthRange, string> = {
  '1M': 'in the last month',
  '3M': 'in the last 3 months',
  '6M': 'in the last 6 months',
  '1Y': 'in the last year',
};

export default function HomeScreen() {
  const today = jakartaNow().date;
  const month = today.slice(0, 7);
  const prevMonth = shiftMonth(month, -1);
  const [range, setRange] = useState<NetWorthRange>('6M');

  // Every key starts with "home" or a shared name, so add/edit/delete refreshes them all.
  const accounts = useCachedData(...DATA.accounts);
  const categories = useCachedData(...DATA.categories);
  const rates = useCachedData(...DATA.rates);
  const rows = useCachedData(`home:rows:${month}`, () =>
    getTransactionsBetween(monthRange(prevMonth).start, monthRange(month).end),
  );
  const movements = useCachedData(`home:movements:${today}`, () => getBalanceMovements(today));
  const budgets = useCachedData(`home:budgets:${month}`, () => getBudgets(month));
  const recurring = useCachedData('home:recurring', getRecurringItems);
  const recent = useCachedData(`home:recent:${today}`, () => getRecentTransactions(5, today));

  const all = [accounts, categories, rates, rows, movements, budgets, recurring, recent];
  const refreshing = all.some((d) => d.refreshing);
  const refresh = () => all.forEach((d) => d.refresh());

  const ctx = useMemo(
    () => (accounts.data && categories.data && rates.data ? makeContext(accounts.data, categories.data, rates.data) : undefined),
    [accounts.data, categories.data, rates.data],
  );

  const series = useMemo(
    () =>
      accounts.data && movements.data && rates.data
        ? netWorthSeries(accounts.data, movements.data, rangeDates(range, today), rates.data)
        : [],
    [accounts.data, movements.data, rates.data, range, today],
  );

  if (!ctx || !rows.data || !movements.data || !budgets.data || !recurring.data || !recent.data) {
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

  // --- Numbers (same rules as the web's dashboard and overview) ---
  const t = homeTotals(rows.data, today, ctx);
  const day = Number(today.slice(8, 10));
  const lastMonth = rows.data.filter((r) => r.date.startsWith(prevMonth));
  const lastMonthSamePeriod = lastMonth.filter((r) => Number(r.date.slice(8, 10)) <= day);
  const groups = toCategoryGroups(categories.data!);
  const lines = budgetLines(groups, budgets.data, spendingByCategory(t.thisMonth, ctx));
  const topLines = lines
    .filter((l) => l.total.budget !== null)
    .sort((a, b) => (b.total.ratio ?? 0) - (a.total.ratio ?? 0))
    .slice(0, 3);
  const currencyOf = new Map(accounts.data!.map((a) => [a.id, a.currency]));
  const billsSoon = comingUp(recurring.data, today, INSIGHT_BILL_DAYS).filter((u) => Number(u.item.amount) < 0);
  const tips = insights({
    ctx,
    thisMonth: t.thisMonth,
    lastMonthSamePeriod,
    lastMonth,
    overBudget: lines
      .filter((l) => l.total.status === 'over')
      .map((l) => ({ name: l.group.name, over: -(l.total.remaining ?? 0) })),
    upcomingBills: {
      total: billsSoon.reduce((s, u) => s - (toBase(Number(u.item.amount), currencyOf.get(u.item.account_id) ?? 'IDR', rates.data!) ?? 0), 0),
      count: billsSoon.length,
      days: INSIGHT_BILL_DAYS,
    },
    uncategorized: t.thisMonth.filter((r) => r.kind === 'regular' && !r.category_id).length,
  });
  const shares = topShares(byGroup(t.thisMonth, ctx, 'expense'));
  const upcoming = comingUp(recurring.data, today, UPCOMING_DAYS);
  const accountById = new Map(accounts.data!.map((a) => [a.id, a]));
  const summary = netWorthSummary(accounts.data!, rates.data!);
  const change = seriesChange(series);
  const missingRates = [...new Set(accounts.data!.map((a) => a.currency))].filter((c) => c !== 'IDR' && !rates.data![c]);

  return (
    <ScrollView
      className="flex-1 bg-muted"
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}>
      {/* Net worth: counts up, with its trend */}
      <View className="gap-2 border-b border-border bg-background px-4 pb-4 pt-4">
        <Text className="text-sm text-muted-foreground">Net worth</Text>
        <CountUp
          value={summary.netWorth}
          style={{ fontSize: 34, fontWeight: '700', letterSpacing: -0.5, color: summary.netWorth < 0 ? COLORS.destructive : COLORS.foreground }}
        />
        {hasHistory(series) ? (
          <Text className={cn('text-sm font-medium', change.amount >= 0 ? 'text-income' : 'text-destructive')}>
            {formatMoney(change.amount, 'IDR', { signed: true })}
            {change.ratio !== null ? ` (${change.ratio >= 0 ? '+' : ''}${(change.ratio * 100).toFixed(1).replace('.', ',')}%)` : ''}
            <Text className="text-sm text-muted-foreground"> {RANGE_TEXT[range]}</Text>
          </Text>
        ) : (
          <Text className="text-sm text-muted-foreground">Your trend fills in as you add transactions.</Text>
        )}
        <NetWorthChart series={series} />
        <SegmentedControl
          options={NET_WORTH_RANGES.map((r) => ({ value: r, label: r }))}
          value={range}
          onChange={setRange}
        />
      </View>

      {/* This month */}
      <ListHeader title={formatMonth(month)} right={<ListHeaderLink label="Cash flow" onPress={() => router.navigate('/cash-flow')} />} />
      <View className="flex-row border-y border-border bg-background px-4 py-3">
        <Figure label="Income" value={t.income} className="text-income" />
        <Figure label="Spending" value={t.spending} />
        <Figure label="Net" value={t.net} signed className={cn(t.net > 0 && 'text-income', t.net < 0 && 'text-destructive')} />
      </View>
      {missingRates.length > 0 && (
        <Text className="px-4 pt-2 text-xs text-muted-foreground">
          {missingRates.join(', ')} amounts aren&apos;t included yet: add exchange rates in Profile → Exchange rates.
        </Text>
      )}

      {tips.length > 0 && (
        <>
          <ListHeader title="Insights" />
          <View className="border-y border-border bg-background">
            <InsightCards items={tips} />
          </View>
        </>
      )}

      <ListHeader title="Spending by category" />
      <View className="border-y border-border bg-background px-4 py-4">
        {shares.length === 0 ? (
          <Text className="text-sm text-muted-foreground">No spending yet this month.</Text>
        ) : (
          <CategoryDonut
            shares={shares}
            total={t.spending}
            onPress={(s) => {
              if (s.id !== 'other') router.navigate({ pathname: '/transactions', params: { month, category: s.id } });
            }}
          />
        )}
      </View>

      <ListHeader title="Budgets" right={<ListHeaderLink label="See all" onPress={() => router.push('/budgets')} />} />
      <View className="border-y border-border bg-background px-2 py-4">
        {topLines.length === 0 ? (
          <Text className="px-2 text-sm text-muted-foreground">No budgets this month.</Text>
        ) : (
          <View className="flex-row">
            {topLines.map((l) => (
              <BudgetRing
                key={l.group.id}
                label={[l.group.icon, l.group.name].filter(Boolean).join(' ')}
                ratio={l.total.ratio === Infinity ? 1 : (l.total.ratio ?? 0)}
                status={l.total.status}
                spent={l.total.spent}
                budget={l.total.budget!}
              />
            ))}
          </View>
        )}
      </View>

      <ListHeader
        title={`Coming up · next ${UPCOMING_DAYS} days`}
        right={<ListHeaderLink label="See all" onPress={() => router.push('/recurring')} />}
      />
      <ListGroup>
        {upcoming.length === 0 ? (
          <Text className="px-4 py-4 text-sm text-muted-foreground">Nothing due in the next {UPCOMING_DAYS} days.</Text>
        ) : (
          <BillsTimeline
            today={today}
            tomorrow={shiftDay(today, 1)}
            items={upcoming.slice(0, 8).map(({ item, date, overdue }) => ({
              key: `${item.id}-${date}`,
              date,
              name: item.name,
              amount: Number(item.amount),
              currency: currencyOf.get(item.account_id),
              overdue,
            }))}
          />
        )}
      </ListGroup>

      <ListHeader title="Recent transactions" right={<ListHeaderLink label="See all" onPress={() => router.navigate('/transactions')} />} />
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

function Figure({ label, value, signed = false, className }: { label: string; value: number; signed?: boolean; className?: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className={cn('text-base font-semibold', className)} numberOfLines={1} adjustsFontSizeToFit>
        {formatMoney(value, 'IDR', signed ? { signed: true } : undefined)}
      </Text>
    </View>
  );
}
