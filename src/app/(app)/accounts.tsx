// Accounts (opened from Profile): net worth, then accounts by class with their
// balances. + in the header adds an account; tapping one edits it (forms/account).
import { ChevronDown, ChevronRight, Plus } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, SectionList, View } from 'react-native';

import { AccountRow } from '@/components/accounts/account-row';
import { ListSkeleton, RowSeparator } from '@/components/list';
import { HeaderAction } from '@/components/nav/header-buttons';
import { LoadError } from '@/components/screen-state';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { netWorthSummary } from '@/lib/finance/net-worth';
import type { Account } from '@/lib/finance/types';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';

function NewAccountAction() {
  return (
    <Stack.Screen
      options={{
        headerRight: () => <HeaderAction icon={Plus} label="New account" onPress={() => router.push('/forms/account')} />,
      }}
    />
  );
}

export default function AccountsScreen() {
  const accounts = useCachedData(...DATA.accounts);
  const rates = useCachedData(...DATA.rates);
  const [showArchived, setShowArchived] = useState(false);

  const refreshing = accounts.refreshing || rates.refreshing;
  const refresh = () => {
    accounts.refresh();
    rates.refresh();
  };

  if (!accounts.data || !rates.data) {
    const error = accounts.error ?? rates.error;
    return (
      <>
        <NewAccountAction />
        {error ? <LoadError message={error} onRetry={refresh} /> : <ListSkeleton />}
      </>
    );
  }

  if (accounts.data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-background p-8">
        <NewAccountAction />
        <Text className="text-lg font-medium">No accounts yet</Text>
        <Text className="text-center text-muted-foreground">
          Tap + to add where your money lives: a bank account, an e-wallet or your cash.
        </Text>
      </View>
    );
  }

  const s = netWorthSummary(accounts.data, rates.data);
  const sections: { title: string; subtotal?: number; data: Account[]; archived?: boolean }[] = [
    ...s.sections.map((x) => ({ title: x.title, subtotal: x.subtotal, data: x.items })),
    ...(s.archived.length
      ? [{ title: `Archived (${s.archived.length})`, archived: true, data: showArchived ? s.archived : [] }]
      : []),
  ];

  return (
    <>
    <NewAccountAction />
    <SectionList
      className="flex-1 bg-muted"
      sections={sections}
      keyExtractor={(a) => a.id}
      stickySectionHeadersEnabled
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}
      ListHeaderComponent={
        <View className="gap-3 border-b border-border bg-background px-4 pb-5 pt-4">
          <View className="gap-1">
            <Text className="text-sm text-muted-foreground">Net worth</Text>
            <Text className={cn('text-3xl font-semibold tracking-tight', s.netWorth < 0 && 'text-destructive')}>
              {formatMoney(s.netWorth)}
            </Text>
          </View>
          <View className="flex-row">
            <Figure label="Cash & bank" value={s.cash} />
            <Figure label="Investments" value={s.investment} />
            <Figure label="Debts" value={s.debts} />
          </View>
          {s.missing.length > 0 && (
            <Text className="text-xs text-muted-foreground">
              Not counted: no exchange rate for {s.missing.join(', ')}. Add one in Profile → Exchange rates.
            </Text>
          )}
        </View>
      }
      renderSectionHeader={({ section }) =>
        section.archived ? (
          <Pressable
            onPress={() => setShowArchived((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showArchived }}
            className="flex-row items-center gap-1.5 border-b border-border bg-muted px-4 pb-2 pt-5">
            <Icon as={showArchived ? ChevronDown : ChevronRight} size={16} className="text-muted-foreground" />
            <Text className="text-sm font-semibold text-muted-foreground">{section.title}</Text>
          </Pressable>
        ) : (
          <View className="flex-row items-end justify-between border-b border-border bg-muted px-4 pb-2 pt-5">
            <Text className="text-sm font-semibold text-muted-foreground">{section.title}</Text>
            <Text className="text-sm font-semibold">{formatMoney(section.subtotal ?? 0)}</Text>
          </View>
        )
      }
      renderItem={({ item, index }) => (
        <View className="bg-background">
          {index > 0 && <RowSeparator />}
          <Pressable
            onPress={() => router.push({ pathname: '/forms/account', params: { id: item.id } })}
            accessibilityRole="button"
            accessibilityHint="Edit, update balance, archive or delete"
            className="active:bg-muted">
            <AccountRow account={item} />
          </Pressable>
        </View>
      )}
      ListFooterComponent={<View className="h-10" />}
    />
    </>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
        {label}
      </Text>
      <Text className={cn('text-sm font-semibold', value < 0 && 'text-destructive')} numberOfLines={1} adjustsFontSizeToFit>
        {formatMoney(value)}
      </Text>
    </View>
  );
}
