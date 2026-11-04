// New or edit a goal (`/forms/goal?id=…`). Editing also offers add / take out money
// (manual goals), archive and delete. Rules: lib/finance/goal-rules.ts.
import { router, useLocalSearchParams } from 'expo-router';
import { Archive, ArchiveRestore, Minus, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Chip } from '@/components/add/chip';
import { DateField, FormSheet, TextField } from '@/components/form-sheet';
import { ListSkeleton } from '@/components/list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { deleteGoal, saveGoal, setGoalArchived, type Goal } from '@/lib/data/goals';
import { DATA } from '@/lib/data/keys';
import { getGoals } from '@/lib/data/queries';
import type { Account } from '@/lib/finance/types';
import { haptics } from '@/lib/haptics';

export default function GoalFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const accounts = useCachedData(...DATA.accounts);
  const goals = useCachedData('goals', getGoals);
  if (!accounts.data || !goals.data) {
    return (
      <FormSheet title={id ? 'Edit goal' : 'New goal'}>
        <ListSkeleton rows={3} header={false} />
      </FormSheet>
    );
  }
  const editing = id ? goals.data.find((g) => g.id === id) : undefined;
  return <GoalForm key={id ?? 'new'} editing={editing} accounts={accounts.data} />;
}

function GoalForm({ editing, accounts }: { editing?: Goal; accounts: Account[] }) {
  const [name, setName] = useState(editing?.name ?? '');
  const [target, setTarget] = useState(editing ? String(Number(editing.target_amount)).replace('.', ',') : '');
  const [saved, setSaved] = useState(editing && !editing.account_id ? String(Number(editing.saved_amount)).replace('.', ',') : '');
  const [accountId, setAccountId] = useState<string | null>(editing?.account_id ?? null);
  const [targetDate, setTargetDate] = useState<string | null>(editing?.target_date ?? null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const selectable = accounts.filter((a) => (!a.is_archived && a.class !== 'liability') || a.id === accountId);

  async function run(task: () => Promise<string | undefined>) {
    setSaving(true);
    setError(undefined);
    const message = await task();
    setSaving(false);
    if (message) return setError(message);
    haptics.success();
    router.back();
  }
  const save = () => run(() => saveGoal({ name, target, saved, accountId, targetDate }, accounts, editing));

  return (
    <FormSheet title={editing ? 'Edit goal' : 'New goal'} onSave={save} saving={saving} error={error}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Laptop, Emergency fund" autoFocus={!editing} maxLength={80} />
      <TextField label="Target amount" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="e.g. 15jt" />
      <View className="gap-2">
        <Label>Track it with</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
          <Chip label="By hand" selected={!accountId} onPress={() => setAccountId(null)} />
          {selectable.map((a) => (
            <Chip key={a.id} label={a.name} selected={a.id === accountId} onPress={() => setAccountId(a.id)} />
          ))}
        </ScrollView>
        <Text className="text-sm text-muted-foreground">
          {accountId ? "Progress follows this account's balance." : 'You add or take out money yourself.'}
        </Text>
      </View>
      {!accountId && (
        <TextField label="Saved so far" value={saved} onChangeText={setSaved} keyboardType="decimal-pad" placeholder="0" />
      )}
      <DateField label="Target date (optional)" value={targetDate} onChange={setTargetDate} optional placeholder="No date" />

      {editing && (
        <View className="gap-2 pt-2">
          {!editing.account_id && (
            <View className="flex-row gap-2">
              <Button className="flex-1" onPress={() => router.replace({ pathname: '/forms/goal-money', params: { id: editing.id } })}>
                <Icon as={Plus} size={16} className="text-primary-foreground" />
                <Text>Add money</Text>
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onPress={() => router.replace({ pathname: '/forms/goal-money', params: { id: editing.id, withdraw: '1' } })}>
                <Icon as={Minus} size={16} />
                <Text>Take out</Text>
              </Button>
            </View>
          )}
          <Button variant="outline" onPress={() => run(() => setGoalArchived(editing.id, !editing.is_archived))} disabled={saving}>
            <Icon as={editing.is_archived ? ArchiveRestore : Archive} size={16} />
            <Text>{editing.is_archived ? 'Unarchive' : 'Archive'}</Text>
          </Button>
          <Button
            variant="ghost"
            disabled={saving}
            onPress={() => {
              haptics.warning();
              Alert.alert(`Delete ${editing.name}?`, "This can't be undone. Your accounts and transactions stay.", [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteGoal(editing.id)) },
              ]);
            }}>
            <Icon as={Trash2} size={16} className="text-destructive" />
            <Text className="text-destructive">Delete goal</Text>
          </Button>
        </View>
      )}
    </FormSheet>
  );
}
