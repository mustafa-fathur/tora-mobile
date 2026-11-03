// Supabase client for the app, following the Expo + Supabase guide:
// https://docs.expo.dev/guides/using-supabase/
// https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
//
// The publishable key is public by design; Row Level Security in the database
// limits every query to the signed-in user's rows.
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/config';
import type { Database } from '@/lib/supabase/database.types';

// Placeholders keep the app from crashing on start when .env.local is missing;
// the root layout shows a "missing config" screen instead.
export const supabase = createClient<Database>(
  SUPABASE_URL || 'http://localhost',
  SUPABASE_PUBLISHABLE_KEY || 'missing-key',
  {
    auth: {
      // expo-sqlite provides a `localStorage` that persists on the phone, so you
      // stay logged in after closing the app.
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Phones have no URL bar to read a login link from.
      detectSessionInUrl: false,
    },
  },
);

// Only refresh the login token while the app is on screen.
// https://supabase.com/docs/reference/javascript/auth-startautorefresh
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
