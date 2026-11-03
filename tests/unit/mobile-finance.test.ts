// Tests for helpers that exist only in the mobile app.
import { describe, expect, it } from 'vitest';

import { isIsoDate, isTime } from '@/lib/finance/dates';
import { netWorthSummary } from '@/lib/finance/net-worth';
import { jakartaNow, jakartaParts, shiftDay } from '@/lib/finance/now';

describe('jakarta time', () => {
  it('is UTC+7 across midnight', () => {
    expect(jakartaParts(new Date('2026-11-03T16:59:00Z'))).toEqual({ date: '2026-11-03', time: '23:59' });
    expect(jakartaParts(new Date('2026-11-03T17:00:00Z'))).toEqual({ date: '2026-11-04', time: '00:00' });
  });

  it('gives a valid date and time now', () => {
    const { date, time } = jakartaNow();
    expect(isIsoDate(date)).toBe(true);
    expect(isTime(time)).toBe(true);
  });

  it('shifts days across months and years', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('netWorthSummary', () => {
  const acc = (p: Partial<Parameters<typeof netWorthSummary>[0][number]>) => ({
    balance: 0,
    currency: 'IDR',
    class: 'cash' as const,
    include_in_net_worth: true,
    is_archived: false,
    ...p,
  });

  it('adds assets, subtracts debts and converts currencies', () => {
    const s = netWorthSummary(
      [
        acc({ balance: 10_000_000 }),
        acc({ balance: 100, currency: 'USD' }),
        acc({ balance: 50_000_000, class: 'investment' }),
        acc({ balance: -2_000_000, class: 'liability' }),
        acc({ balance: 999, include_in_net_worth: false }),
        acc({ balance: 1_000_000, is_archived: true }), // still counted, but listed under archived
        acc({ balance: 5, currency: 'EUR' }), // no rate
      ],
      { USD: 16000 },
    );
    expect(s.cash).toBe(12_600_000);
    expect(s.investment).toBe(50_000_000);
    expect(s.debts).toBe(-2_000_000);
    expect(s.netWorth).toBe(60_600_000);
    expect(s.missing).toEqual(['EUR']);
    expect(s.sections.map((x) => [x.value, x.items.length, x.subtotal])).toEqual([
      ['cash', 4, 11_600_000],
      ['investment', 1, 50_000_000],
      ['liability', 1, -2_000_000],
    ]);
    expect(s.archived).toHaveLength(1);
  });
});
