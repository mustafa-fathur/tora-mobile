import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Account } from '@/lib/finance/types';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-md border border-border px-1.5 py-0.5">
      <Text className="text-xs text-muted-foreground">{children}</Text>
    </View>
  );
}

/** One account: name, institution and type, and its balance in its own currency. */
export function AccountRow({ account }: { account: Account }) {
  const subtitle = [account.institution, account.type_name].filter(Boolean).join(' · ');
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <View className="min-w-0 flex-1 gap-0.5">
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text className="font-medium" numberOfLines={1}>
            {account.name}
          </Text>
          {account.currency !== 'IDR' && <Badge>{account.currency}</Badge>}
          {!account.include_in_net_worth && <Badge>Not in net worth</Badge>}
        </View>
        {subtitle ? (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text className={cn('shrink-0 font-medium', account.balance < 0 && 'text-destructive')}>
        {formatMoney(account.balance, account.currency)}
      </Text>
    </View>
  );
}
