/// <reference types="node" />
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { navItem, PROFILE_GROUPS, PROFILE_ITEMS, TABS } from '@/lib/nav';

// Tabs live in src/app/(app)/(tabs); Profile rows open screens in src/app/(app).
function screenFile(href: string, tab: boolean) {
  const route = href === '/' ? 'index' : href.slice(1);
  return join(process.cwd(), 'src', 'app', '(app)', ...(tab ? ['(tabs)'] : []), `${route}.tsx`);
}

describe('navigation', () => {
  it('has Home, Transactions, Cash flow and Profile in the bottom bar (the + sits in the middle)', () => {
    expect(TABS.map((t) => t.title)).toEqual(['Home', 'Transactions', 'Cash flow', 'Profile']);
  });

  it('lists the Profile rows in order, with Settings as its own group', () => {
    expect(PROFILE_GROUPS.map((g) => [g.label ?? '', g.items.map((i) => i.title)])).toEqual([
      ['', ['Accounts', 'Budgets', 'Goals', 'Recurring', 'Reports']],
      ['Settings', ['Categories', 'Account types', 'Exchange rates', 'Security']],
    ]);
  });

  it.each([...TABS.map((t) => [t.title, t.href, true] as const), ...PROFILE_ITEMS.map((i) => [i.title, i.href, false] as const)])(
    '%s has a screen file',
    (_, href, tab) => {
      expect(existsSync(screenFile(href, tab)), screenFile(href, tab)).toBe(true);
    },
  );

  it('finds items by href', () => {
    expect(navItem('/settings/security')?.title).toBe('Security');
    expect(navItem('/nope')).toBeUndefined();
  });
});
