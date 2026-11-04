// Add money to (or take it out of) a manual goal (`/forms/goal-money?id=…&withdraw=1`).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FormSheet, TextField } from '@/components/form-sheet';
import { ListSkeleton } from '@/components/list';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { moveGoalMoney } from '@/lib/data/goals';
import { getGoals } from '@/lib/data/queries';
import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';

export default function GoalMoneyScreen() {
  const { id, withdraw } = useLocalSearchParams<{ id: string; withdraw?: string }>();
  const goals = useCachedData('goals', getGoals);
  const goal = goals.data?.find((g) => g.id === id);
  const out = withdraw === '1';
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const title = out ? 'Take out money' : 'Add money';
  if (!goal) {
    return <FormSheet title={title}>{goals.data ? <Text className="text-muted-foreground">Goal not found.</Text> : <ListSkeleton rows={2} header={false} />}</FormSheet>;
  }
  async function save() {
    setSaving(true);
    setError(undefined);
    const message = await moveGoalMoney(goal!, amount, out);
    setSaving(false);
    if (message) return setError(message);
    haptics.success();
    router.back();
  }
  return (
    <FormSheet title={title} onSave={save} saving={saving} error={error}>
      <Text className="text-muted-foreground">
        {goal.name}: {formatMoney(Number(goal.saved_amount), goal.currency)} saved so far.
      </Text>
      <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 500rb" autoFocus />
    </FormSheet>
  );
}
