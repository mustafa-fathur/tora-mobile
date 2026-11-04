import { View } from 'react-native';

import type { BudgetStatus } from '@/lib/finance/budgets';
import { cn } from '@/lib/utils';

/** Progress bar: green, amber from 80%, red when over budget (same as the web). */
export function Meter({ ratio, status }: { ratio: number; status: BudgetStatus | null }) {
  const pct = Math.max(0, Math.min(100, ratio * 100));
  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-muted" accessibilityElementsHidden>
      <View
        className={cn(
          'h-full rounded-full',
          status === 'over' ? 'bg-destructive' : status === 'warning' ? 'bg-warning' : 'bg-primary',
        )}
        style={{ width: `${pct}%` }}
      />
    </View>
  );
}
