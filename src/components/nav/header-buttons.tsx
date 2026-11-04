import { router } from 'expo-router';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { haptics } from '@/lib/haptics';

/** A round icon button for the right side of the header (a screen's own action). */
export function HeaderAction({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="mr-1 h-10 w-10 items-center justify-center rounded-full active:bg-muted">
      <Icon as={icon} size={22} className="text-primary" />
    </Pressable>
  );
}

/** Header action that opens the Add transaction sheet. */
export function HeaderAddTransaction() {
  return <HeaderAction icon={Plus} label="Add transaction" onPress={() => router.push('/add')} />;
}
