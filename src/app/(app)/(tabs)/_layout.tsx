// Bottom tabs for the screens used most. Every tab's header has the menu (☰) on
// the left and Add transaction (+) on the right.
// https://docs.expo.dev/router/advanced/tabs/
import { Tabs } from 'expo-router/js-tabs';
import { type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { type ColorValue } from 'react-native';

import { HeaderAddButton, HeaderMenuButton } from '@/components/nav/header-buttons';
import { NAV_ICONS } from '@/components/nav/nav-icons';
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
        headerLeft: () => <HeaderMenuButton />,
        headerRight: () => <HeaderAddButton />,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon(NAV_ICONS.home) }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions', tabBarIcon: tabIcon(NAV_ICONS.transactions) }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: tabIcon(NAV_ICONS.calendar) }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets', tabBarIcon: tabIcon(NAV_ICONS.budgets) }} />
      <Tabs.Screen name="accounts" options={{ title: 'Accounts', tabBarIcon: tabIcon(NAV_ICONS.accounts) }} />
    </Tabs>
  );
}
