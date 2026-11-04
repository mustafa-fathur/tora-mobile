import { router } from 'expo-router';
import { DrawerToggleButton } from 'expo-router/drawer';
import { Plus } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { COLORS } from '@/lib/theme';

/** "+" in the header: opens the Add transaction sheet. */
export function HeaderAddButton() {
  return (
    <Pressable
      onPress={() => router.push('/add')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Add transaction"
      className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-primary active:bg-primary/90">
      <Plus color={COLORS.primaryForeground} size={20} strokeWidth={2.5} />
    </Pressable>
  );
}

/** Hamburger in the header: opens the drawer (the side menu with every section). */
export function HeaderMenuButton() {
  return <DrawerToggleButton tintColor={COLORS.foreground} accessibilityLabel="Open menu" />;
}
