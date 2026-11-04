// Account type sheet (`?id=` to edit). Its kind can't change while accounts use it (web rule).
import { router, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ChoiceField, FormSheet, TextField } from '@/components/form-sheet';
import { ListSkeleton } from '@/components/list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { deleteAccountType, saveAccountType } from '@/lib/data/settings';
import { ACCOUNT_CLASSES } from '@/lib/finance/accounts';
import type { AccountClass, AccountType } from '@/lib/finance/types';
import { haptics } from '@/lib/haptics';

export default function AccountTypeFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const types = useCachedData(...DATA.accountTypes);
  if (!types.data) {
    return (
      <FormSheet title="Account type">
        <ListSkeleton rows={2} header={false} />
      </FormSheet>
    );
  }
  return <TypeForm key={id ?? 'new'} editing={id ? types.data.find((t) => t.id === id) : undefined} />;
}

function TypeForm({ editing }: { editing?: AccountType }) {
  const [name, setName] = useState(editing?.name ?? '');
  const [cls, setCls] = useState<AccountClass>(editing?.class ?? 'cash');
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
  return (
    <FormSheet title={editing ? 'Edit account type' : 'New account type'} onSave={() => run(() => saveAccountType({ name, cls }, editing))} saving={saving} error={error}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. E-wallet, Paylater" autoFocus={!editing} maxLength={40} />
      <ChoiceField label="Kind" options={ACCOUNT_CLASSES.map((c) => ({ value: c.value, label: c.title }))} value={cls} onChange={setCls} />
      <Text className="text-sm text-muted-foreground">{ACCOUNT_CLASSES.find((c) => c.value === cls)?.hint}</Text>
      {editing && (
        <Button
          variant="ghost"
          disabled={saving}
          onPress={() => {
            haptics.warning();
            Alert.alert(`Delete ${editing.name}?`, "Only types no account uses can be deleted. This can't be undone.", [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteAccountType(editing.id)) },
            ]);
          }}>
          <Icon as={Trash2} size={16} className="text-destructive" />
          <Text className="text-destructive">Delete account type</Text>
        </Button>
      )}
    </FormSheet>
  );
}
