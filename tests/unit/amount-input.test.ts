import { describe, expect, it } from 'vitest';

import { parseAmountInput } from '@/lib/amount-input';

describe('parseAmountInput', () => {
  it.each([
    ['45.000', 45000],
    ['45000', 45000],
    ['Rp 1.250.000', 1250000],
    ['45rb', 45000],
    ['45 rb', 45000],
    ['45RB', 45000],
    ['45 ribu', 45000],
    ['45k', 45000],
    ['1,5jt', 1500000],
    ['1.5jt', 1500000],
    ['1,25 juta', 1250000],
    ['2jt', 2000000],
    ['Rp 45rb', 45000],
    ['12,5rb', 12500],
  ])('reads %s as %d', (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected);
  });

  it('keeps decimals for currencies that have them', () => {
    expect(parseAmountInput('1,5k', 'USD')).toBe(1500);
    expect(parseAmountInput('10,50', 'USD')).toBe(10.5);
  });

  it.each(['', 'rb', 'jt', '0rb', 'abc', '99999999999jt'])('rejects %j', (input) => {
    expect(parseAmountInput(input)).toBeNull();
  });
});
