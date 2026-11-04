// Reports (Profile → Reports): the last 3, 6 or 12 months, like the web's Reports
// page: income, spending, average spending, net worth change and history, insights,
// spending by category, and month by month.
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { CategoryBars } from '@/components/charts/category-bars';
import { NetWorthChart } from '@/components/charts/net-worth-chart';
import { InsightCards } from '@/components/home/insight-cards';
import { ListGroup, ListHeader, ListSkeleton, RowSeparator } from '@/components/list';
import { LoadError } from '@/components/screen-state';
import { SegmentedControl } from '@/components/segmented-control';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { getBalanceMovements, getBudgets, getRecurringItems, getTransactionsBetween } from '@/lib/data/queries';
import { toCategoryGroups } from '@/lib/finance/categories';
import { byGroup, byMonth, makeContext, totals } from '@/lib/finance/cashflow';
import { formatMonth, monthRange, shiftMonth } from '@/lib/finance/dates';
import { overviewInsights } from '@/lib/finance/home';
import { netWorthHistory } from '@/lib/finance/networth';
import { jakartaNow } from '@/lib/finance/now';
import { addDays } from '@/lib/finance/recurring';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';

const RANGES = [3, 6, 12] as const;
type Range = (typeof RANGES)[number];

export default function ReportsScreen() {
  const today = jakartaNow().date;
  const month = today.slice(0, 7);
  const [range, setRange] = useState<Range>(6);
  const months = useMemo(() => Array.from({ length: range }, (_, i) => shiftMonth(month, i - range + 1)), [month, range]);
  const end = monthRange(month).end;

  const accounts = useCachedData(...DATA.accounts);
  const categories = useCachedData(...DATA.categories);
  const rates = useCachedData(...DATA.rates);
  // Always load 12 months, so switching the range doesn't wait on the network.
  const rows = useCachedData(`transactions:reports:${month}`, () => getTransactionsBetween(monthRange(shiftMonth(month, -11)).start, end));
  const movements = useCachedData(`home:movements:${today}`, () => getBalanceMovements(today));
  const budgets = useCachedData(`home:budgets:${month}`, () => getBudgets(month));
  const recurring = useCachedData('home:recurring', getRecurringItems);
  const all = [accounts, categories, rates, rows, movements, budgets, recurring];
  const refresh = () => all.forEach((d) => d.refresh());
  const ctx = useMemo(
    () => (accounts.data && categories.data && rates.data ? makeContext(accounts.data, categories.data, rates.data) : undefined),
    [accounts.data, categories.data, rates.data],
  );

  if (!ctx || !rows.data || !movements.data || !budgets.data || !recurring.data) {
    const error = all.map((d) => d.error).find(Boolean);
    return error ? <LoadError message={error} onRetry={refresh} /> : <ListSkeleton rows={8} />;
  }

  const inRange = rows.data.filter((r) => r.date >= monthRange(months[0]).start);
  const t = totals(inRange, ctx);
  const groups = byGroup(inRange, ctx);
  const history = netWorthHistory(accounts.data!, movements.data, months, rates.data!);
  const change = history.length > 1 ? history.at(-1)!.netWorth - history[0].netWorth : 0;
  const monthly = byMonth(inRange, ctx, months);
  const tips = overviewInsights({
    rows: rows.data,
    today,
    ctx,
    groups: toCategoryGroups(categories.data!),
    budgets: budgets.data,
    recurring: recurring.data,
    rates: rates.data!,
    currencyOf: new Map(accounts.data!.map((a) => [a.id, a.currency])),
  });

  return (
    <ScrollView
      className="flex-1 bg-muted"
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={rows.refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}>
      <View className="gap-4 border-b border-border bg-background px-4 py-4">
        <SegmentedControl
          options={RANGES.map((r) => ({ value: String(r) as `${Range}`, label: `${r} months` }))}
          value={String(range) as `${Range}`}
          onChange={(v) => setRange(Number(v) as Range)}
        />
        <View className="flex-row">
          <Figure label={`Income, ${range} months`} value={formatMoney(t.income)} className="text-income" />
          <Figure label={`Spending, ${range} months`} value={formatMoney(t.spending)} />
        </View>
        <View className="flex-row">
          <Figure label="Average spending / month" value={formatMoney(Math.round(t.spending / range))} />
          <Figure
            label="Net worth change"
            value={formatMoney(change, 'IDR', { signed: true })}
            className={change < 0 ? 'text-destructive' : 'text-income'}
          />
        </View>
      </View>

      <ListHeader title="Net worth" />
      <View className="border-y border-border bg-background px-4 py-3">
        <NetWorthChart series={history.map((h) => ({ date: addDays(monthRange(h.month).end, -1), netWorth: h.netWorth }))} height={160} />
      </View>

      {tips.length > 0 && (
        <>
          <ListHeader title="Insights" />
          <View className="border-y border-border bg-background">
            <InsightCards items={tips} />
          </View>
        </>
      )}

      <ListHeader title={`Spending by category · avg ${formatMoney(Math.round(t.spending / range))}/month`} />
      <View className="border-y border-border bg-background">
        {groups.length === 0 ? (
          <Text className="px-4 py-4 text-sm text-muted-foreground">No spending in this period.</Text>
        ) : (
          <CategoryBars key={range} items={groups} total={t.spending} tone="expense" />
        )}
      </View>

      <ListHeader title="Month by month" />
      <ListGroup>
        {[...monthly].reverse().map((m, i) => (
          <View key={m.month}>
            {i > 0 && <RowSeparator />}
            <View className="flex-row items-center gap-3 px-4 py-3">
              <Text className="w-28 font-medium" numberOfLines={1}>
                {formatMonth(m.month)}
              </Text>
              <View className="flex-1 items-end gap-0.5">
                <Text className="text-sm">
                  <Text className="text-sm text-income">+{formatMoney(m.income)}</Text>
                  <Text className="text-sm text-muted-foreground">  −{formatMoney(m.spending)}</Text>
                </Text>
                <Text className={cn('text-sm font-semibold', m.net > 0 && 'text-income', m.net < 0 && 'text-destructive')}>
                  {formatMoney(m.net, 'IDR', { signed: true })}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ListGroup>
    </ScrollView>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className={cn('text-base font-semibold', className)} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}
