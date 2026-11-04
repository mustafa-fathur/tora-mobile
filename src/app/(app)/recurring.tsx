// Recurring (Profile → Recurring): bills and income that repeat. Like the web:
// "Due in the next 30 days", then "Later and paused". Swipe left to mark paid or skip;
// tap to edit, pause or delete.
import { router, Stack } from 'expo-router';
import { Check, Plus, SkipForward } from 'lucide-react-native';
import { Alert, Pressable, RefreshControl, SectionList, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { ListSkeleton, RowSeparator } from '@/components/list';
import { HeaderAction } from '@/components/nav/header-buttons';
import { LoadError } from '@/components/screen-state';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { getRecurringItems } from '@/lib/data/queries';
import { skipOccurrence, type RecurringItem } from '@/lib/data/recurring';
import { formatDay } from '@/lib/finance/dates';
import { jakartaNow } from '@/lib/finance/now';
import { addDays, describeFrequency } from '@/lib/finance/recurring';
import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function RecurringScreen() {
  const today = jakartaNow().date;
  const accounts = useCachedData(...DATA.accounts);
  const items = useCachedData('home:recurring', getRecurringItems); // shared with Home and Transactions
  const refresh = () => {
    accounts.refresh();
    items.refresh();
  };

  const header = (
    <Stack.Screen
      options={{ headerRight: () => <HeaderAction icon={Plus} label="New recurring" onPress={() => router.push('/forms/recurring')} /> }}
    />
  );
  if (!accounts.data || !items.data) {
    const error = accounts.error ?? items.error;
    return (
      <>
        {header}
        {error ? <LoadError message={error} onRetry={refresh} /> : <ListSkeleton />}
      </>
    );
  }

  const soon = addDays(today, 30);
  const upcoming = items.data.filter((i) => i.is_active && i.next_due_date <= soon);
  const later = items.data.filter((i) => !upcoming.includes(i));
  const accountById = new Map(accounts.data.map((a) => [a.id, a]));
  const sections = [
    { title: 'Due in the next 30 days', data: upcoming, empty: 'Nothing due in the next 30 days.' },
    ...(later.length ? [{ title: 'Later and paused', data: later, empty: '' }] : []),
  ];

  return (
    <>
      {header}
      <SectionList
        className="flex-1 bg-muted"
        sections={sections}
        keyExtractor={(i) => i.id}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={items.refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}
        renderSectionHeader={({ section }) => (
          <Text className="border-b border-border bg-muted px-4 pb-2 pt-5 text-sm font-semibold text-muted-foreground">{section.title}</Text>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 && section.empty ? (
            <Text className="bg-background px-4 py-4 text-sm text-muted-foreground">
              {items.data!.length === 0 ? 'No recurring bills or income yet. Tap + to add one, e.g. rent or salary.' : section.empty}
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => (
          <View className="bg-background">
            {index > 0 && <RowSeparator />}
            <RecurringRow item={item} today={today} currency={accountById.get(item.account_id)?.currency} account={accountById.get(item.account_id)?.name} />
          </View>
        )}
        ListFooterComponent={<View className="h-10" />}
      />
    </>
  );
}

function RecurringRow({ item, today, currency, account }: { item: RecurringItem; today: string; currency?: string; account?: string }) {
  const amount = Number(item.amount);
  const overdue = item.is_active && item.next_due_date < today;
  const actions = (_p: unknown, _t: unknown, swipe: SwipeableMethods) =>
    item.is_active ? (
      <View className="flex-row">
        <Pressable
          onPress={() => {
            swipe.close();
            router.push({ pathname: '/forms/paid', params: { id: item.id } });
          }}
          accessibilityRole="button"
          accessibilityLabel="Mark paid"
          className="w-20 items-center justify-center gap-1 bg-primary">
          <Icon as={Check} size={20} className="text-white" />
          <Text className="text-xs font-medium text-white">Paid</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            swipe.close();
            const error = await skipOccurrence(item);
            if (error) Alert.alert('Not skipped', error);
            else haptics.success();
          }}
          accessibilityRole="button"
          accessibilityLabel="Skip this one"
          className="w-20 items-center justify-center gap-1 bg-muted-foreground">
          <Icon as={SkipForward} size={20} className="text-white" />
          <Text className="text-xs font-medium text-white">Skip</Text>
        </Pressable>
      </View>
    ) : null;

  return (
    <ReanimatedSwipeable friction={2} rightThreshold={40} overshootRight={false} renderRightActions={actions} onSwipeableWillOpen={() => haptics.select()}>
      <Pressable
        onPress={() => router.push({ pathname: '/forms/recurring', params: { id: item.id } })}
        accessibilityRole="button"
        accessibilityHint="Edit, pause or delete. Swipe left to mark paid or skip."
        className={cn('flex-row items-center gap-3 bg-background px-4 py-3 active:bg-muted', !item.is_active && 'opacity-60')}>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-medium" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className={cn('text-sm', overdue ? 'text-destructive' : 'text-muted-foreground')} numberOfLines={1}>
            {item.is_active ? `${overdue ? 'Overdue · ' : ''}${formatDay(item.next_due_date)}` : 'Paused'} ·{' '}
            {describeFrequency(item.frequency, item.interval_count)}
            {account ? ` · ${account}` : ''}
          </Text>
        </View>
        <Text className={cn('font-medium', amount > 0 && 'text-income')}>{formatMoney(amount, currency, { signed: true })}</Text>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
