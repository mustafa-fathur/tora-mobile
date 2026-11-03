# Progress

## Session 3 (2026-11-03): Transactions tab, edit and delete

### Done
- **Copied from the web** (`dea6031`): `finance/calendar.ts` (for `dailyTotals`) and `finance/recurring.ts` (needed by calendar; also used later for Home's bills), with their tests.
- **Transactions tab**:
  - Month switcher (◀ November 2026 ▶).
  - Search on description and notes, with a short pause before searching, the same database search as the web.
  - Account filter chips.
  - Income / spending / net for the rows shown.
  - Rows grouped by day, with each day's net in IDR. These are the web's rules: transfers and balance updates don't count, refunds lower spending, other currencies convert with rates.
  - Pull to refresh.
  - Empty states, plus a note if a month has over 1000 rows (the web's limit too).
- **Edit**: tapping a row opens the same sheet as Add (`/add?id=…`), titled "Edit transaction". Like the web, a transfer can't switch to expense/income or back. Editing a transfer updates both sides. The row is handed over from the list, so the sheet opens instantly; a direct link fetches it.
- **Delete**: "Delete transaction" in the edit sheet, with the phone's own confirm dialog. A transfer deletes both rows (by `transfer_id`). Balance updates are delete-only: tapping one asks to delete it (the web's wording).
- **Fresh data everywhere**: `invalidate('transactions', 'accounts', 'home')` after every add, edit and delete. Every screen showing those keys reloads, including tabs not in view. Screens also reload when they come back into view. Home is still a placeholder; it should use a `home…` cache key so it refreshes too.
- Pure helpers with tests in `lib/finance/transaction-list.ts`:
  - `dayGroups`
  - `describeRow`, the web's titles and subtitles
  - `formFromTransaction`, which fills the edit form. Amounts show as `1.600.000`.
  - `transferLegs`
- Checks: typecheck, lint, 75 tests and the Android bundle all pass. Browser end-to-end check with a fake Supabase:
  - The list, search, account filter and month switch work.
  - Editing an expense updates the row by `id`.
  - Editing a transfer updates both rows and keeps each side's description.
  - After saving, the transactions and accounts data reload.
  - Opening `/add?id=` directly fetches the row and its other side.
  - Delete wasn't testable there: the confirm dialog is phone-only.

### Fixed after review
- **Crash when switching Expense / Income / Transfer** ("Couldn't find a LinkingContext context"). The selected segment got `shadow-sm` only when selected. In NativeWind v4, a class that sets CSS variables (all `shadow-*`, `ring-*`, transforms…) or animations must be on a component from its first render. Adding it later triggers a development warning that crashes while printing. The switch now marks the selected segment with a border and background only.
- **Rule**: classes added conditionally must be plain styles. `tests/unit/conditional-classes.test.ts` enforces it. It compiles every conditionally added class in `src/` with our Tailwind setup and fails on any that sets CSS variables, animations, transitions or containers. Browser previews don't show this bug, so the test is the safety net.

### Decisions
- Tapping a balance update offers delete only (same as the web).
- Transfer descriptions: when both sides still have the automatic text ("Transfer to X" / "Transfer from Y"), the edit form shows an empty description, so saving rewrites each side correctly. **The web's edit form copies the "Transfer to X" text onto both sides when saving; worth fixing there.**
- Editing a transfer is two updates in a row, like the web (no database transaction). If the second fails, the error shows and the list reloads.

### Next
1. Owner: phone checklist from this session's PR.
2. Home: month totals, top budgets (port `budgets.ts`), bills due in 7 days (`recurring.ts` is ready), last 5 transactions. Use cache keys starting with `home` so it refreshes after changes.
3. App icon and splash with the Tora logo.

### Open questions
- Fix the web's transfer edit description bug (see Decisions)?
- Hermes number formatting, "Open Tora on the web" target, and font: still open from sessions 1–2.

## Session 2 (2026-11-03): helpers, Add transaction, Accounts

### Done
- **Helpers copied from the web** (header shows web commit `dea6031`): `src/lib/money.ts`, `src/lib/finance/{dates,fx,cashflow,types,accounts,form}.ts`, plus `toCategoryGroups` (`finance/categories.ts`). Their tests are in `tests/unit/` (`money`, `dates`, and the fx + cash flow parts of `finance`).
- **Test runner: Vitest**, same as the web, so copied tests run unchanged. `npm test` (56 tests). Tests run in Node, so tested files must not import React Native.
- **Mobile-only helpers, with tests:**
  - `lib/amount-input.ts`: `parseAmountInput` adds the shorthand `45rb`, `45k`, `1,5jt`, `1.5 juta` on top of the web's `parseAmount` (which doesn't read suffixes).
  - `lib/finance/transaction-rows.ts`: the web's `saveTransaction` rules (add path) as a pure function: signed amounts, refunds, category kind check, transfers as two rows sharing `transfer_id`, amount received for transfers between currencies, same error messages.
  - `lib/finance/now.ts`: today/now in Asia/Jakarta, with a UTC+7 fallback in case the phone formats dates differently.
  - `lib/finance/net-worth.ts`: the web Accounts page's net worth and per-class subtotals.
