# Progress

## Session 5 (2026-11-04): release prep

### Done
- **Home → Recent transactions stops at today**: future-dated rows aren't "recent" yet (`recentEnd` in `lib/finance/home.ts`, tested). **Note:** the web's dashboard on `master` (`dea6031`) still includes future-dated rows; that change wasn't in the public repo yet.
- **App identity** (`app.json`): name **Tora**, package `com.mustafafathur.tora`, version `1.0.0`, versionCode `1`, `primaryColor` `#115C3B` (Android's `colorPrimary`, used in the recent-apps screen).
- **Icon and splash**, generated from `assets/brand/tora-logo.png` by `scripts/make-app-icons.py` (Pillow):
  - `icon.png`: logo on white.
  - Adaptive icon: the logo as foreground, kept inside Android's safe zone so a circle mask doesn't clip the ears; white background colour; monochrome layer for Android 13+ themed icons. The old background image was removed.
  - Splash: the logo on white through the `expo-splash-screen` config plugin.
- **`expo-system-ui`** added, so `userInterfaceStyle: light` also applies on Android (prebuild warned without it).
- **Release signing** without committing keys: `plugins/with-release-signing.js` (a config plugin, since `android/` is generated) adds a `release` signing config that reads `TORA_UPLOAD_*` from `~/.gradle/gradle.properties`. Release builds use it, and a release build stops with a clear error if those details are missing (no silent debug-signed APK). Unit tested (`tests/unit/release-signing.test.ts`). The generated `build.gradle` was checked with Groovy's parser.
- `.gitignore` also blocks `*.keystore`, `*.pkcs12`, `*.pfx` and `gradle.properties`.
- `package.json` scripts `android`/`ios` are now `expo start -a` / `-i` (same commands): `expo prebuild` rewrites the long forms to `expo run:*` every time.
- **`docs/RELEASE.md`**: step-by-step PowerShell commands for a signed release APK on Windows with Android Studio (no EAS): one-time setup (JAVA_HOME/ANDROID_HOME, upload key, gradle.properties, long paths), then every release (prebuild, `gradlew assembleRelease`, copy, verify, install), plus troubleshooting.
- Checks: typecheck, lint, 87 tests, Android JS bundle; prebuild verified offline: colorPrimary, white splash and icon background, adaptive icon with monochrome layer, signing block. **Not run here:** a full Gradle APK build (no Android SDK in the cloud sandbox), so the first real build happens on your PC.

### Next
1. Owner: build the APK with `docs/RELEASE.md`, install it, run the PR checklist.
2. A sharper icon: the logo source is 512 px and gets upscaled to 1024. Drop a 1024 px+ export in `assets/brand/tora-logo.png` and run `python scripts/make-app-icons.py`.
3. Two weeks of daily use, then pick from the parking lot (charts, editing budgets/accounts).

### Open questions
- Should the web's dashboard also stop "recent" at today (it doesn't on `master` yet)?
- Fix the web's transfer-edit description bug (from session 3)?
- Hermes number formatting, "Open Tora on the web" target, and font: still open from sessions 1–2.

## Session 4 (2026-11-04): Home

### Done
- **Copied from the web** (`dea6031`): `finance/budgets.ts` with the budgets part of the web's finance tests.
- **Home tab** (`src/app/(tabs)/index.tsx`), following the web's dashboard and `overview.ts`:
  - **This month**: income / spending / net in IDR. Like the web, it counts rows dated from the 1st up to today (future-dated rows wait); transfers and balance updates don't count; refunds lower spending. A note appears if a currency has no exchange rate.
  - **Budgets**: the 3 expense groups with a budget and the highest % used, with progress bars: green, amber from 80%, red when over. A group's own budget wins over its categories' budgets, as on the web.
  - **Coming up**: active recurring items due in the next 7 days (bills negative, income green), plus overdue ones flagged in red. Labels read "Overdue", "Today", "Tomorrow" or the date.
  - **Recent transactions**: the last 5 (any month). Tapping one edits it; tapping a balance update offers delete.
  - Pull to refresh. Every key is `home:…` or a shared one, so any add/edit/delete refreshes Home.
  - A welcome state when there are no accounts.
- `lib/finance/home.ts` (pure, tested): `homeTotals`, `topBudgets`, `comingUp`.
- `components/transactions/open-transaction.ts`: the shared "tap a row" behaviour (Transactions + Home).
- New reads in `lib/data/queries.ts`: `getTransactionsBetween` (pages past 1000 rows), `getBudgets`, `getRecurringItems`, `getRecentTransactions`.
- **AGENTS.md**: added the NativeWind rule (no conditional shadow/ring/transform/animation/transition/container classes) to "Working in this repo".
- Checks: typecheck, lint, 81 tests and the Android bundle all pass. Browser end-to-end check with a fake Supabase:
  - Month totals exclude the future-dated row and the balance update.
  - The over-budget group is red, and the group budget beats its category budgets.
  - Overdue / today / within-7-days items show; the 9-days-out and inactive ones don't.
  - Editing a recent transaction from Home saves, and Home reloads all its data.

### Next
1. Owner: phone checklist from this session's PR.
2. v1 is feature-complete after this. Next: the app icon and splash with the Tora logo, then a release APK (see AGENTS.md "Release").
3. Parking lot (after the 2-week use period): charts (Victory Native), editing budgets/accounts.

### Open questions
- **Future-dated transactions show at the top of "Recent transactions"** (same as the web dashboard, which sorts by date). Should "recent" stop at today on both?
- Fix the web's transfer-edit description bug (from session 3)?
- Hermes number formatting, "Open Tora on the web" target, and font: still open from sessions 1–2.

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
