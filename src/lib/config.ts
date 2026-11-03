// Values from .env.local. Expo inlines EXPO_PUBLIC_* variables into the app
// when it bundles, so they are public: never put a secret here.
// https://docs.expo.dev/guides/environment-variables/
// Each must be read as `process.env.EXPO_PUBLIC_NAME` literally, or Expo can't inline it.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? '').replace(/\/+$/, '');

export const missingConfig = [
  !SUPABASE_URL && 'EXPO_PUBLIC_SUPABASE_URL',
  !SUPABASE_PUBLISHABLE_KEY && 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
].filter((name): name is string => Boolean(name));
