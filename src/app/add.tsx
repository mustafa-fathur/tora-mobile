// Add or edit a transaction. Opened by the + button (add) or by tapping a row on
// the Transactions tab (`/add?id=…`, edit). Adding is the most-used screen, so it
// opens with the keyboard up on the amount and everything else pre-filled
// (last account, today, now).
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';

import { AccountChips } from '@/components/add/account-chips';
import { CategoryField } from '@/components/add/category-picker';
import { Chip } from '@/components/add/chip';
import { DateTimeField } from '@/components/add/date-time-field';
import { ModeSwitch } from '@/components/add/mode-switch';
import { FormAlert } from '@/components/form-alert';
import { Loading, LoadError } from '@/components/screen-state';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { parseAmountInput } from '@/lib/amount-input';
import { useCachedData } from '@/lib/data/cache';
import { peekHandOff } from '@/lib/data/edit-store';
import { DATA } from '@/lib/data/keys';
import { getTransactionWithPartner } from '@/lib/data/queries';
import { deleteTransaction, saveTransaction, type Editing } from '@/lib/data/transactions';
import { toCategoryGroups } from '@/lib/finance/categories';
import { jakartaNow } from '@/lib/finance/now';
import { formFromTransaction, transferLegs, type FormValues } from '@/lib/finance/transaction-list';
import type { Mode } from '@/lib/finance/transaction-rows';
import type { Account, Category, Transaction } from '@/lib/finance/types';
import { formatMoney } from '@/lib/money';
import { getLastAccountId, setLastAccountId } from '@/lib/preferences';
import { cn } from '@/lib/utils';
import { useSession } from '@/providers/session';

export default function TransactionSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const accounts = useCachedData(...DATA.accounts);
  const categories = useCachedData(...DATA.categories);
  const editing = useEditing(id);

  if (!accounts.data || !categories.data || editing.loading) {
    const error = accounts.error ?? categories.error ?? editing.error;
    const retry = () => {
      accounts.refresh();
      categories.refresh();
    };
    return error ? <LoadError message={error} onRetry={retry} /> : <Loading />;
  }

  const active = accounts.data.filter((a) => !a.is_archived);
  if (!id && active.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-center text-muted-foreground">
          Add an account first, so Tora knows where the money comes from. Adding accounts in the app is coming
          soon.
        </Text>
      </View>
    );
  }

  return (
    <TransactionForm
      key={id ?? 'new'}
      accounts={accounts.data}
      categories={categories.data}
      editing={editing.value}
    />
  );
}

// The transaction being edited: from the list's hand-off, or fetched by id.
function useEditing(id: string | undefined) {
  const handed = id ? peekHandOff(id) : undefined;
  const [fetched, setFetched] = useState<{ row: Transaction; partner?: Transaction } | null>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!id || handed) return;
    getTransactionWithPartner(id)
      .then(setFetched)
      .catch(() => setError("Couldn't load this transaction. Check your connection and try again."));
  }, [id, handed]);

  if (!id) return { loading: false, value: undefined };
  const found = handed ?? fetched;
  if (found === undefined) return { loading: !error, error, value: undefined };
  if (found === null) return { loading: false, error: 'This transaction no longer exists.', value: undefined };
  if (found.row.kind === 'transfer') {
    const legs = transferLegs(found.row, found.partner);
    if (!legs) return { loading: false, error: "This transfer is missing its other side, so it can't be edited. You can delete it from the list.", value: undefined };
    return { loading: false, value: legs as Editing };
  }
  return { loading: false, value: { row: found.row } as Editing };
}

const SUFFIX = /\s*(k|rb|ribu|jt|juta)\.?$/i;

