/// <reference types="node" />
// Guards against a NativeWind crash that only shows on the phone: a component that
// *gains* a class which sets CSS variables after its first render (e.g. `shadow-sm`
// on the selected tab) makes NativeWind print an "upgrade warning" that crashes with
// "Couldn't find a LinkingContext context". The same goes for animation, transition
// and container classes. So classes added conditionally (`x && '…'`, `x ? '…' : '…'`)
// must be plain styles.
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd(); // vitest runs from the project root
const { cssToReactNativeRuntime } = require('react-native-css-interop/dist/css-to-rn');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

// String literals right after `&&`, `?`, or a ternary `:` (not an object key like `web:`).
function conditionalClasses(source: string): string[] {
  const out: string[] = [];
  const literal = /(&&|\?|:)\s*(['"`])([^'"`$]*)\2/g;
  for (const m of source.matchAll(literal)) {
    if (m[1] === ':') {
      const before = source.slice(0, m.index).trimEnd().at(-1);
      if (!before || !/['"`)]/.test(before)) continue; // object key, not a ternary
    }
    out.push(...m[3].split(/\s+/).filter(Boolean));
  }
  return out;
}

describe('classes added conditionally', () => {
  it('never set CSS variables, animations, transitions or containers', async () => {
    const used = new Map<string, string>(); // class -> file
    for (const file of sourceFiles(join(root, 'src'))) {
      for (const c of conditionalClasses(readFileSync(file, 'utf8'))) used.set(c, file.slice(root.length + 1));
    }
    expect(used.size).toBeGreaterThan(10); // the scan found the app's conditional classes

    const config = { ...require(join(root, 'tailwind.config.js')), content: [{ raw: [...used.keys()].join(' ') }] };
    const { css } = await postcss([tailwindcss(config)]).process('@tailwind utilities;', { from: undefined });
    const compiled = cssToReactNativeRuntime(css);
    const offenders = Object.entries(compiled.rules as Record<string, unknown>)
      .filter(([, rules]) => /"(variables|animations|transition|container\w*)"/.test(JSON.stringify(rules)))
      .map(([name]) => `${name} (${used.get(name) ?? '?'})`);
    expect(offenders).toEqual([]);
  });

  it('would catch the shadow on the selected tab', async () => {
    expect(conditionalClasses("selected && 'bg-background shadow-sm'")).toContain('shadow-sm');
    expect(conditionalClasses("x ? 'a' : 'b'")).toEqual(['a', 'b']);
    expect(conditionalClasses("{ web: 'ring-2' }")).toEqual([]);
  });
});
