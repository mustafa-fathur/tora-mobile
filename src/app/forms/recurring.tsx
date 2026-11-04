// New or edit a recurring item (`/forms/recurring?id=…`). Editing also offers
// mark paid, skip, pause / resume and delete. Rules: lib/finance/recurring-rules.ts.
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Pause, Play, SkipForward, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { AccountChips } from '@/components/add/account-chips';
import { CategoryField } from '@/components/add/category-picker';
import { ChoiceField, DateField, FormSheet, TextField } from '@/components/form-sheet';
import { ListSkeleton } from '@/components/list';
import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { getRecurringItems } from '@/lib/data/queries';
import { deleteRecurring, saveRecurring, setRecurringActive, skipOccurrence, type RecurringItem } from '@/lib/data/recurring';
import { toCategoryGroups } from '@/lib/finance/categories';
import { jakartaNow } from '@/lib/finance/now';
import type { Frequency } from '@/lib/finance/recurring';
import type { Account, Category } from '@/lib/finance/types';
import { haptics } from '@/lib/haptics';

const FREQ: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Day' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
];

export default function RecurringFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const accounts = useCachedData(...DATA.accounts);
  const categories = useCachedData(...DATA.categories);
  const items = useCachedData('home:recurring', getRecurringItems);
  if (!accounts.data || !categories.data || !items.data) {
    return (
      <FormSheet title={id ? 'Edit recurring' : 'New recurring'}>
        <ListSkeleton rows={4} header={false} />
      </FormSheet>
    );
  }
  const editing = id ? items.data.find((i) => i.id === id) : undefined;
  return <RecurringForm key={id ?? 'new'} editing={editing} accounts={accounts.data} categories={categories.data} />;
}

function RecurringForm({ editing, accounts, categories }: { editing?: RecurringItem; accounts: Account[]; categories: Category[] }) {
  const groups = useMemo(() => toCategoryGroups(categories), [categories]);
  const active = accounts.filter((a) => !a.is_archived || a.id === editing?.account_id);
  const [name, setName] = useState(editing?.name ?? '');
  const [direction, setDirection] = useState<'expense' | 'income'>(editing && Number(editing.amount) > 0 ? 'income' : 'expense');
  const [amount, setAmount] = useState(editing ? String(Math.abs(Number(editing.amount))).replace('.', ',') : '');
  const [accountId, setAccountId] = useState(editing?.account_id ?? active[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(editing?.category_id ?? null);
  const [frequency, setFrequency] = useState<Frequency>(editing?.frequency ?? 'monthly');
  const [interval, setInterval] = useState(String(editing?.interval_count ?? 1));
  const [nextDue, setNextDue] = useState<string | null>(editing?.next_due_date ?? jakartaNow().date);
  const [endDate, setEndDate] = useState<string | null>(editing?.end_date ?? null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function run(task: () => Promise<string | undefined>) {
    setSaving(true);
    setError(undefined);
    const message = await task();
    setSaving(false);
    if (message) return setError(message);
    haptics.success();
    router.back();
  }
  const save = () =>
    run(() =>
      saveRecurring(
        { name, direction, amount, accountId, categoryId, frequency, interval, nextDue: nextDue ?? '', endDate },
        accounts,
        editing,
      ),
    );

  return (
    <FormSheet title={editing ? 'Edit recurring' : 'New recurring'} onSave={save} saving={saving} error={error}>
      <SegmentedControl
        options={[
          { value: 'expense', label: 'Bill' },
          { value: 'income', label: 'Income' },
        ]}
        value={direction}
        onChange={(d) => {
          setDirection(d);
          setCategoryId(null);
        }}
      />
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Internet, Netflix, Salary" autoFocus={!editing} maxLength={80} />
      <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 350rb" />
      <AccountChips label="Account" accounts={active} value={accountId} onChange={setAccountId} />
      <CategoryField groups={groups} categories={categories} kind={direction} value={categoryId} onChange={setCategoryId} />
      <View className="gap-2">
        <Text className="text-sm font-medium">Repeats every</Text>
        <View className="flex-row items-center gap-3">
          <View className="w-20">
            <TextField label="Every" value={interval} onChangeText={setInterval} keyboardType="number-pad" maxLength={2} />
          </View>
          <View className="flex-1">
            <ChoiceField label="Unit" options={FREQ} value={frequency} onChange={setFrequency} />
          </View>
        </View>
      </View>
      <DateField label="Next due date" value={nextDue} onChange={setNextDue} />
      <DateField label="Ends (optional)" value={endDate} onChange={setEndDate} optional placeholder="No end date" />

      {editing && (
        <View className="gap-2 pt-2">
          {editing.is_active && (
            <>
              <Button onPress={() => router.replace({ pathname: '/forms/paid', params: { id: editing.id } })}>
                <Icon as={Check} size={16} className="text-primary-foreground" />
                <Text>Mark paid</Text>
              </Button>
              <Button variant="outline" onPress={() => run(() => skipOccurrence(editing))} disabled={saving}>
                <Icon as={SkipForward} size={16} />
                <Text>Skip this one</Text>
              </Button>
            </>
          )}
          <Button variant="outline" onPress={() => run(() => setRecurringActive(editing.id, !editing.is_active))} disabled={saving}>
            <Icon as={editing.is_active ? Pause : Play} size={16} />
            <Text>{editing.is_active ? 'Pause' : 'Resume'}</Text>
          </Button>
          <Button
            variant="ghost"
            disabled={saving}
            onPress={() => {
              haptics.warning();
              Alert.alert(`Delete ${editing.name}?`, "Past transactions stay. This can't be undone.", [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteRecurring(editing.id)) },
              ]);
            }}>
            <Icon as={Trash2} size={16} className="text-destructive" />
            <Text className="text-destructive">Delete</Text>
          </Button>
        </View>
      )}
    </FormSheet>
  );
}