function TransactionForm({
  accounts,
  categories,
  editing,
}: {
  accounts: Account[];
  categories: Category[];
  editing?: Editing;
}) {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const groups = useMemo(() => toCategoryGroups(categories), [categories]);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const [form, setForm] = useState<FormValues>(() => {
    if (editing) return formFromTransaction(editing, categories);
    const last = getLastAccountId(userId);
    const active = accounts.filter((a) => !a.is_archived);
    const { date, time } = jakartaNow();
    return {
      mode: 'expense',
      amount: '',
      toAmount: '',
      accountId: active.some((a) => a.id === last) ? last! : active[0].id,
      toAccountId: '',
      categoryId: null,
      refund: false,
      date,
      time,
      description: '',
    };
  });
  const set = (patch: Partial<FormValues>) => setForm((f) => ({ ...f, ...patch }));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const { mode, amount, toAmount, accountId, toAccountId, categoryId, refund, date, time, description } = form;

  // Archived accounts are hidden, unless this transaction already uses them (same as the web).
  const selectable = accounts.filter((a) => !a.is_archived || a.id === accountId || a.id === toAccountId);
  const from = accounts.find((a) => a.id === accountId);
  const to = accounts.find((a) => a.id === toAccountId);
  const currency = from?.currency ?? 'IDR';
  const parsed = parseAmountInput(amount, currency);
  const crossCurrency = mode === 'transfer' && from && to && from.currency !== to.currency;
  const isTransfer = Boolean(editing && 'out' in editing);

  function changeMode(m: Mode) {
    set({ mode: m, categoryId: null }); // categories are per kind
    setError(undefined);
  }

  function changeAccount(id: string) {
    // A transfer can't go to the account it comes from.
    set({ accountId: id, ...(id === toAccountId ? { toAccountId: '' } : {}) });
  }

  function addSuffix(suffix: 'rb' | 'jt') {
    if (amount.trim()) set({ amount: amount.replace(SUFFIX, '') + suffix });
  }

  function showError(message: string) {
    setError(message);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(undefined);
    const message = await saveTransaction(
      { ...form, categoryId: mode === 'transfer' ? null : categoryId },
      accounts,
      categories,
      editing,
    );
    setSaving(false);
    if (message) return showError(message);
    if (!editing) setLastAccountId(userId, accountId);
    router.back();
  }

  function confirmDelete() {
    if (!editing) return;
    const row = 'out' in editing ? editing.out : editing.row;
    // Alert.alert shows the phone's own dialog with these buttons.
    Alert.alert(
      'Delete this transaction?',
      isTransfer ? "Both sides of the transfer will be deleted. This can't be undone." : "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            const message = await deleteTransaction(row);
            setSaving(false);
            if (message) return showError(message);
            router.back();
          },
        },
      ],
    );
  }

  return (
    <>
      {/* Title and a Save button in this screen's header, always reachable above the keyboard. */}
      <Stack.Screen
        options={{
          title: editing ? 'Edit transaction' : 'Add transaction',
          headerRight: () => (
            <Pressable onPress={save} disabled={saving} hitSlop={8} accessibilityRole="button">
              <Text className={cn('font-semibold text-primary', saving && 'opacity-50')}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-background"
        contentContainerClassName="gap-5 p-4 pb-10"
        keyboardShouldPersistTaps="handled">
        {error && <FormAlert>{error}</FormAlert>}

        <ModeSwitch
          value={mode}
          onChange={changeMode}
          isLocked={editing ? (m) => (m === 'transfer') !== isTransfer : undefined}
        />

        <View className="gap-2">
          <Label nativeID="amount-label">Amount{currency !== 'IDR' && ` (${currency})`}</Label>
          <View className="flex-row items-center gap-2">
            <Input
              aria-labelledby="amount-label"
              value={amount}
              onChangeText={(v) => set({ amount: v })}
              autoFocus={!editing}
              keyboardType="decimal-pad"
              placeholder="0"
              className="h-14 flex-1 text-2xl font-semibold"
            />
            <Chip label="rb" onPress={() => addSuffix('rb')} accessibilityLabel="Thousand (rb)" />
            <Chip label="jt" onPress={() => addSuffix('jt')} accessibilityLabel="Million (jt)" />
          </View>
          <Text className={cn('text-sm', amount && !parsed ? 'text-destructive' : 'text-muted-foreground')}>
            {amount ? (parsed ? formatMoney(parsed, currency) : 'Not a valid amount') : 'Type 45.000, 45rb or 1,5jt'}
          </Text>
        </View>

        <AccountChips
          label={mode === 'transfer' ? 'From' : 'Account'}
          accounts={selectable}
          value={accountId}
          onChange={changeAccount}
        />

        {mode === 'transfer' && (
          <AccountChips
            label="To"
            accounts={selectable.filter((a) => a.id !== accountId)}
            value={toAccountId}
            onChange={(id) => set({ toAccountId: id })}
          />
        )}

        {crossCurrency && (
          <View className="gap-2">
            <Label nativeID="to-amount-label">Amount received ({to.currency})</Label>
            <Input
              aria-labelledby="to-amount-label"
              value={toAmount}
              onChangeText={(v) => set({ toAmount: v })}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </View>
        )}

        {mode !== 'transfer' && (
          <CategoryField
            groups={groups}
            categories={categories}
            kind={mode}
            value={categoryId}
            onChange={(id) => set({ categoryId: id })}
          />
        )}

        {mode === 'expense' && (
          <Pressable
            onPress={() => set({ refund: !refund })}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: refund }}
            className="flex-row items-start gap-3">
            <View
              className={cn(
                'mt-0.5 h-5 w-5 items-center justify-center rounded border',
                refund ? 'border-primary bg-primary' : 'border-input bg-background',
              )}>
              {refund && <Text className="text-xs font-bold text-primary-foreground">✓</Text>}
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-sm font-medium">This is a refund</Text>
              <Text className="text-sm text-muted-foreground">
                Money back for something you bought. It lowers your spending.
              </Text>
            </View>
          </Pressable>
        )}

        <DateTimeField date={date} time={time} onChange={(d, t) => set({ date: d, time: t })} />

        <View className="gap-2">
          <Label nativeID="description-label">Description</Label>
          <Input
            aria-labelledby="description-label"
            value={description}
            onChangeText={(v) => set({ description: v })}
            placeholder={mode === 'transfer' ? 'Optional' : 'e.g. Lunch at warung'}
            maxLength={200}
            returnKeyType="done"
            onSubmitEditing={save}
          />
        </View>

        <Button size="lg" onPress={save} disabled={saving}>
          <Text>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add transaction'}</Text>
        </Button>

        {editing && (
          <Button variant="ghost" onPress={confirmDelete} disabled={saving}>
            <Icon as={Trash2} size={16} className="text-destructive" />
            <Text className="text-destructive">Delete transaction</Text>
          </Button>
        )}
      </ScrollView>
    </>
  );
}
