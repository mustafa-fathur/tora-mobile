// Every section of the app, in the web's sidebar groups (tora web:
// src/components/app/nav.ts), plus Settings. Drives the drawer menu.
// Plain data (no React Native imports) so tests can check every href has a screen.

export type NavIcon =
  | 'home'
  | 'calendar'
  | 'accounts'
  | 'transactions'
  | 'budgets'
  | 'recurring'
  | 'goals'
  | 'cash-flow'
  | 'reports'
  | 'categories'
  | 'account-types'
  | 'exchange-rates'
  | 'security';

export type NavItem = {
  title: string;
  href: string;
  icon: NavIcon;
  /** Shown in the bottom tab bar too. */
  tab?: boolean;
  /** Not built yet: the round it's planned for (AGENTS.md → Rounds) and what it will do. */
  soon?: { round: number; summary: string };
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Home', href: '/', icon: 'home', tab: true },
      {
        title: 'Calendar',
        href: '/calendar',
        icon: 'calendar',
        tab: true,
        soon: { round: 4, summary: 'Your transactions and upcoming bills by day, week or month.' },
      },
    ],
  },
  {
    label: 'Money',
    items: [
      { title: 'Accounts', href: '/accounts', icon: 'accounts', tab: true },
      { title: 'Transactions', href: '/transactions', icon: 'transactions', tab: true },
    ],
  },
  {
    label: 'Planning',
    items: [
      {
        title: 'Budgets',
        href: '/budgets',
        icon: 'budgets',
        tab: true,
        soon: { round: 3, summary: 'Set monthly budgets per category and see how much is left.' },
      },
      {
        title: 'Recurring',
        href: '/recurring',
        icon: 'recurring',
        soon: { round: 4, summary: 'Bills and income that repeat, with their next due dates.' },
      },
      {
        title: 'Goals',
        href: '/goals',
        icon: 'goals',
        soon: { round: 4, summary: 'Savings goals and how close you are.' },
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        title: 'Cash flow',
        href: '/cash-flow',
        icon: 'cash-flow',
        soon: { round: 3, summary: 'Income versus spending by month and by category.' },
      },
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
      {
        title: 'Categories',
        href: '/settings/categories',
        icon: 'categories',
        soon: { round: 5, summary: 'Add, rename, group and archive categories.' },
      },
      {
        title: 'Account types',
        href: '/settings/account-types',
        icon: 'account-types',
        soon: { round: 5, summary: 'The kinds of accounts you use, and whether they hold money or debt.' },
      },
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

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function navItem(href: string) {
  return NAV_ITEMS.find((i) => i.href === href);
}

/** The nav item for the current path, for highlighting in the drawer. */
export function activeNavItem(pathname: string) {
  return NAV_ITEMS.find((i) => (i.href === '/' ? pathname === '/' : pathname === i.href || pathname.startsWith(`${i.href}/`)));
}
