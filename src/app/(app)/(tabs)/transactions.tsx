// Transactions, four ways: List (a month, searchable), Day, Week, and Month (a
// calendar). Tapping a day in the calendar opens it in Day; Android's back button
// then returns to the calendar.
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, View } from 'react-native';

import { ListSkeleton } from '@/components/list';
import { LoadError } from '@/components/screen-state';
import { SegmentedControl } from '@/components/segmented-control';
import { DayView } from '@/components/transactions/day-view';
import { ListView } from '@/components/transactions/list-view';
import { MonthView } from '@/components/transactions/month-view';
import { WeekView } from '@/components/transactions/week-view';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { getRecurringItems } from '@/lib/data/queries';
import { makeContext } from '@/lib/finance/cashflow';
import { jakartaNow } from '@/lib/finance/now';

type View_ = 'list' | 'day' | 'week' | 'month';

const VIEWS: { value: View_; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export default function TransactionsScreen() {
  const today = jakartaNow().date;
  const [view, setView] = useState<View_>('list');
  const [date, setDate] = useState(today); // the day / week / month being shown
  const [listMonth, setListMonth] = useState(today.slice(0, 7));
  const [fromCalendar, setFromCalendar] = useState(false);
  const [category, setCategory] = useState<string>();

  // Opened from Cash flow or Home with ?month=&category=: show that month's list,
  // filtered. (Adjusting state while rendering is React's pattern for "a prop changed".)
  const params = useLocalSearchParams<{ month?: string; category?: string }>();
  const incoming = params.category ? `${params.month ?? ''}|${params.category}` : undefined;
  const [applied, setApplied] = useState<string>();
  if (incoming && incoming !== applied) {
    setApplied(incoming);
    setView('list');
    setFromCalendar(false);
    if (params.month && /^\d{4}-\d{2}$/.test(params.month)) setListMonth(params.month);
    setCategory(params.category);
  }

  const accounts = useCachedData(...DATA.accounts);
  const categories = useCachedData(...DATA.categories);
  const rates = useCachedData(...DATA.rates);
  const recurring = useCachedData('home:recurring', getRecurringItems); // shared with Home

  const ctx = useMemo(
    () => (accounts.data && categories.data && rates.data ? makeContext(accounts.data, categories.data, rates.data) : undefined),
    [accounts.data, categories.data, rates.data],
  );

  // Android back: from a day opened in the calendar, go back to the calendar.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (view === 'day' && fromCalendar) {
          setView('month');
          setFromCalendar(false);
          return true; // handled
        }
        return false;
      });
      return () => sub.remove();
    }, [view, fromCalendar]),
  );

  function changeView(v: View_) {
    setView(v);
    setFromCalendar(false);
  }

  const error = accounts.error ?? categories.error ?? rates.error;
  let body: React.ReactNode;
  if (!ctx || !recurring.data) {
    body = error ? (
      <LoadError message={error} onRetry={() => [accounts, categories, rates, recurring].forEach((d) => d.refresh())} />
    ) : (
      <ListSkeleton />
    );
  } else if (view === 'list') {
    body = (
      <ListView
        month={listMonth}
        onMonth={setListMonth}
        thisMonth={today.slice(0, 7)}
        accounts={accounts.data!}
        categories={categories.data!}
        ctx={ctx}
        category={category}
        onClearCategory={() => {
          setCategory(undefined);
          setApplied(undefined);
          router.setParams({ month: undefined, category: undefined });
        }}
      />
    );
  } else if (view === 'day') {
    body = <DayView date={date} onDate={setDate} today={today} accounts={accounts.data!} ctx={ctx} recurring={recurring.data} />;
  } else if (view === 'week') {
    body = <WeekView date={date} onDate={setDate} today={today} accounts={accounts.data!} ctx={ctx} />;
  } else {
    body = (
      <MonthView
        month={date.slice(0, 7)}
        onMonth={(m) => setDate(m === today.slice(0, 7) ? today : `${m}-01`)}
        onPickDay={(d) => {
          setDate(d);
          setView('day');
          setFromCalendar(true);
        }}
        today={today}
        ctx={ctx}
        recurring={recurring.data}
        onRefreshRecurring={recurring.refresh}
      />
    );
  }

  return (
    <View className="flex-1 bg-muted">
      <View className="bg-background px-4 pb-2 pt-3">
        <SegmentedControl options={VIEWS} value={view} onChange={changeView} />
      </View>
      {body}
    </View>
  );
}
