This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

# Tora mobile: project context

Tora ("tiger" in Sumatra) is a **personal finance tracker** for one owner in Indonesia (maybe a few invited friends later). This repo is the **Android app**. The web app lives in the public repo https://github.com/mustafa-fathur/tora (Next.js + Supabase); read its `AGENTS.md`, `docs/DATA-MODEL.md` and `docs/DESIGN.md` before touching data or UI.

## How it fits together
- **No custom API.** The web app's writes are Next.js server actions, which the phone can't call. The mobile app talks to **Supabase directly** with `@supabase/supabase-js` and the user's session, exactly like the web does underneath. Row Level Security on every table limits rows to the signed-in user.
- **2FA is enforced by the database.** If the user has an authenticator (TOTP), every table returns nothing until the session is `aal2`. The app must run the code step after the password (`supabase.auth.mfa.challengeAndVerify`).
- Config comes from `.env.local` (gitignored): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`). The publishable key is public by design. **Never** put the service_role/secret key or the database password in this app.
- Follow Supabase's Expo guide for the client setup and session storage: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native

## Data rules (same as web; see the web repo's `docs/DATA-MODEL.md`)
- Money is `numeric(18,2)`; amounts are **signed**: money in > 0, money out < 0. Base currency IDR; other currencies convert with `exchange_rates`.
- Transaction kinds: `regular` (income/spending, optional category; a refund is a positive amount in an expense category), `transfer` (two rows, one per account, sharing `transfer_id`; insert both in one `insert([...])` call), `adjustment` (balance updates; not income/spending).
- Account balance = view `account_balances`. Account types have a class (`cash`, `investment`, `liability`); debts are negative.
- Optional `time` on transactions; default to "now" (Asia/Jakarta) for new ones.
- **Copy, don't reinvent:** port these pure helpers from the web repo (keep a header comment `// Copied from tora web: <path> @ <commit>` so drift is visible): `src/lib/money.ts` (`formatMoney`, `parseAmount`, `formatCompact`), `src/lib/finance/{cashflow,fx,dates,recurring,budgets}.ts`, and the generated types `src/lib/supabase/database.types.ts`. Port their unit tests too.

## Stack (decided; ask the owner before changing or adding big dependencies)
- Expo SDK 58 (see the Expo section above), **Expo Router**, TypeScript.
- UI: **NativeWind** + **React Native Reusables** (shadcn-style). Charts later: **Victory Native**.
- **Light theme only.** Tokens mirror the web (`src/app/globals.css` in the web repo): primary = logo green `#115C3B`, white background, income green, spending coral `oklch(0.68 0.13 35)`. Indonesian number style: `Rp 1.250.000`, short form `45 rb` / `1,3 jt`.
- Inspired by Monarch Money and Budge **patterns only**: never copy their visuals, names, icons or copy.

## v1 scope: basic daily use (anything else stays on the web)
Bottom tabs with a center **+** button:
1. **Home:** this month's income / spending / net; top budgets (progress bars); bills due in the next 7 days; last 5 transactions.
2. **Transactions:** current month grouped by day with day totals, month switcher, search, account filter; tap a row to edit or delete (deleting a transfer deletes both rows).
3. **+ Add transaction** (sheet/modal, the most-used screen, must be fast): amount first (accepts `45.000`, `45rb`, `1,5jt` style input), expense / income / transfer, account (remember the last used), category, date + time, description, optional "refund".
4. **Accounts:** net worth and accounts grouped by class with balances (read-only in v1).
5. **More:** signed-in email, log out, "Open Tora on the web" for budgets, reports, CSV import and settings, app version.

**Auth:** email + password, then the 2FA code screen if needed. Forgot password opens the web `/forgot-password`. Sign-up is off (invite-only).

**Out of v1** (parking lot): editing budgets/accounts/categories, reports, calendar, CSV import, goals, recurring management, offline mode, notifications, email/chat capture.

## Working in this repo
- The owner is new to React Native: explain native concepts briefly when they come up.
- Cloud sessions can't run an emulator. Before finishing a task: `npx tsc --noEmit`, `npx expo lint`, and unit tests pass; say what the owner should check on the device.
- Add packages with `npx expo install`. Prefer what runs in **Expo Go** during development.
- **Release = an APK** the owner sideloads from Google Drive (no Play Store). Build locally (`npx expo prebuild` + Gradle, or `npx expo run:android --variant release`) or with EAS. Signing keys (`*.jks`) are never committed.
- Never commit real deployment identifiers (production domain, Supabase project ref), real financial data, or screenshots of other products.
- Commits: small and meaningful. Keep `docs/PROGRESS.md` (create it) updated at the end of each session: done, next, open questions.
