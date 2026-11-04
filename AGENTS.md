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
- **Copy, don't reinvent:** port these pure helpers from the web repo (keep a header comment `// Copied from tora web: <path> @ <commit>` so drift is visible): `src/lib/money.ts` (`formatMoney`, `parseAmount`, `formatCompact`), `src/lib/finance/*.ts` (cash flow, fx, dates, recurring, budgets, calendar, net worth, insights… as each round needs them), and the generated types `src/lib/supabase/database.types.ts`. Port their unit tests too.

## Stack (decided; ask the owner before changing or adding big dependencies)
- Expo SDK 58 (see the Expo section above), **Expo Router**, TypeScript.
- UI: **NativeWind** + **React Native Reusables** (shadcn-style). Charts: **Victory Native** (from round 2).
- **Light theme only.** Tokens mirror the web (`src/app/globals.css` in the web repo): primary = logo green `#115C3B`, white background, income green, spending coral `oklch(0.68 0.13 35)`. Indonesian number style: `Rp 1.250.000`, short form `45 rb` / `1,3 jt`.
- Inspired by Monarch Money and Budge **patterns only** (e.g. a raised + in the tab bar, a Profile hub, a calendar view): never copy their visuals, names, icons or copy. Keep Tora's own look: light theme, green, our tokens.

## Scope: full parity with the web app (except CSV)
The phone app does **everything the web app does, except CSV import and export**. **Never mention the web in the app**: no "open on the web" buttons or text, and no CSV wording (the owner knows those live on the web). The one exception is Forgot password, which opens the web's reset page without saying so.

**Navigation (native, no drawer)**
- **Header on every screen:** the Tora logo on the left (a back arrow on screens opened from Profile), the screen title centered, and on the right **that screen's own action**, or nothing. Examples: Transactions → add transaction, Accounts → new account, Goals → new goal, Budgets → set budget, Categories → new category. No hamburger.
- **Bottom bar, 5 items:** Home · Transactions · a raised center **+** (quick Add, from anywhere) · Cash flow · Profile.
- **Transactions** has a segmented control: **List / Day / Week / Month**.
  - List: a month, searchable, with an account filter.
  - Day and Week: transactions with day totals.
  - Month: a calendar grid with each day's income and spending, a spending tint, and recurring bills/income due on coming days. Tapping a day opens Day; Android back returns to Month.
  - This replaces a separate Calendar section.
- **Profile:** the Tora logo as avatar (accounts have no photo), the email, then grouped list rows that open full screens: Accounts, Budgets, Goals, Recurring, Reports; **Settings:** Categories, Account types, Exchange rates, Security (2FA). Then Log out and the app version.
- The map lives in `src/lib/nav.ts`; `tests/unit/nav.test.ts` checks every entry has a screen file. Sections not built yet show a simple "Coming soon".

**Feel native, not web**
- Full-width lists (no cards inside cards) and sticky day headers (`SectionList`).
- Swipe actions on rows (Edit / Delete, `react-native-gesture-handler`'s `ReanimatedSwipeable`).
- Bottom sheets for short forms (Expo Router `presentation: 'formSheet'`). Long forms with the keyboard (quick Add) slide up as a full-screen modal with their own close / title / Save bar.
- Press feedback (`active:` styles) and haptics (`src/lib/haptics.ts`, `expo-haptics`).
- Pull to refresh, skeleton loading (`ListSkeleton`), safe areas, and Android back behaving correctly.
- Keep Tora's own look (light theme, green `#115C3B`, our tokens). Monarch is pattern inspiration only, never its visuals.
- **Only packages that run in Expo Go**; if one doesn't, ask the owner first.

**Rounds** (each ends with typecheck, lint and tests passing, a PR, and a phone check):
1. **Navigation:** header, bottom bar with the raised +, Profile, Transactions List / Day / Week / Month (with the calendar), native feel.
2. **Accounts management + net worth chart** (Profile → Accounts): new account (header action, bottom sheet), edit, archive, delete, update balance; net worth over time (Victory Native).
3. **Budgets** (Profile → Budgets, "set budget"), **Cash flow** (tab), **Reports** (Profile → Reports).
4. **Recurring** (Profile → Recurring, "new recurring") and **Goals** (Profile → Goals, "new goal").
5. **Settings** (Profile → Settings): categories, account types, exchange rates, Security (2FA).
6. **Release APK** (see `docs/RELEASE.md`).

**Writes follow the web's rules.** Every write must follow the same rules as the matching web server action in `src/app/(app)/*/actions.ts` (validation, messages, signed amounts, what gets updated). Port that validation as **pure, tested functions** (like `lib/finance/transaction-rows.ts` for `saveTransaction`), with a header naming the web file and commit. Then call Supabase directly; RLS does the authorization.

**Auth:** email + password, then the 2FA code screen if needed. Forgot password opens the web `/forgot-password` (the reset email links back to the web). Sign-up is off (invite-only).

**Not planned:** CSV import/export (stays on the web, never mentioned in the app), offline mode, notifications, email/chat capture.

## Working in this repo
- The owner is new to React Native: explain native concepts briefly when they come up.
- Cloud sessions can't run an emulator. Before finishing a task: `npx tsc --noEmit`, `npx expo lint`, and unit tests pass; say what the owner should check on the device.
- Add packages with `npx expo install`. Prefer what runs in **Expo Go** during development.
- **NativeWind: never add `shadow-*`, `ring-*`, transform, animation (`animate-*`), transition or container classes conditionally** (`selected && 'shadow-sm'`, ternaries, or toggled variants). These set CSS variables or animations, and NativeWind v4 can't add them after a component's first render: in development it crashes with "Couldn't find a LinkingContext context". Show state with plain styles (background, border, text colour, opacity) instead, or put the class on the component from its first render. `tests/unit/conditional-classes.test.ts` enforces this. Browser previews don't show this crash, so trust the test.
- **Release = an APK** the owner sideloads from Google Drive (no Play Store). Build locally (`npx expo prebuild` + Gradle, or `npx expo run:android --variant release`) or with EAS. Signing keys (`*.jks`) are never committed.
- Never commit real deployment identifiers (production domain, Supabase project ref), real financial data, or screenshots of other products.
- Commits: small and meaningful. Keep `docs/PROGRESS.md` (create it) updated at the end of each session: done, next, open questions.
