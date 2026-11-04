/// <reference types="node" />
// The bottom bar must keep its computed height (49dp + the phone's navigation-button
// inset). Overriding `height` collapses it on Android and puts the tabs under the
// system ◁ ◯ ☰ buttons, which a browser preview doesn't show.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const layout = readFileSync(join(process.cwd(), 'src', 'app', '(app)', '(tabs)', '_layout.tsx'), 'utf8');

describe('tab bar', () => {
  it('does not override the tab bar height', () => {
    const style = layout.match(/tabBarStyle:\s*\{([^}]*)\}/);
    expect(style, 'tabBarStyle not found').not.toBeNull();
    expect(style![1]).not.toMatch(/\bheight\b/);
  });

  it('does not take the bar out of the layout (it must push content up, not float over it)', () => {
    expect(layout).not.toMatch(/tabBarStyle:[^}]*position:\s*'absolute'/);
  });
});
