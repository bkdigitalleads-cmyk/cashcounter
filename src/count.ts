/**
 * A count: pieces per note and coin, any custom rows (checks, vouchers)
 * entered as amounts, and an optional expected amount. Pure, checked by
 * `npm test`.
 *
 *   row subtotal = pieces x value            (integers, minor units)
 *   cash         = sum of the row subtotals
 *   total        = cash + custom rows
 *   expected     = an amount, or a starting float plus sales
 *   difference   = total - expected          (below 0 is short, above 0 is over)
 */
import type { CurrencyCode, Denomination } from './currencies.ts';
import { CURRENCIES, isCurrencyCode } from './currencies.ts';
import { cleanAmount, cleanQty, MAX_QTY, sumMinor } from './money.ts';

export type ExpectedMode = 'none' | 'amount' | 'floatSales';

export interface Expected {
  mode: ExpectedMode;
  /** What the till should hold, when mode is 'amount'. Minor units. */
  amount: number;
  /** The starting float, when mode is 'floatSales'. */
  float: number;
  /** Cash sales for the day, when mode is 'floatSales'. */
  sales: number;
}

export const NO_EXPECTED: Expected = { mode: 'none', amount: 0, float: 0, sales: 0 };

/** A custom row in a count: its label as it was, and the amount entered. */
export interface CustomAmount {
  id: string;
  label: string;
  amount: number;
}

/** The count on screen, before it is saved (or a saved one reopened). */
export interface Draft {
  /** The saved count this edits, or null for a new one. */
  savedId: string | null;
  tillId: string;
  currency: CurrencyCode;
  /** Pieces by denomination id. */
  pieces: Record<string, number>;
  custom: CustomAmount[];
  expected: Expected;
  /** Carried over when a saved count is reopened. */
  name: string;
  note: string;
  day: string | null;
}

export function emptyDraft(tillId: string, currency: CurrencyCode, expected: Expected = NO_EXPECTED): Draft {
  return { savedId: null, tillId, currency, pieces: {}, custom: [], expected: { ...expected }, name: '', note: '', day: null };
}

/** A denomination's subtotal. */
export function rowAmount(d: Denomination, qty: number): number {
  return d.value * cleanQty(qty);
}

export interface CountTotals {
  /** Subtotal per denomination id, for every row with pieces. */
  rows: Record<string, number>;
  cash: number;
  /** Custom rows (checks, vouchers). */
  other: number;
  total: number;
  pieces: number;
}

export function countTotals(currency: CurrencyCode, pieces: Record<string, number>, custom: CustomAmount[] = []): CountTotals {
  const rows: Record<string, number> = {};
  let n = 0;
  for (const d of CURRENCIES[currency].denominations) {
    const q = cleanQty(pieces[d.id]);
    if (q > 0) {
      rows[d.id] = rowAmount(d, q);
      n += q;
    }
  }
  const cash = sumMinor(Object.values(rows));
  const other = sumMinor(custom.map((c) => cleanAmount(c.amount)));
  return { rows, cash, other, total: cash + other, pieces: n };
}

/** What the till should hold, or null when nothing was entered. */
export function expectedAmount(e: Expected): number | null {
  if (e.mode === 'amount') return cleanAmount(e.amount);
  if (e.mode === 'floatSales') return cleanAmount(e.float) + cleanAmount(e.sales);
  return null;
}

/** Counted minus expected, or null with no expected amount. Below 0 is short. */
export function difference(total: number, e: Expected): number | null {
  const x = expectedAmount(e);
  return x == null ? null : total - x;
}

export type DiffKind = 'short' | 'over' | 'even';

export function diffKind(diff: number): DiffKind {
  return diff < 0 ? 'short' : diff > 0 ? 'over' : 'even';
}

/** "Short by $4.50", "Over by $2.00", or "Balanced". `money` formats minor units. */
export function diffWords(diff: number, money: (minor: number) => string): string {
  const k = diffKind(diff);
  if (k === 'even') return 'Balanced';
  return `${k === 'short' ? 'Short' : 'Over'} by ${money(Math.abs(diff))}`;
}

/** One more, one less, or a typed number, never below 0 or above the cap. */
export function stepQty(qty: number, delta: number): number {
  return cleanQty(cleanQty(qty) + delta);
}

/** Adds one standard roll, bag or strap. Unchanged when the denomination has none. */
export function addPack(qty: number, d: Denomination): number {
  return d.pack ? Math.min(MAX_QTY, cleanQty(qty) + d.pack) : cleanQty(qty);
}

/** True when nothing has been counted or entered (no need to keep or warn about it). */
export function isBlank(d: Draft): boolean {
  return Object.values(d.pieces).every((q) => !cleanQty(q)) && d.custom.every((c) => !cleanAmount(c.amount));
}

/** The pieces, cleaned: whole numbers, known denominations only, no zeros. */
export function cleanPieces(currency: CurrencyCode, pieces: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!pieces || typeof pieces !== 'object') return out;
  const ids = new Set(CURRENCIES[currency].denominations.map((d) => d.id));
  for (const [k, v] of Object.entries(pieces as Record<string, unknown>)) {
    const q = cleanQty(v);
    if (ids.has(k) && q > 0) out[k] = q;
  }
  return out;
}

export function cleanCustom(list: unknown): CustomAmount[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => c && typeof c === 'object' && typeof c.id === 'string')
    .map((c) => ({ id: c.id, label: typeof c.label === 'string' ? c.label.slice(0, 40) : '', amount: cleanAmount(c.amount) }));
}

export function cleanExpected(e: unknown): Expected {
  if (!e || typeof e !== 'object') return { ...NO_EXPECTED };
  const x = e as Partial<Expected>;
  const mode: ExpectedMode = x.mode === 'amount' || x.mode === 'floatSales' ? x.mode : 'none';
  return { mode, amount: cleanAmount(x.amount), float: cleanAmount(x.float), sales: cleanAmount(x.sales) };
}

/** A stored draft read back, with anything damaged replaced by a safe value. Null when unreadable. */
export function parseDraft(json: string | null): Draft | null {
  try {
    const v = JSON.parse(json ?? 'null');
    if (!v || typeof v !== 'object' || typeof v.tillId !== 'string') return null;
    const currency: CurrencyCode = isCurrencyCode(v.currency) ? v.currency : 'USD';
    return {
      savedId: typeof v.savedId === 'string' ? v.savedId : null,
      tillId: v.tillId,
      currency,
      pieces: cleanPieces(currency, v.pieces),
      custom: cleanCustom(v.custom),
      expected: cleanExpected(v.expected),
      name: typeof v.name === 'string' ? v.name : '',
      note: typeof v.note === 'string' ? v.note : '',
      day: typeof v.day === 'string' ? v.day : null,
    };
  } catch {
    return null;
  }
}

let seq = 0;
/** A short random id. */
export function newId(): string {
  seq = (seq + 1) % 1_000_000;
  return `${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
