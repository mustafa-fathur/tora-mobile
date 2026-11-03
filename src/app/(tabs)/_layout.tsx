// Bottom tabs. The center "+" isn't a real tab: its button opens the Add transaction
// screen (src/app/add.tsx) on top of the tabs instead of switching tabs.
// https://docs.expo.dev/router/advanced/tabs/
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { ArrowLeftRight, Ellipsis, House, Plus, Wallet, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View, type ColorValue } from 'react-native';

import { load } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { COLORS } from '@/lib/theme';

function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon color={color as string} size={size - 2} />;
  };
}

export default function TabsLayout() {
  // Load accounts and categories in the background so the + sheet opens with them ready.
  useEffect(() => {
    load(...DATA.accounts).catch(() => {});
    load(...DATA.categories).catch(() => {});
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.mutedForeground,
        tabBarStyle: { borderTopColor: COLORS.border },
        headerTitleStyle: { fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen
        name="transactions"
        options={{ title: 'Transactions', tabBarIcon: tabIcon(ArrowLeftRight) }}
      />
      <Tabs.Screen
        name="new"
        options={{ title: 'Add', tabBarButton: () => <AddButton /> }}
      />
      <Tabs.Screen name="accounts" options={{ title: 'Accounts', tabBarIcon: tabIcon(Wallet) }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon(Ellipsis) }} />
    </Tabs>
  );
}

function AddButton() {
  return (
    <View className="flex-1 items-center justify-center">
      <Pressable
        onPress={() => router.push('/add')}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        hitSlop={6}
        className="h-12 w-12 items-center justify-center rounded-full bg-primary shadow-md shadow-black/20 active:bg-primary/90">
        <Plus color={COLORS.primaryForeground} size={26} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}
