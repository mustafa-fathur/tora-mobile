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
export function ModeSwitch({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  return (
    <View accessibilityRole="radiogroup" className="flex-row gap-1 rounded-lg bg-muted p-1">
      {MODES.map((m) => {
        const selected = m.value === value;
        return (
          <Pressable
            key={m.value}
            onPress={() => onChange(m.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            className={cn('h-9 flex-1 items-center justify-center rounded-md', selected && 'bg-background shadow-sm shadow-black/10')}>
            <Text className={cn('text-sm font-medium', selected ? 'text-foreground' : 'text-muted-foreground')}>
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
