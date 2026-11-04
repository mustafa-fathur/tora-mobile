// The signed-in app: the bottom tabs, plus the screens that Profile opens on top
// of them (a "stack": each new screen slides in, and Android's back button or the
// header's back arrow returns). https://docs.expo.dev/router/advanced/stack/
import { Stack } from 'expo-router';

import { AppHeader } from '@/components/nav/app-header';
import { PROFILE_ITEMS } from '@/lib/nav';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        // Screens set their own right-side action with <Stack.Screen options={{ headerRight }} />.
        header: ({ options }) => (
          <AppHeader title={options.title ?? ''} back right={options.headerRight?.({ canGoBack: true })} />
        ),
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {PROFILE_ITEMS.map((item) => (
        <Stack.Screen key={item.href} name={item.href.slice(1)} options={{ title: item.title }} />
      ))}
    </Stack>
  );
}
