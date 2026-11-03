# Progress

## Session 1 (2026-11-03): app skeleton, theme, login

### Done
- **Expo Router** with the `src/app` folder. `package.json` `main` is `expo-router/entry`; the old `App.tsx`/`index.ts` are gone.
- **Bottom tabs** (`src/app/(tabs)/`): Home, Transactions, **+**, Accounts, More. The + button opens `src/app/add.tsx` as a modal (placeholder). Home, Transactions and Accounts are placeholders.
- **More tab**: signed-in email, Log out, "Open Tora on the web" (opens `/dashboard`), app version.
- **NativeWind v4.2.7** (Tailwind 3) + **React Native Reusables** components in `src/components/ui/` (button, card, icon, input, label, separator, text), copied from their repo.
- **Tora light theme**: tokens in `global.css` (web's OKLCH values converted to HSL, which NativeWind v4 needs; primary is exactly `#115C3B`). Same colours as plain values in `src/lib/theme.ts` for the tab bar and headers. Extra classes: `text-income`, `text-expense`, `text-warning`.
- **Supabase client** (`src/lib/supabase/client.ts`) per the Expo/Supabase guide: session saved with `expo-sqlite`'s `localStorage`, token refresh only while the app is open. Typed with `database.types.ts` copied from the web.
- **Auth**: `src/app/login.tsx` (email + password; "Forgot password?" opens the web `/forgot-password`) and `src/app/two-factor.tsx` (6-digit code; submits by itself at 6 digits; tries every confirmed authenticator, like the web). `src/providers/session.tsx` tracks the login; the root layout uses protected routes to show login → 2FA → tabs.
- Copied from web: `src/lib/auth/errors.ts`, `src/lib/supabase/database.types.ts` (header comment shows the web commit).
- Checks: `npx tsc --noEmit` and `npx expo lint` pass; `npx expo export --platform android` bundles. Screens were checked in a web preview at 390 px (login, 2FA, Home, More, + modal) with a fake session; nothing was tested against the real Supabase or on a phone yet.

### Decisions
- **NativeWind v4.2.7, not v5.** v4 is the stable release and the one React Native Reusables' NativeWind components target. Neither v4 nor the v5 RC lists SDK 58 as tested yet (both say SDK 57), so watch for styling issues on the device.
- **JavaScript tabs** (`expo-router/js-tabs`) instead of native tabs, because the center + button needs a custom tab button.
- **2FA check without a network call**: the app reads the `aal` claim from the login token and the user's verified factors (equivalent to the `getAuthenticatorAssuranceLevel` check in the web's `proxy.ts`). The database enforces 2FA anyway.
- New env var **`EXPO_PUBLIC_WEB_URL`** (web app address, no trailing slash) for "Forgot password" and "Open Tora on the web". Not committed; see `.env.example`.
- `expo-sqlite` and `expo-web-browser` are included in Expo Go, so development still works in Expo Go.

### Next
1. Owner: test on the phone (see the checklist in the session summary): login, 2FA, logout, staying logged in after closing the app.
2. Port the pure helpers and their tests from the web (`money.ts`, `finance/*`), and set up a test runner (jest-expo).
3. Home screen with real data (month totals, budgets, bills, last 5 transactions).
4. App icon and splash with the Tora logo (still the Expo defaults).

### Open questions
- Should "Open Tora on the web" open `/dashboard` (current) or a specific page per item (budgets, reports, import, settings)?
- Font: the web uses Geist; the app uses the system font for now. Add Geist?
