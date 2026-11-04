// Cash flow: 12 months of income vs spending (tap a month to select it), that
// month's numbers and savings rate, and where the money went or came from.
// Same rules as the web's Cash flow page (byMonth, byGroup, savings rate = net ÷ income).
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { CashflowChart } from '@/components/charts/cashflow-chart';
import { CategoryBars } from '@/components/charts/category-bars';
import { ListHeader } from '@/components/list';
import { LoadError } from '@/components/screen-state';
import { SegmentedControl } from '@/components/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { getTransactionsBetween } from '@/lib/data/queries';
import { byGroup, byMonth, makeContext } from '@/lib/finance/cashflow';
import { formatMonth, monthRange, shiftMonth } from '@/lib/finance/dates';
import { jakartaNow } from '@/lib/finance/now';
import { savingsRate } from '@/lib/finance/shares';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';

type Kind = 'expense' | 'income';

export default function CashFlowScreen() {
  const thisMonth = jakartaNow().date.slice(0, 7);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => shiftMonth(thisMonth, i - 11)), [thisMonth]);
  const [selected, setSelected] = useState(11); // this month
  const [kind, setKind] = useState<Kind>('expense');

  const accounts = useCachedData(...DATA.accounts);
  const categories = useCachedData(...DATA.categories);
  const rates = useCachedData(...DATA.rates);
  const rows = useCachedData(`transactions:cashflow:${thisMonth}`, () =>
    getTransactionsBetween(monthRange(months[0]).start, monthRange(thisMonth).end),
  );
  const all = [accounts, categories, rates, rows];
  const refresh = () => all.forEach((d) => d.refresh());

  const ctx = useMemo(
    () => (accounts.data && categories.data && rates.data ? makeContext(accounts.data, categories.data, rates.data) : undefined),
    [accounts.data, categories.data, rates.data],
  );

  if (!ctx || !rows.data) {
    const error = all.map((d) => d.error).find(Boolean);
    return error ? (
      <LoadError message={error} onRetry={refresh} />
    ) : (
      <View className="flex-1 gap-3 bg-background p-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </View>
    );
  }

  const monthly = byMonth(rows.data, ctx, months);
  const sel = Number.isInteger(selected) && selected >= 0 && selected < months.length ? selected : months.length - 1;
  const month = months[sel];
  const current = rows.data.filter((r) => r.date.startsWith(month));
  const t = monthly[sel];
  const rate = savingsRate(t);
  const items = byGroup(current, ctx, kind);
  const kindTotal = kind === 'expense' ? t.spending : t.income;
  const empty = monthly.every((m) => m.income === 0 && m.spending === 0);

  return (
    <ScrollView
      className="flex-1 bg-muted"
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={rows.refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}>
      <View className="gap-2 border-b border-border bg-background px-3 pb-3 pt-4">
        <View className="flex-row items-center justify-between px-1">
          <Text className="font-semibold">Last 12 months</Text>
          <View className="flex-row items-center gap-3">
            <Legend color={COLORS.income} label="Income" />
            <Legend color={COLORS.expense} label="Spending" />
            <Legend color={COLORS.foreground} label="Net" line />
          </View>
        </View>
        {empty ? (
          <Text className="px-1 py-10 text-center text-muted-foreground">
            Your income and spending will show here as you add transactions.
          </Text>
        ) : (
          <CashflowChart months={monthly} selected={sel} onSelect={setSelected} />
        )}
      </View>

      {/* The selected month */}
      <ListHeader title={formatMonth(month)} />
      <View className="flex-row flex-wrap border-y border-border bg-background px-4 py-3">
        <Figure label="Income" value={formatMoney(t.income)} className="text-income" />
        <Figure label="Spending" value={formatMoney(t.spending)} />
        <Figure
          label="Net"
          value={formatMoney(t.net, 'IDR', { signed: true })}
          className={cn(t.net > 0 && 'text-income', t.net < 0 && 'text-destructive')}
        />
        <Figure label="Saved" value={rate === null ? '–' : `${rate}%`} className={cn(rate !== null && rate < 0 && 'text-destructive')} />
      </View>

      <View className="bg-muted px-4 pb-2 pt-5">
        <SegmentedControl
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
          value={kind}
          onChange={setKind}
        />
      </View>
      <View className="border-y border-border bg-background">
        {items.length === 0 ? (
          <Text className="px-4 py-4 text-sm text-muted-foreground">
            {kind === 'expense' ? 'No spending' : 'No income'} in {formatMonth(month)}.
          </Text>
        ) : (
          <CategoryBars
            key={`${month}-${kind}`}
            items={items}
            total={kindTotal}
            tone={kind}
            onPress={(item) => router.navigate({ pathname: '/transactions', params: { month, category: item.id } })}
          />
        )}
      </View>
    </ScrollView>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <View className="w-1/2 gap-0.5 py-1.5">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className={cn('text-lg font-semibold', className)} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function Legend({ color, label, line = false }: { color: string; label: string; line?: boolean }) {
  return (
    <View className="flex-row items-center gap-1">
      <View style={{ backgroundColor: color, width: line ? 12 : 8, height: line ? 2 : 8, borderRadius: line ? 1 : 2 }} />
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}