- **Add transaction** (`src/app/add.tsx`, opened by +): Expense / Income / Transfer; amount first with the keyboard up and `rb` / `jt` buttons, plus a live "Rp 45.000" preview; accounts as one-tap chips (the last used account is remembered per user on the phone); category list grouped like the web, with search; refund checkbox; Today / Yesterday / other day, time defaulting to now (cleared for other days, like the web); description; Save in the header and at the bottom. A transfer inserts both rows in one `insert([...])`.
- **Accounts tab**: net worth with cash / investments / debts, accounts grouped by class with subtotals and balances, archived accounts folded away, pull to refresh, empty state that links to the web.
- **Data**: `lib/data/queries.ts` (ported reads), a small cache (`lib/data/cache.ts`) so screens show the last data right away and refresh when they come into view. Accounts and categories are preloaded when the tabs open. The cache is cleared on logout.
- New packages (all in Expo Go): `@react-native-community/datetimepicker`, `expo-crypto` (UUID for `transfer_id`; the phone's JS engine has no `crypto.randomUUID`), `vitest` (dev).
- Checks: typecheck, lint and tests pass; Android bundle builds. End-to-end in a browser with a fake Supabase: the expense and transfer rows sent to the database matched the expected rows, and the remembered account, validation errors and net worth total were checked. Not yet tested on a phone or against the real database.

### Decisions
- Vitest instead of Jest: the web uses Vitest, and these tests cover plain TypeScript only. If we test React Native components later, add `jest-expo` for those.
- Money shorthand lives in a mobile file, not in the copied `money.ts`, so the copy stays identical to the web. Consider moving `parseAmountInput` to the web too.
- Amount field uses the number keyboard (fast); the letters come from the `rb` / `jt` buttons.
- Category picker is a full-screen list with search rather than a dropdown (long lists are easier to scroll on a phone).

### Next
1. Owner: phone checklist from this session's PR.
2. Transactions tab: month list grouped by day, search, account filter, edit and delete (deleting a transfer deletes both rows). Editing reuses the Add sheet.
3. Home: month totals (cashflow `totals`), top budgets (port `budgets.ts`), bills due (port `recurring.ts`), last 5 transactions.
4. App icon and splash with the Tora logo.

### Open questions
- Hermes (the phone's JavaScript engine) formats numbers and dates with Android's own rules. Check on the phone that amounts read `Rp 1.250.000` and `US$100,00`. If not, we add a small fallback.
- Should "Open Tora on the web" open `/dashboard` (current) or specific pages? (from session 1)
- Font: Geist like the web, or the system font? (from session 1)

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
