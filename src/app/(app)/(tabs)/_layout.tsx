// The bottom bar: Home · Transactions · + · Cash flow · Profile.
// The + isn't a screen: it opens quick Add on top of whichever tab you're on.
// https://docs.expo.dev/router/advanced/tabs/
import { Tabs } from 'expo-router/js-tabs';
import { type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { type ColorValue } from 'react-native';

import { AppHeader } from '@/components/nav/app-header';
import { HeaderAddTransaction } from '@/components/nav/header-buttons';
import { NAV_ICONS } from '@/components/nav/nav-icons';
import { TabBarAddButton } from '@/components/nav/tab-bar-add-button';
import { load } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { haptics } from '@/lib/haptics';
import { COLORS } from '@/lib/theme';

function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon color={color as string} size={size - 2} />;
  };
}

export default function TabsLayout() {
  // Load accounts and categories in the background so quick Add opens with them ready.
  useEffect(() => {
    load(...DATA.accounts).catch(() => {});
    load(...DATA.categories).catch(() => {});
  }, []);

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptics.select() }}
      screenOptions={{
        header: ({ options }) => <AppHeader title={options.title ?? ''} right={options.headerRight?.({ canGoBack: false })} />,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.mutedForeground,
        tabBarStyle: { borderTopColor: COLORS.border, height: undefined },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon(NAV_ICONS.home) }} />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: tabIcon(NAV_ICONS.transactions),
          headerRight: () => <HeaderAddTransaction />,
        }}
      />
      <Tabs.Screen name="new" options={{ title: 'Add', tabBarButton: () => <TabBarAddButton /> }} />
      <Tabs.Screen name="cash-flow" options={{ title: 'Cash flow', tabBarIcon: tabIcon(NAV_ICONS['cash-flow']) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon(NAV_ICONS.profile) }} />
    </Tabs>
  );
}
