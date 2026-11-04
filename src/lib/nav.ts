// Every section of the app and where it lives: the bottom bar, or a row on the
// Profile tab that opens a full screen. Plain data (no React Native imports) so
// tests can check each href has a screen file.

export type NavIcon =
  | 'home'
  | 'transactions'
  | 'cash-flow'
  | 'profile'
  | 'accounts'
  | 'budgets'
  | 'goals'
  | 'recurring'
  | 'reports'
  | 'categories'
  | 'account-types'
  | 'exchange-rates'
  | 'security';

export type NavItem = {
  title: string;
  href: string;
  icon: NavIcon;
  /** Not built yet: the round it's planned for (AGENTS.md → Rounds) and what it will do. */
  soon?: { round: number; summary: string };
};

/** The bottom bar. The raised + sits between Transactions and Cash flow. */
export const TABS: NavItem[] = [
  { title: 'Home', href: '/', icon: 'home' },
  { title: 'Transactions', href: '/transactions', icon: 'transactions' },
  { title: 'Cash flow', href: '/cash-flow', icon: 'cash-flow' },
  { title: 'Profile', href: '/profile', icon: 'profile' },
];

/** Rows on the Profile tab, in groups. Each opens a full screen. */
export const PROFILE_GROUPS: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { title: 'Accounts', href: '/accounts', icon: 'accounts' },
      { title: 'Budgets', href: '/budgets', icon: 'budgets' },
      { title: 'Goals', href: '/goals', icon: 'goals' },
      { title: 'Recurring', href: '/recurring', icon: 'recurring' },
      {
        title: 'Reports',
        href: '/reports',
        icon: 'reports',
        soon: { round: 3, summary: 'Month-by-month summaries and trends.' },
      },
    ],
  },
  {
    label: 'Settings',
    items: [
      { title: 'Categories', href: '/settings/categories', icon: 'categories' },
      { title: 'Account types', href: '/settings/account-types', icon: 'account-types' },
      {
        title: 'Exchange rates',
        href: '/settings/exchange-rates',
        icon: 'exchange-rates',
        soon: { round: 5, summary: 'Rates to IDR for accounts in other currencies.' },
      },
      {
        title: 'Security',
        href: '/settings/security',
        icon: 'security',
        soon: { round: 5, summary: 'Two-factor login with an authenticator app.' },
      },
    ],
  },
];

export const PROFILE_ITEMS = PROFILE_GROUPS.flatMap((g) => g.items);

export function navItem(href: string) {
  return [...TABS, ...PROFILE_ITEMS].find((i) => i.href === href);
}
