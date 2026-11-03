// Add transaction: the most-used screen, so it opens with the keyboard up on the
// amount and everything else pre-filled (last account, today, now).
import { router, Stack } from 'expo-router';
import { ExternalLink } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';

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
import { DATA } from '@/lib/data/keys';
import { addTransaction } from '@/lib/data/transactions';
import { toCategoryGroups } from '@/lib/finance/categories';
import { jakartaNow } from '@/lib/finance/now';
import type { Mode } from '@/lib/finance/transaction-rows';
import type { Account, Category } from '@/lib/finance/types';
import { formatMoney } from '@/lib/money';
import { getLastAccountId, setLastAccountId } from '@/lib/preferences';
import { cn } from '@/lib/utils';
import { openWeb } from '@/lib/web';
import { useSession } from '@/providers/session';

export default function AddTransactionScreen() {
  const accounts = useCachedData(...DATA.accounts);
  const categories = useCachedData(...DATA.categories);

  if (!accounts.data || !categories.data) {
    const error = accounts.error ?? categories.error;
    const retry = () => {
      accounts.refresh();
      categories.refresh();
    };
    return error ? <LoadError message={error} onRetry={retry} /> : <Loading />;
  }

  const active = accounts.data.filter((a) => !a.is_archived);
  if (active.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-center text-muted-foreground">
          Add an account first on the web, so Tora knows where the money comes from.
        </Text>
        <Button onPress={() => openWeb('/accounts')}>
          <Icon as={ExternalLink} size={16} />
          <Text>Open Accounts on the web</Text>
        </Button>
      </View>
    );
  }

  return <AddForm accounts={accounts.data} active={active} categories={categories.data} />;
}

const SUFFIX = /\s*(k|rb|ribu|jt|juta)\.?$/i;

function AddForm({
  accounts,
  active,
  categories,
}: {
  accounts: Account[];
  active: Account[];
  categories: Category[];
}) {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const groups = useMemo(() => toCategoryGroups(categories), [categories]);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const [mode, setMode] = useState<Mode>('expense');
  const [amount, setAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [accountId, setAccountId] = useState(() => {
    const last = getLastAccountId(userId);
    return active.some((a) => a.id === last) ? last! : active[0].id;
  });
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [refund, setRefund] = useState(false);
  const [{ date, time }, setWhen] = useState<{ date: string; time: string | null }>(jakartaNow);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const from = accounts.find((a) => a.id === accountId);
  const to = accounts.find((a) => a.id === toAccountId);
  const currency = from?.currency ?? 'IDR';
  const parsed = parseAmountInput(amount, currency);
  const crossCurrency = mode === 'transfer' && from && to && from.currency !== to.currency;

  function changeAccount(id: string) {
    setAccountId(id);
    // A transfer can't go to the account it comes from.
    if (id === toAccountId) setToAccountId('');
  }

  function changeMode(m: Mode) {
    setMode(m);
    setCategoryId(null); // categories are per kind
    setError(undefined);
  }

  function addSuffix(suffix: 'rb' | 'jt') {
    setAmount((a) => (a.trim() ? a.replace(SUFFIX, '') + suffix : a));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(undefined);
    const message = await addTransaction(
      {
        mode,
        accountId,
        toAccountId,
        amount,
        toAmount,
        categoryId: mode === 'transfer' ? null : categoryId,
        refund,
        date,
        time,
        description,
      },
      accounts,
      categories,
    );
    setSaving(false);
    if (message) {
      setError(message);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setLastAccountId(userId, accountId);
    router.back();
  }

  const saveLabel = saving ? 'Saving…' : 'Save';

  return (
    <>
      {/* Adds a Save button to this screen's header, always reachable above the keyboard. */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={save} disabled={saving} hitSlop={8} accessibilityRole="button">
              <Text className={cn('font-semibold text-primary', saving && 'opacity-50')}>{saveLabel}</Text>
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

        <ModeSwitch value={mode} onChange={changeMode} />

        <View className="gap-2">
          <Label nativeID="amount-label">Amount{currency !== 'IDR' && ` (${currency})`}</Label>
          <View className="flex-row items-center gap-2">
            <Input
              aria-labelledby="amount-label"
              value={amount}
              onChangeText={setAmount}
              autoFocus
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
          accounts={active}
          value={accountId}
          onChange={changeAccount}
        />

        {mode === 'transfer' && (
          <AccountChips
            label="To"
            accounts={active.filter((a) => a.id !== accountId)}
            value={toAccountId}
            onChange={setToAccountId}
          />
        )}

        {crossCurrency && (
          <View className="gap-2">
            <Label nativeID="to-amount-label">Amount received ({to.currency})</Label>
            <Input
              aria-labelledby="to-amount-label"
              value={toAmount}
              onChangeText={setToAmount}
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
            onChange={setCategoryId}
          />
        )}

        {mode === 'expense' && (
          <Pressable
            onPress={() => setRefund((r) => !r)}
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

        <DateTimeField date={date} time={time} onChange={(d, t) => setWhen({ date: d, time: t })} />

        <View className="gap-2">
          <Label nativeID="description-label">Description</Label>
          <Input
            aria-labelledby="description-label"
            value={description}
            onChangeText={setDescription}
            placeholder={mode === 'transfer' ? 'Optional' : 'e.g. Lunch at warung'}
            maxLength={200}
            returnKeyType="done"
            onSubmitEditing={save}
          />
        </View>

        <Button size="lg" onPress={save} disabled={saving}>
          <Text>{saving ? 'Saving…' : 'Add transaction'}</Text>
        </Button>
      </ScrollView>
    </>
  );
}
