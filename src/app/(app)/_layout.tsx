// The signed-in app: a drawer (side menu) around the bottom tabs and every other
// section. A "drawer" slides in from the left via the ☰ button or a swipe from
// the screen edge. https://docs.expo.dev/router/advanced/drawer/
import { Drawer } from 'expo-router/drawer';

import { DrawerContent } from '@/components/nav/drawer-content';
import { HeaderMenuButton } from '@/components/nav/header-buttons';
import { NAV_ITEMS } from '@/lib/nav';
import { COLORS } from '@/lib/theme';

// Everything except the tab screens, which live in (tabs) with their own headers.
const DRAWER_SCREENS = NAV_ITEMS.filter((i) => !i.tab);

export default function AppLayout() {
  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerTintColor: COLORS.foreground,
        headerLeft: () => <HeaderMenuButton />,
        headerTitleStyle: { fontWeight: '600' },
        drawerStyle: { width: 300 },
      }}>
      <Drawer.Screen name="(tabs)" options={{ headerShown: false }} />
      {DRAWER_SCREENS.map((item) => (
        <Drawer.Screen key={item.href} name={item.href.slice(1)} options={{ title: item.title }} />
      ))}
    </Drawer>
  );
}
