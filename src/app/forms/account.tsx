// New or edit account (`/forms/account?id=…`). Editing also offers update balance,
// archive / unarchive and delete. Rules: lib/finance/account-rules.ts (from the web).
import { router, useLocalSearchParams } from 'expo-router';
import { Archive, ArchiveRestore, Scale, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { CheckRow, ChoiceField, FormSheet, TextField } from '@/components/form-sheet';
import { ListSkeleton } from '@/components/list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { deleteAccount, saveAccount, setAccountArchived } from '@/lib/data/accounts';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { typedBalance } from '@/lib/finance/account-rules';
import { ACCOUNT_CLASSES } from '@/lib/finance/accounts';
import type { Account, AccountType } from '@/lib/finance/types';
import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';

export default function AccountFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const accounts = useCachedData(...DATA.accounts);
  const types = useCachedData(...DATA.accountTypes);
  const currencies = useCachedData(...DATA.currencies);
  if (!accounts.data || !types.data || !currencies.data) {
    return (
      <FormSheet title={id ? 'Edit account' : 'New account'}>
        <ListSkeleton rows={4} header={false} />
      </FormSheet>
    );
  }
  const editing = id ? accounts.data.find((a) => a.id === id) : undefined;
  return <AccountForm key={id ?? 'new'} editing={editing} types={types.data} currencies={currencies.data.map((c) => c.code)} />;
}

function AccountForm({ editing, types, currencies }: { editing?: Account; types: AccountType[]; currencies: string[] }) {
  const [name, setName] = useState(editing?.name ?? '');
  const [typeId, setTypeId] = useState(editing?.type_id ?? types[0]?.id ?? '');
  const [currency, setCurrency] = useState(editing?.currency ?? 'IDR');
  const [opening, setOpening] = useState(editing ? typedBalance(Number(editing.opening_balance), editing.class) : '');
  const [institution, setInstitution] = useState(editing?.institution ?? '');
  const [include, setInclude] = useState(editing?.include_in_net_worth ?? true);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const type = types.find((t) => t.id === typeId);
  const debt = type?.class === 'liability';

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
    run(() => saveAccount({ name, typeId, currency, openingBalance: opening, institution, includeInNetWorth: include }, types, editing));

  function confirmDelete() {
    if (!editing) return;
    haptics.warning();
    Alert.alert(
      `Delete ${editing.name}?`,
      "This also deletes all of its transactions and can't be undone. To hide it but keep its history, archive it instead.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteAccount(editing.id)) },
      ],
    );
  }

  // Types grouped by class, so "Cash & bank / Investments / Debts" read in order.
  const typeOptions = ACCOUNT_CLASSES.flatMap((c) =>
    types
      .filter((t) => t.class === c.value)
      .map((t) => ({
        value: t.id,
        label: t.name,
        // Editing can't move between a debt type and an asset type (web rule).
        disabled: !!editing && (editing.class === 'liability') !== (t.class === 'liability'),
      })),
  );

  return (
    <FormSheet title={editing ? 'Edit account' : 'New account'} onSave={save} saving={saving} error={error}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. BCA, GoPay, Wallet" autoFocus={!editing} maxLength={80} />
      <ChoiceField label="Type" options={typeOptions} value={typeId} onChange={setTypeId} />
      {editing ? (
        <Text className="text-sm text-muted-foreground">Currency: {editing.currency} (can&apos;t be changed)</Text>
      ) : (
        <ChoiceField label="Currency" options={currencies.map((c) => ({ value: c, label: c }))} value={currency} onChange={setCurrency} />
      )}
      <TextField
        label={debt ? 'Amount owed when added' : 'Opening balance'}
        value={opening}
        onChangeText={setOpening}
        keyboardType="decimal-pad"
        placeholder="0"
        hint={debt ? 'Type what you owe as a positive number; debts count against net worth.' : 'What was in it when you started tracking.'}
      />
      <TextField label="Institution (optional)" value={institution} onChangeText={setInstitution} placeholder="e.g. Bank Central Asia" />
      <CheckRow
        label="Include in net worth"
        hint="Turn off for accounts you track but don't own, like a shared wallet."
        checked={include}
        onChange={setInclude}
      />

      {editing && (
        <View className="gap-2 pt-2">
          <Text className="text-sm text-muted-foreground">Current balance: {formatMoney(editing.balance, editing.currency)}</Text>
          <Button variant="outline" onPress={() => router.push({ pathname: '/forms/balance', params: { id: editing.id } })}>
            <Icon as={Scale} size={16} />
            <Text>Update balance</Text>
          </Button>
          <Button variant="outline" onPress={() => run(() => setAccountArchived(editing.id, !editing.is_archived))} disabled={saving}>
            <Icon as={editing.is_archived ? ArchiveRestore : Archive} size={16} />
            <Text>{editing.is_archived ? 'Unarchive' : 'Archive'}</Text>
          </Button>
          <Button variant="ghost" onPress={confirmDelete} disabled={saving}>
            <Icon as={Trash2} size={16} className="text-destructive" />
            <Text className="text-destructive">Delete account</Text>
          </Button>
        </View>
      )}
    </FormSheet>
  );
}
