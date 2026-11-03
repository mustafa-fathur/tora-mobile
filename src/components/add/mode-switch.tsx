import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Mode } from '@/lib/finance/transaction-rows';
import { cn } from '@/lib/utils';

const MODES: { value: Mode; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

/** Expense / Income / Transfer switch (same as the web form). */
export function ModeSwitch({
  value,
  onChange,
  isLocked,
}: {
  value: Mode;
  onChange: (m: Mode) => void;
  isLocked?: (m: Mode) => boolean; // when editing, a transfer can't switch to expense/income
}) {
  return (
    <View accessibilityRole="radiogroup" className="flex-row gap-1 rounded-lg bg-muted p-1">
      {MODES.map((m) => {
        const selected = m.value === value;
        const locked = isLocked?.(m.value) ?? false;
        return (
          <Pressable
            key={m.value}
            onPress={() => onChange(m.value)}
            disabled={locked}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: locked }}
            className={cn(
              // No shadow on the selected segment: NativeWind can't add shadow-* (or any class
              // that sets CSS variables) after the first render; it crashes in development.
              'h-9 flex-1 items-center justify-center rounded-md border',
              selected ? 'border-border bg-background' : 'border-transparent',
              locked && 'opacity-40',
            )}>
            <Text className={cn('text-sm font-medium', selected ? 'text-foreground' : 'text-muted-foreground')}>
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
