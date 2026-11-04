// Budgets (Profile → Budgets): a month's budgets per expense group and category,
// spent vs budget (green / amber from 80% / red when over), like the web's Budgets page.
// + sets a budget; tapping a line edits it.
import { router, Stack } from 'expo-router';
import { Copy, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, SectionList, View } from 'react-native';

import { Meter } from '@/components/budgets/meter';
import { ListSkeleton, RowSeparator } from '@/components/list';
import { HeaderAction } from '@/components/nav/header-buttons';
import { LoadError } from '@/components/screen-state';
import { PeriodNav } from '@/components/transactions/period-nav';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { copyBudgets } from '@/lib/data/budgets';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { getBudgets, getTransactionsBetween } from '@/lib/data/queries';
import { budgetLines, budgetSummary, type BudgetLine } from '@/lib/finance/budgets';
import { toCategoryGroups } from '@/lib/finance/categories';
import { makeContext, spendingByCategory } from '@/lib/finance/cashflow';
import { formatMonth, monthRange, shiftMonth } from '@/lib/finance/dates';
import { jakartaNow } from '@/lib/finance/now';
import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function BudgetsScreen() {
  const thisMonth = jakartaNow().date.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const accounts = useCachedData(...DATA.accounts);
  const categories = useCachedData(...DATA.categories);
  const rates = useCachedData(...DATA.rates);
  const budgets = useCachedData(`budgets:${month}`, () => getBudgets(month));
  const rows = useCachedData(`budgets:rows:${month}`, () => {
    const { start, end } = monthRange(month);
    return getTransactionsBetween(start, end);
  });
  const all = [accounts, categories, rates, budgets, rows];
  const refresh = () => all.forEach((d) => d.refresh());
  const ctx = useMemo(
    () => (accounts.data && categories.data && rates.data ? makeContext(accounts.data, categories.data, rates.data) : undefined),
    [accounts.data, categories.data, rates.data],
  );

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <HeaderAction icon={Plus} label="Set budget" onPress={() => router.push({ pathname: '/forms/budget', params: { month } })} />
        ),
      }}
    />
  );
  const nav = (
    <View className="border-b border-border bg-background px-2 pb-2 pt-1">
      <PeriodNav
        title={formatMonth(month)}
        onPrev={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
        onToday={month !== thisMonth ? () => setMonth(thisMonth) : undefined}
        prevLabel="Previous month"
        nextLabel="Next month"
      />
    </View>
  );

  if (!ctx || !budgets.data || !rows.data) {
    const error = all.map((d) => d.error).find(Boolean);
    return (
      <View className="flex-1 bg-muted">
        {header}
        {nav}
        {error ? <LoadError message={error} onRetry={refresh} /> : <ListSkeleton />}
      </View>
    );
  }

  const groups = toCategoryGroups(categories.data!);
  const lines = budgetLines(groups, budgets.data, spendingByCategory(rows.data, ctx));
  const summary = budgetSummary(lines);
  const spentIn = summary.spent - summary.unbudgeted;
  const edit = (categoryId: string) => router.push({ pathname: '/forms/budget', params: { month, category: categoryId } });

  async function copy() {
    const error = await copyBudgets(month);
    if (error) Alert.alert('Not copied', error);
    else haptics.success();
  }

  const sections = lines.map((l) => ({ line: l, data: l.children.filter((c) => c.budget !== null || c.spent !== 0) }));

  return (
    <View className="flex-1 bg-muted">
      {header}
      {nav}
      <SectionList
        sections={sections}
        keyExtractor={(c) => c.categoryId}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={budgets.refreshing || rows.refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          <View className="gap-3 border-b border-border bg-background px-4 py-4">
            <View className="flex-row">
              <Figure label="Budgeted" value={formatMoney(summary.budget)} />
              <Figure label="Spent in budgets" value={formatMoney(spentIn)} />
            </View>
            <View className="flex-row">
              <Figure
                label={summary.budget - spentIn < 0 ? 'Over' : 'Left'}
                value={formatMoney(Math.abs(summary.budget - spentIn))}
                className={summary.budget - spentIn < 0 ? 'text-destructive' : 'text-income'}
              />
              <Figure label="Spent outside budgets" value={formatMoney(summary.unbudgeted)} />
            </View>
            {budgets.data.size === 0 && (
              <View className="gap-2 pt-1">
                <Text className="text-sm text-muted-foreground">No budgets for {formatMonth(month)} yet. Tap + to set one, or copy last month&apos;s.</Text>
                <Button variant="outline" onPress={copy}>
                  <Icon as={Copy} size={16} />
                  <Text>Copy last month</Text>
                </Button>
              </View>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="border-b border-border bg-background">
            <View className="h-3 bg-muted" />
            <LineRow
              line={section.line.total}
              title={[section.line.group.icon, section.line.group.name].filter(Boolean).join(' ')}
              bold
              hint={!section.line.ownBudget && section.line.total.budget !== null ? 'Sum of its categories' : undefined}
              onPress={() => edit(section.line.group.id)}
            />
          </View>
        )}
        renderItem={({ item, index }) => {
          const c = categories.data!.find((x) => x.id === item.categoryId);
          return (
            <View className="bg-background">
              {index > 0 && <RowSeparator inset={32} />}
              <LineRow line={item} title={c?.name ?? 'Category'} indent onPress={() => edit(item.categoryId)} />
            </View>
          );
        }}
        ListFooterComponent={<View className="h-10" />}
      />
    </View>
  );
}

function LineRow({
  line,
  title,
  bold = false,
  indent = false,
  hint,
  onPress,
}: {
  line: BudgetLine;
  title: string;
  bold?: boolean;
  indent?: boolean;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint="Set this budget" className={cn('gap-2 py-3 pr-4 active:bg-muted', indent ? 'pl-8' : 'pl-4')}>
      <View className="flex-row items-center gap-2">
        <Text className={cn('flex-1', bold && 'font-semibold')} numberOfLines={1}>
          {title}
        </Text>
        <Text className={cn('text-sm', line.status === 'over' && 'text-destructive')}>
          {formatMoney(line.spent)}
          <Text className="text-sm text-muted-foreground"> / {line.budget === null ? 'no budget' : formatMoney(line.budget)}</Text>
        </Text>
      </View>
      {line.budget !== null && <Meter ratio={line.ratio === Infinity ? 1 : (line.ratio ?? 0)} status={line.status} />}
      {hint ? <Text className="text-xs text-muted-foreground">{hint}</Text> : null}
    </Pressable>
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
