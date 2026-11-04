import { describe, expect, it } from 'vitest';

import { compactIdr } from '@/lib/compact';
import { formatCompact } from '@/lib/money';

describe('compactIdr', () => {
  it.each([
    [0, '0'],
    [950, '950'],
    [45000, '45 rb'],
    [45500, '45,5 rb'],
    [1250000, '1,3 jt'],
    [-1250000, '1,3 jt'],
    [2400000000, '2,4 M'],
  ])('shortens %d to %s', (n, expected) => {
    expect(compactIdr(n)).toBe(expected);
  });

  it("matches the web's formatCompact (Intl) across magnitudes", () => {
    const samples = [0, 1, 999, 1000, 1049, 1050, 12345, 99999, 999949, 999950, 1000000, 1049999, 1050000, 25500000,
      999999999, 1000000000, 1234567890, 999950000000, 1500000000000];
    for (const n of samples) expect(compactIdr(n), String(n)).toBe(formatCompact(n));
  });
});
