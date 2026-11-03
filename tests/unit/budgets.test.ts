// Copied from tora web: tests/unit/finance.test.ts @ dea6031 (the budgets part, with its fixtures)
import { describe, expect, it } from "vitest";

import { budgetLines, budgetSummary } from "@/lib/finance/budgets";
import { makeContext, spendingByCategory, type TxLike } from "@/lib/finance/cashflow";
import type { Category, CategoryGroup } from "@/lib/finance/types";

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

describe("budgets", () => {
  const groups: CategoryGroup[] = [
    { ...food, children: [groceries, eatingOut] },
    { ...transport, children: [] },
  ];
  const spending = spendingByCategory(
    [tx({ amount: -900000, category_id: "groceries" }), tx({ amount: -300000, category_id: "eating" }), tx({ amount: -50000, category_id: "transport" })],
    ctx,
  );

  it("rolls category budgets up to the group and flags status", () => {
    const lines = budgetLines(groups, new Map([["groceries", 1000000], ["eating", 200000]]), spending);
    const foodLine = lines[0];
    expect(foodLine.total).toMatchObject({ budget: 1200000, spent: 1200000, remaining: 0, status: "warning" });
    expect(foodLine.children.map((c) => c.status)).toEqual(["warning", "over"]);
    expect(lines[1].total.budget).toBeNull();
    expect(budgetSummary(lines)).toEqual({ budget: 1200000, spent: 1250000, unbudgeted: 50000 });
  });

  it("prefers a group's own budget", () => {
    const lines = budgetLines(groups, new Map([["food", 2000000], ["groceries", 1000000]]), spending);
    expect(lines[0]).toMatchObject({ ownBudget: true, total: { budget: 2000000, status: "ok" } });
  });
});
