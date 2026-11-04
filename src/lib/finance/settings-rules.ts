// Ported from tora web: src/app/(app)/settings/actions.ts @ dea6031 (saveCategory,
// saveAccountType, deleteAccountType's message, saveRates, fetchRates).
// Same checks and messages; pure so they can be tested.
import type { AccountClass, CategoryKind } from '@/lib/finance/types';

type Fail = { ok: false; message: string };
const fail = (message: string): Fail => ({ ok: false, message });

/** A new category (with a group) or group (no parent), or a rename of either. */
export function buildCategory(
  input: { name: string; icon: string; parentId: string | null; kind: CategoryKind },
  groups: { id: string; kind: CategoryKind; parent_id: string | null }[],
  editing: boolean,
) {
  const name = input.name.trim();
  const icon = input.icon.trim() || null;
  if (!name) return fail('Give it a name.');
  if (name.length > 60) return fail('Name is too long (60 characters max).');
  if (icon && [...icon].length > 4) return fail('Use a single emoji as the icon.');
  if (editing) return { ok: true as const, update: { name, icon } };
  let kind = input.kind;
  if (input.parentId) {
    const parent = groups.find((g) => g.id === input.parentId);
    if (!parent || parent.parent_id) return fail('Choose a valid group.');
    kind = parent.kind; // a category always has its group's kind
  } else if (!['expense', 'income'].includes(kind)) {
    return fail('Choose expense or income.');
  }
  return { ok: true as const, insert: { name, icon, parent_id: input.parentId, kind, sort_order: 999 } };
}

const CLASSES: AccountClass[] = ['cash', 'investment', 'liability'];

/** Account type checks. `usedBy` = accounts of this type (only matters when its class changes). */
export function buildAccountType(input: { name: string; cls: AccountClass }, current?: { class: AccountClass }, usedBy = 0) {
  const name = input.name.trim();
  if (!name) return fail('Give it a name.');
  if (name.length > 40) return fail('Name is too long (40 characters max).');
  if (!CLASSES.includes(input.cls)) return fail('Choose what kind of account it is.');
  if (current && current.class !== input.cls && usedBy > 0) {
    return fail(`Its kind can't change while ${usedBy} account${usedBy > 1 ? 's use' : ' uses'} it.`);
  }
  return { ok: true as const, row: { name, class: input.cls } };
}

export const ACCOUNT_TYPE_IN_USE = 'Some accounts still use this type. Change their type first.';

/** A typed rate (1 CODE = x IDR), Indonesian style ("16.250" or "16250,5"). Empty removes it. */
export function parseRate(raw: string, currency: string): { ok: true; rate: number | null } | Fail {
  const s = raw.trim();
  if (s === '') return { ok: true, rate: null };
  const rate = Number(s.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(rate) || rate <= 0) return fail(`The rate for ${currency} isn't a valid number.`);
  return { ok: true, rate };
}

/** Rows from open.er-api.com's IDR rates (1 IDR = x CODE), turned into 1 CODE = x IDR. */
export function ratesFromApi(wanted: string[], body: { result?: string; rates?: Record<string, number> }) {
  if (body.result !== 'success' || !body.rates) return null;
  const rates = body.rates;
  return wanted
    .filter((c) => /^[A-Z]{3}$/.test(c) && c !== 'IDR' && rates[c] > 0)
    .map((c) => ({ currency: c, rate: Math.round((1 / rates[c]) * 1e6) / 1e6, source: 'api' }));
}
