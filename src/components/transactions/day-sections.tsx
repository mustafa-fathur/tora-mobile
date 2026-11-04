import { RefreshControl, SectionList, View } from 'react-native';

import { RowSeparator } from '@/components/list';
import { SwipeableTransactionRow } from '@/components/transactions/swipeable-row';
import { Text } from '@/components/ui/text';
import type { CashflowContext } from '@/lib/finance/cashflow';
import { formatDay } from '@/lib/finance/dates';
import { describeRow, type DaySection } from '@/lib/finance/transaction-list';
import type { Account, Transaction } from '@/lib/finance/types';
import { formatMoney } from '@/lib/money';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';

/**
 * Transactions grouped by day, full width. Day headers stay pinned at the top
 * while you scroll through that day ("sticky" headers), showing the day's net.
 */
export function DaySections({
  sections,
  rows,
  accounts,
  ctx,
  refreshing,
  onRefresh,
  header,
  empty,
  footer,
  emptyDayText,
}: {
  sections: DaySection[];
  rows: Transaction[];
  accounts: Account[];
  ctx: CashflowContext;
  refreshing: boolean;
  onRefresh: () => void;
  header?: React.ReactElement;
  empty?: string;
  footer?: React.ReactElement;
  /** For Week: show days without transactions too, with this text. */
  emptyDayText?: string;
}) {
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  return (
    <SectionList
      className="flex-1 bg-muted"
      sections={sections}
      keyExtractor={(t) => t.id}
      stickySectionHeadersEnabled
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      ListHeaderComponent={header}
      renderSectionHeader={({ section }) => (
        <View className="flex-row justify-between border-b border-border bg-muted px-4 pb-1.5 pt-4">
          <Text className="text-sm font-semibold text-muted-foreground">{formatDay(section.date)}</Text>
          {section.net ? (
            <Text className={cn('text-sm font-semibold text-muted-foreground', section.net > 0 && 'text-income')}>
              {formatMoney(section.net, 'IDR', { signed: true })}
            </Text>
          ) : null}
        </View>
      )}
      renderSectionFooter={({ section }) =>
        emptyDayText && section.data.length === 0 ? (
          <Text className="bg-background px-4 py-3 text-sm text-muted-foreground">{emptyDayText}</Text>
        ) : null
      }
      renderItem={({ item, index }) => (
        <View className="bg-background">
          {index > 0 && <RowSeparator inset={64} />}
          <SwipeableTransactionRow
            transaction={item}
            rows={rows}
            look={describeRow(item, accountById, ctx.categoryById)}
            currency={accountById.get(item.account_id)?.currency ?? 'IDR'}
          />
        </View>
      )}
      ListEmptyComponent={
        empty ? <Text className="px-6 py-10 text-center text-muted-foreground">{empty}</Text> : undefined
      }
      ListFooterComponent={footer ?? <View className="h-10" />}
    />
  );
}
