// Settings → Exchange rates: what 1 unit of each foreign currency is worth in IDR,
// for accounts in other currencies. Type them, or fetch today's rates (open.er-api.com,
// like the web). Saving an empty field removes that rate.
import { Stack } from 'expo-router';
import { Check, Download } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';

import { FormAlert } from '@/components/form-alert';
import { ListGroup, ListHeader, ListSkeleton, RowSeparator } from '@/components/list';
import { HeaderAction } from '@/components/nav/header-buttons';
import { LoadError } from '@/components/screen-state';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { getRateRows } from '@/lib/data/queries';
import { fetchRates, saveRates } from '@/lib/data/settings';
import { formatDay } from '@/lib/finance/dates';
import { haptics } from '@/lib/haptics';
import { COLORS } from '@/lib/theme';

const typedRate = (n: number) => String(n).replace('.', ',');

export default function ExchangeRatesScreen() {
  const accounts = useCachedData(...DATA.accounts);
  const rows = useCachedData('rates:rows', getRateRows);
  if (!accounts.data || !rows.data) {
    const error = accounts.error ?? rows.error;
    return error ? <LoadError message={error} onRetry={rows.refresh} /> : <ListSkeleton />;
  }
  // Currencies your accounts use, plus any rate you've saved before.
  const currencies = [...new Set([...accounts.data.map((a) => a.currency), ...rows.data.map((r) => r.currency)])]
    .filter((c) => c !== 'IDR')
    .sort();
  return <RatesForm key={rows.data.map((r) => `${r.currency}${r.rate}`).join()} currencies={currencies} rows={rows.data} refreshing={rows.refreshing} onRefresh={rows.refresh} />;
}

function RatesForm({
  currencies,
  rows,
  refreshing,
  onRefresh,
}: {
  currencies: string[];
  rows: Awaited<ReturnType<typeof getRateRows>>;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const byCurrency = new Map(rows.map((r) => [r.currency, r]));
  const [typed, setTyped] = useState<Record<string, string>>(() =>
    Object.fromEntries(currencies.map((c) => [c, byCurrency.has(c) ? typedRate(Number(byCurrency.get(c)!.rate)) : ''])),
  );
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(undefined);
    const message = await saveRates(typed);
    setBusy(false);
    if (message) return setError(message);
    haptics.success();
  }
  async function fetchToday() {
    setBusy(true);
    setError(undefined);
    const [message, count] = await fetchRates(currencies);
    setBusy(false);
    if (message) return setError(message);
    haptics.success();
    Alert.alert('Rates updated', `Updated ${count} rate${count === 1 ? '' : 's'}.`);
  }

  return (
    <ScrollView
      className="flex-1 bg-muted"
      contentContainerClassName="pb-10"
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
      <Stack.Screen options={{ headerRight: () => <HeaderAction icon={Check} label="Save rates" onPress={save} /> }} />
      {error ? (
        <View className="px-4 pt-4">
          <FormAlert>{error}</FormAlert>
        </View>
      ) : null}
      {currencies.length === 0 ? (
        <Text className="px-4 py-6 text-center text-muted-foreground">All your accounts are in IDR, so no rates are needed.</Text>
      ) : (
        <>
          <ListHeader title="1 unit = how many IDR" />
          <ListGroup>
            {currencies.map((c, i) => {
              const row = byCurrency.get(c);
              return (
                <View key={c}>
                  {i > 0 && <RowSeparator />}
                  <View className="flex-row items-center gap-3 px-4 py-2.5">
                    <View className="w-24">
                      <Text className="font-semibold">1 {c}</Text>
                      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {row ? `${row.source === 'api' ? 'Fetched' : 'Typed'} ${formatDay(row.updated_at.slice(0, 10)).slice(5)}` : 'No rate yet'}
                      </Text>
                    </View>
                    <Input
                      className="flex-1"
                      value={typed[c] ?? ''}
                      onChangeText={(v) => setTyped((t) => ({ ...t, [c]: v }))}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 16.250"
                      accessibilityLabel={`IDR for 1 ${c}`}
                    />
                  </View>
                </View>
              );
            })}
          </ListGroup>
          <View className="gap-2 px-4 pt-4">
            <Button onPress={save} disabled={busy}>
              <Icon as={Check} size={16} className="text-primary-foreground" />
              <Text>{busy ? 'Saving…' : 'Save rates'}</Text>
            </Button>
            <Button variant="outline" onPress={fetchToday} disabled={busy}>
              <Icon as={Download} size={16} />
              <Text>Fetch today&apos;s rates</Text>
            </Button>
            <Text className="text-xs text-muted-foreground">
              Today&apos;s rates come from open.er-api.com (free). Amounts in other currencies are converted with these everywhere.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
