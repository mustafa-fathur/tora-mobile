// Goals (Profile → Goals): progress toward each savings goal. A goal can follow an
// account's balance or be tracked by hand (add / take out money). + adds a goal.
import { router, Stack } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Meter } from '@/components/budgets/meter';
import { ListGroup, ListHeader, ListSkeleton, RowSeparator } from '@/components/list';
import { HeaderAction } from '@/components/nav/header-buttons';
import { LoadError } from '@/components/screen-state';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import type { Goal } from '@/lib/data/goals';
import { getGoals } from '@/lib/data/queries';
import { formatDay } from '@/lib/finance/dates';
import { goalProgress } from '@/lib/finance/goal-rules';
import { jakartaNow } from '@/lib/finance/now';
import type { Account } from '@/lib/finance/types';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';

export default function GoalsScreen() {
  const today = jakartaNow().date;
  const accounts = useCachedData(...DATA.accounts);
  const goals = useCachedData('goals', getGoals);
  const [showArchived, setShowArchived] = useState(false);
  const refresh = () => {
    accounts.refresh();
    goals.refresh();
  };
  const header = (
    <Stack.Screen options={{ headerRight: () => <HeaderAction icon={Plus} label="New goal" onPress={() => router.push('/forms/goal')} /> }} />
  );
  if (!accounts.data || !goals.data) {
    const error = accounts.error ?? goals.error;
    return (
      <>
        {header}
        {error ? <LoadError message={error} onRetry={refresh} /> : <ListSkeleton />}
      </>
    );
  }
  const accountById = new Map(accounts.data.map((a) => [a.id, a]));
  const active = goals.data.filter((g) => !g.is_archived);
  const archived = goals.data.filter((g) => g.is_archived);

  return (
    <ScrollView
      className="flex-1 bg-muted"
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={goals.refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}>
      {header}
      <ListHeader title="Goals" />
      <ListGroup>
        {active.length === 0 ? (
          <Text className="px-4 py-4 text-sm text-muted-foreground">No goals yet. Tap + to save toward something, like a laptop or an emergency fund.</Text>
        ) : (
          active.map((g, i) => (
            <View key={g.id}>
              {i > 0 && <RowSeparator />}
              <GoalRow goal={g} account={g.account_id ? accountById.get(g.account_id) : undefined} today={today} />
            </View>
          ))
        )}
      </ListGroup>
      {archived.length > 0 && (
        <>
          <Pressable onPress={() => setShowArchived((v) => !v)} accessibilityRole="button">
            <ListHeader title={`Archived (${archived.length}) ${showArchived ? '▾' : '▸'}`} />
          </Pressable>
          {showArchived && (
            <ListGroup>
              {archived.map((g, i) => (
                <View key={g.id}>
                  {i > 0 && <RowSeparator />}
                  <GoalRow goal={g} account={g.account_id ? accountById.get(g.account_id) : undefined} today={today} />
                </View>
              ))}
            </ListGroup>
          )}
        </>
      )}
    </ScrollView>
  );
}

function GoalRow({ goal, account, today }: { goal: Goal; account?: Account; today: string }) {
  const p = goalProgress(goal, account?.balance, today);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/forms/goal', params: { id: goal.id } })}
      accessibilityRole="button"
      className="gap-2 bg-background px-4 py-3 active:bg-muted">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 font-medium" numberOfLines={1}>
          {goal.name}
        </Text>
        <Text className="text-sm font-semibold">{Math.min(100, Math.round(p.ratio * 100))}%</Text>
      </View>
      <Meter ratio={p.ratio} status={p.done ? 'ok' : null} />
      <Text className="text-sm text-muted-foreground">
        {formatMoney(p.saved, goal.currency)} of {formatMoney(Number(goal.target_amount), goal.currency)}
        {account ? ` · in ${account.name}` : ''}
        {p.done ? ' · reached 🎉' : p.perMonth ? ` · ${formatMoney(p.perMonth, goal.currency)}/month to reach it by ${formatDay(goal.target_date!).slice(5)}` : ''}
      </Text>
    </Pressable>
  );
}
