import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { AccountRow } from '@/components/accounts/account-row';
import { Loading, LoadError } from '@/components/screen-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { netWorthSummary } from '@/lib/finance/net-worth';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { openWeb } from '@/lib/web';

// Read-only in v1: adding, editing and balance updates stay on the web.
export default function AccountsScreen() {
  const accounts = useCachedData(...DATA.accounts);
  const rates = useCachedData(...DATA.rates);
  const [showArchived, setShowArchived] = useState(false);

  const refreshing = accounts.refreshing || rates.refreshing;
  const refresh = () => {
    accounts.refresh();
    rates.refresh();
  };

  if (!accounts.data || !rates.data) {
    const error = accounts.error ?? rates.error;
    return error ? <LoadError message={error} onRetry={refresh} /> : <Loading />;
  }

  if (accounts.data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-lg font-medium">No accounts yet</Text>
        <Text className="text-center text-muted-foreground">
          Add your bank accounts, e-wallets and cash on the Tora website. They&apos;ll show up here.
        </Text>
        <Button onPress={() => openWeb('/accounts')}>
          <Icon as={ExternalLink} size={16} />
          <Text>Open Accounts on the web</Text>
        </Button>
      </View>
    );
  }

  const s = netWorthSummary(accounts.data, rates.data);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}>
      {/* Net worth */}
      <Card className="gap-3 px-4 py-4">
        <View className="gap-1">
          <Text className="text-sm text-muted-foreground">Net worth</Text>
          <Text className={cn('text-3xl font-semibold tracking-tight', s.netWorth < 0 && 'text-destructive')}>
            {formatMoney(s.netWorth)}
          </Text>
        </View>
        <View className="gap-1.5 rounded-md bg-muted px-3 py-2.5">
          <Stat label="Cash & bank" value={s.cash} />
          <Stat label="Investments" value={s.investment} />
          <Stat label="Debts" value={s.debts} />
        </View>
        {s.missing.length > 0 && (
          <Text className="text-xs text-muted-foreground">
            Not counted: no exchange rate for {s.missing.join(', ')}. Add one in Settings on the web.
          </Text>
        )}
      </Card>

      {/* Accounts by class */}
      {s.sections.map((section) => (
        <Card key={section.value} className="gap-0 py-0">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="font-semibold">{section.title}</Text>
            <Text className="font-semibold">{formatMoney(section.subtotal)}</Text>
          </View>
          {section.items.map((a) => (
            <View key={a.id}>
              <Separator />
              <AccountRow account={a} />
            </View>
          ))}
        </Card>
      ))}

      {s.archived.length > 0 && (
        <Card className="gap-0 py-0">
          <Pressable
            onPress={() => setShowArchived((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showArchived }}
            className="flex-row items-center gap-2 px-4 py-3">
            <Icon as={showArchived ? ChevronDown : ChevronRight} size={16} className="text-muted-foreground" />
            <Text className="text-sm text-muted-foreground">Archived accounts ({s.archived.length})</Text>
          </Pressable>
          {showArchived &&
            s.archived.map((a) => (
              <View key={a.id}>
                <Separator />
                <AccountRow account={a} />
              </View>
            ))}
        </Card>
      )}
      <View className="h-2" />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className={cn('text-sm font-medium', value < 0 && 'text-destructive')}>{formatMoney(value)}</Text>
    </View>
  );
}
