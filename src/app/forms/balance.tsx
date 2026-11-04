// Update balance (`/forms/balance?id=…`): records an adjustment for the difference,
// dated today, like the web's adjustBalance.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FormSheet, TextField } from '@/components/form-sheet';
import { ListSkeleton } from '@/components/list';
import { Text } from '@/components/ui/text';
import { adjustBalance } from '@/lib/data/accounts';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';

export default function BalanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accounts = useCachedData(...DATA.accounts);
  const account = accounts.data?.find((a) => a.id === id);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  if (!account) {
    return (
      <FormSheet title="Update balance">
        {accounts.data ? <Text className="text-muted-foreground">That account no longer exists.</Text> : <ListSkeleton rows={2} header={false} />}
      </FormSheet>
    );
  }
  const debt = account.class === 'liability';

  async function save() {
    setSaving(true);
    setError(undefined);
    const message = await adjustBalance(account!, value);
    setSaving(false);
    if (message) return setError(message);
    haptics.success();
    router.back();
  }

  return (
    <FormSheet title="Update balance" onSave={save} saving={saving} error={error}>
      <Text className="text-muted-foreground">
        {account.name} is at {formatMoney(account.balance, account.currency)}. Type what it should be; Tora records the
        difference as a balance update (it doesn&apos;t count as income or spending).
      </Text>
      <TextField
        label={debt ? 'Amount owed now' : `New balance${account.currency !== 'IDR' ? ` (${account.currency})` : ''}`}
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        placeholder="0"
        autoFocus
      />
    </FormSheet>
  );
}
