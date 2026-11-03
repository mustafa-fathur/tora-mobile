import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** A short coloured message above a form (errors, confirmations). */
export function FormAlert({ variant = 'error', children }: { variant?: 'error' | 'info'; children: React.ReactNode }) {
  return (
    <View
      accessibilityRole="alert"
      className={cn(
        'rounded-md border px-3 py-2',
        variant === 'error' ? 'border-destructive/30 bg-destructive/10' : 'border-border bg-muted',
      )}>
      <Text className={cn('text-sm', variant === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
        {children}
      </Text>
    </View>
  );
}
