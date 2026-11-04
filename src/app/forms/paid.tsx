// Mark a recurring item paid (`/forms/paid?id=…`): records the transaction and
// moves the due date forward, like the web's markPaid.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { DateField, FormSheet, TextField } from '@/components/form-sheet';
import { ListSkeleton } from '@/components/list';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { getRecurringItems } from '@/lib/data/queries';
import { markPaid, type RecurringItem } from '@/lib/data/recurring';
import { formatDay } from '@/lib/finance/dates';
import { jakartaNow } from '@/lib/finance/now';
import { paidDefaultDate } from '@/lib/finance/recurring-rules';
import type { Account } from '@/lib/finance/types';
import { haptics } from '@/lib/haptics';

export default function PaidScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accounts = useCachedData(...DATA.accounts);
  const items = useCachedData('home:recurring', getRecurringItems);
  const item = items.data?.find((i) => i.id === id);
  if (!item || !accounts.data) {
    return (
      <FormSheet title="Mark paid">
        {items.data && accounts.data ? <Text className="text-muted-foreground">Not found.</Text> : <ListSkeleton rows={2} header={false} />}
      </FormSheet>
    );
  }
  return <PaidForm key={item.id} item={item} accounts={accounts.data} />;
}

function PaidForm({ item, accounts }: { item: RecurringItem; accounts: Account[] }) {
  const [amount, setAmount] = useState(String(Math.abs(Number(item.amount))).replace('.', ','));
  const [date, setDate] = useState<string | null>(paidDefaultDate(item, jakartaNow().date));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(undefined);
    const message = await markPaid(item, amount, date ?? '', accounts);
    setSaving(false);
    if (message) return setError(message);
    haptics.success();
    router.back();
  }

  return (
    <FormSheet title="Mark paid" onSave={save} saving={saving} error={error} saveLabel="Save">
      <Text className="text-muted-foreground">
        {item.name}, due {formatDay(item.next_due_date)}. This adds a transaction and moves the next due date forward.
      </Text>
      <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus />
      <DateField label="Date" value={date} onChange={setDate} />
    </FormSheet>
  );
}
