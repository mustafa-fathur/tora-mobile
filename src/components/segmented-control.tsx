import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

/**
 * A row of mutually exclusive options (List / Day / Week / Month).
 * The selected option gets a white "pill"; plain styles only (no shadow), see AGENTS.md.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  isLocked,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  isLocked?: (value: T) => boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" className="flex-row gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => {
        const selected = o.value === value;
        const locked = isLocked?.(o.value) ?? false;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (!selected) haptics.select();
              onChange(o.value);
            }}
            disabled={locked}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: locked }}
            className={cn(
              'h-9 flex-1 items-center justify-center rounded-md border',
              selected ? 'border-border bg-background' : 'border-transparent',
              locked && 'opacity-40',
            )}>
            <Text className={cn('text-sm font-medium', selected ? 'text-foreground' : 'text-muted-foreground')}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
