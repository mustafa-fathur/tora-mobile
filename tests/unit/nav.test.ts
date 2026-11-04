/// <reference types="node" />
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { activeNavItem, NAV_GROUPS, NAV_ITEMS } from '@/lib/nav';

// Where a href's screen file lives: tabs in (app)/(tabs), the rest in (app).
function screenFile(href: string, tab: boolean) {
  const route = href === '/' ? 'index' : href.slice(1);
  return join(process.cwd(), 'src', 'app', '(app)', ...(tab ? ['(tabs)'] : []), `${route}.tsx`);
}

describe('navigation', () => {
  it("follows the web's sidebar groups, plus Settings", () => {
    expect(NAV_GROUPS.map((g) => [g.label, g.items.map((i) => i.title)])).toEqual([
      ['Overview', ['Home', 'Calendar']],
      ['Money', ['Accounts', 'Transactions']],
      ['Planning', ['Budgets', 'Recurring', 'Goals']],
      ['Insights', ['Cash flow', 'Reports']],
      ['Settings', ['Categories', 'Account types', 'Exchange rates', 'Security']],
    ]);
  });

  it('has exactly the five bottom tabs', () => {
    expect(NAV_ITEMS.filter((i) => i.tab).map((i) => i.title)).toEqual([
      'Home', 'Calendar', 'Accounts', 'Transactions', 'Budgets',
    ]);
  });

  it.each(NAV_ITEMS.map((i) => [i.title, i] as const))('%s has a screen file', (_, item) => {
    expect(existsSync(screenFile(item.href, Boolean(item.tab))), screenFile(item.href, Boolean(item.tab))).toBe(true);
  });

  it('highlights the right item for a path', () => {
    expect(activeNavItem('/')?.title).toBe('Home');
    expect(activeNavItem('/transactions')?.title).toBe('Transactions');
    expect(activeNavItem('/settings/security')?.title).toBe('Security');
    expect(activeNavItem('/add')).toBeUndefined();
  });
});
