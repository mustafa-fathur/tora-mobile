import { ScrollView, View } from 'react-native';

import { Chip } from '@/components/add/chip';
import { Label } from '@/components/ui/label';
import type { Account } from '@/lib/finance/types';

/** One-tap account choice: a sideways-scrolling row of chips. */
export function AccountChips({
  label,
  accounts,
  value,
  onChange,
}: {
  label: string;
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-2 pr-4">
        {accounts.map((a) => (
          <Chip
            key={a.id}
            label={a.currency === 'IDR' ? a.name : `${a.name} (${a.currency})`}
            selected={a.id === value}
            onPress={() => onChange(a.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
