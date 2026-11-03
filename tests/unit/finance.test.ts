// Copied from tora web: tests/unit/finance.test.ts @ dea6031
// Only the fx and cash flow parts; budgets, recurring and net worth history aren't ported yet.
import { describe, expect, it } from "vitest";

import { byGroup, byMonth, makeContext, totals, type TxLike } from "@/lib/finance/cashflow";
import { sumInBase, toBase } from "@/lib/finance/fx";
import type { Category } from "@/lib/finance/types";

const cat = (id: string, name: string, kind: "expense" | "income", parent_id: string | null = null): Category => ({
  id, name, kind, parent_id, icon: parent_id ? null : "🍜", user_id: "u", is_archived: false,
  sort_order: 0, created_at: "", updated_at: "",
});
const food = cat("food", "Food", "expense");
const groceries = cat("groceries", "Groceries", "expense", "food");
const eatingOut = cat("eating", "Eating out", "expense", "food");
const transport = cat("transport", "Transport", "expense");
const salary = cat("salary", "Salary", "income");
const categories = [food, groceries, eatingOut, transport, salary];
const accounts = [
  { id: "bca", currency: "IDR" },
  { id: "wise", currency: "USD" },
];
const ctx = makeContext(accounts, categories, { USD: 16000 });

const tx = (p: Partial<TxLike>): TxLike => ({
  account_id: "bca", amount: -10000, date: "2026-11-05", kind: "regular", category_id: null, ...p,
});

describe("fx", () => {
  it("converts to IDR and reports missing rates", () => {
    expect(toBase(10, "USD", { USD: 16000 })).toBe(160000);
    expect(toBase(10, "EUR", {})).toBeNull();
    expect(sumInBase([{ amount: 100, currency: "IDR" }, { amount: 1, currency: "EUR" }], {})).toEqual({
      total: 100,
      missing: ["EUR"],
    });
  });
});

describe("cash flow", () => {
  const rows = [
    tx({ amount: 5000000, category_id: "salary" }),
    tx({ amount: -200000, category_id: "groceries" }),
    tx({ amount: 50000, category_id: "groceries" }), // refund
    tx({ amount: -100000, category_id: "eating" }),
    tx({ amount: -10, account_id: "wise", category_id: "transport" }), // US$10 = 160k
    tx({ amount: -300000, kind: "transfer" }), // ignored
    tx({ amount: 999, kind: "adjustment" }), // ignored
    tx({ amount: -25000 }), // uncategorized spending
  ];

  it("totals income and spending, ignoring transfers and adjustments", () => {
    expect(totals(rows, ctx)).toEqual({ income: 5000000, spending: 435000, net: 4565000, unconverted: 0 });
  });

  it("groups spending by category group, refunds included", () => {
    expect(byGroup(rows, ctx).map((g) => [g.name, g.amount])).toEqual([
      ["Food", 250000],
      ["Transport", 160000],
      ["Uncategorized", 25000],
    ]);
  });

  it("counts rows it can't convert", () => {
    const noRates = makeContext(accounts, categories, {});
    expect(totals(rows, noRates).unconverted).toBe(1);
  });

  it("splits by month", () => {
    const res = byMonth([tx({ date: "2026-10-31" }), tx({ date: "2026-11-01" })], ctx, ["2026-10", "2026-11"]);
    expect(res.map((m) => m.spending)).toEqual([10000, 10000]);
  });
});

