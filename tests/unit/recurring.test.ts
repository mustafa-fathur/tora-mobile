// Copied from tora web: tests/unit/finance.test.ts @ dea6031 (the recurring and monthsUntil parts)
import { describe, expect, it } from "vitest";

import { describeFrequency, nextDate, occurrences } from "@/lib/finance/recurring";

describe("recurring dates", () => {
  it("advances by frequency and keeps month-end bills sane", () => {
    expect(nextDate("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextDate("2026-02-28", "monthly", 1, 31)).toBe("2026-03-31");
    expect(nextDate("2026-11-02", "weekly", 2)).toBe("2026-11-16");
    expect(nextDate("2028-02-29", "yearly")).toBe("2029-02-28");
    expect(nextDate("2026-12-15", "monthly", 3)).toBe("2027-03-15");
  });

  it("lists upcoming occurrences until a date or end date", () => {
    const item = { next_due_date: "2026-11-30", frequency: "monthly" as const, interval_count: 1, end_date: null };
    expect(occurrences(item, "2027-02-28")).toEqual(["2026-11-30", "2026-12-30", "2027-01-30", "2027-02-28"]);
    expect(occurrences({ ...item, end_date: "2026-12-31" }, "2027-12-31")).toHaveLength(2);
  });

  it("describes frequencies", () => {
    expect(describeFrequency("monthly", 1)).toBe("Monthly");
    expect(describeFrequency("weekly", 2)).toBe("Every 2 weeks");
  });
});

describe("monthsUntil", async () => {
  const { monthsUntil, monthlyEquivalent } = await import("@/lib/finance/recurring");
  it("counts whole months, at least one for future dates", () => {
    expect(monthsUntil("2026-11-02", "2027-11-02")).toBe(12);
    expect(monthsUntil("2026-11-02", "2026-11-20")).toBe(1);
    expect(monthsUntil("2026-11-02", "2026-10-01")).toBe(0);
  });
  it("normalizes recurring amounts to a month", () => {
    expect(monthlyEquivalent(-1200000, "yearly", 1)).toBe(-100000);
    expect(monthlyEquivalent(-100000, "monthly", 2)).toBe(-50000);
  });
});
