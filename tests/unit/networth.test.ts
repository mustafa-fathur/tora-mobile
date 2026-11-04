// Copied from tora web: tests/unit/finance.test.ts @ dea6031 (the net worth history part)
import { describe, expect, it } from "vitest";

import { netWorthHistory } from "@/lib/finance/networth";

describe("net worth history", () => {
  it("adds opening balances and transactions up to each month end", () => {
    const accts = [
      { id: "bca", currency: "IDR", opening_balance: 1000, include_in_net_worth: true, created_at: "2026-10-03T00:00:00Z" },
      { id: "card", currency: "IDR", opening_balance: -500, include_in_net_worth: true, created_at: "2026-11-01T00:00:00Z" },
      { id: "hidden", currency: "IDR", opening_balance: 9999, include_in_net_worth: false, created_at: "2026-09-01T00:00:00Z" },
      { id: "usd", currency: "USD", opening_balance: 1, include_in_net_worth: true, created_at: "2026-11-01T00:00:00Z" },
    ];
    const rows = [
      { account_id: "bca", date: "2026-10-20", amount: -200 },
      { account_id: "bca", date: "2026-11-10", amount: 300 },
    ];
    expect(netWorthHistory(accts, rows, ["2026-09", "2026-10", "2026-11"], { USD: 16000 })).toEqual([
      { month: "2026-09", netWorth: 0 },
      { month: "2026-10", netWorth: 800 },
      { month: "2026-11", netWorth: 1100 - 500 + 16000 },
    ]);
  });
});
