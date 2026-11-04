// Root layout: wraps every screen. Expo Router turns each file in src/app into a screen;
// `_layout.tsx` files decide how those screens are arranged (stack, tabs, …).
// https://docs.expo.dev/router/basics/core-concepts/
import '../../global.css';

import { PortalHost } from '@rn-primitives/portal';
import { SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NAV_THEME } from '@/lib/theme';
import { SessionProvider, useSession } from '@/providers/session';

// Full-screen form sheets (files in src/app/forms/).
const FORM_SCREENS = ['forms/account', 'forms/balance', 'forms/budget', 'forms/recurring', 'forms/paid'];

// Keep the splash screen up until we know whether you're logged in.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    // GestureHandlerRootView lets rows react to swipes (edit / delete).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={NAV_THEME}>
        <SessionProvider>
          <SplashScreenController />
          <RootNavigator />
          <StatusBar style="dark" />
          {/* Where pop-overs and menus from React Native Reusables render. Keep it last. */}
          <PortalHost />
        </SessionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function SplashScreenController() {
  const { isLoading } = useSession();
  if (!isLoading) SplashScreen.hide();
  return null;
}

// "Protected" screens only exist while their guard is true; when a guard flips
// (you log in, enter the code, or log out) the router moves you to a screen you may see.
// https://docs.expo.dev/router/advanced/protected/
function RootNavigator() {
  const { isLoading, session, needsTwoFactor } = useSession();
  const signedIn = !!session && !needsTwoFactor;

  // The splash screen covers this. Waiting means the first screen is already the right
  // one, instead of flashing the login screen and redirecting.
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
        {/* Quick Add slides up over everything; it draws its own header (close, title, save). */}
        <Stack.Screen name="add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        {/* Other forms open the same way: full-screen sheets with their own close / title / Save bar. */}
        {FORM_SCREENS.map((name) => (
          <Stack.Screen key={name} name={name} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        ))}
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && needsTwoFactor}>
        <Stack.Screen name="two-factor" />
      </Stack.Protected>
    </Stack>
  );
}
