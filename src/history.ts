/**
 * Saved counts: grouping by day for History, and the CSV export. Pure,
 * checked by `npm test`.
 */
import type { CurrencyCode } from './currencies.ts';
import { CURRENCIES } from './currencies.ts';
import type { CustomAmount, Expected } from './count.ts';
import { expectedAmount } from './count.ts';

export interface SavedCount {
  id: string;
  tillId: string;
  /** The till's name when it was saved, so History keeps it if the till is renamed or removed. */
  tillName: string;
  name: string;
  note: string;
  /** The day the count is for, "YYYY-MM-DD". */
  day: string;
  currency: CurrencyCode;
  pieces: Record<string, number>;
  custom: CustomAmount[];
  expected: Expected;
  total: number;
  /** Counted minus expected, or null with no expected amount. */
  diff: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface DayGroup<T> {
  day: string;
  counts: T[];
}

/** Newest day first; inside a day, newest first. */
export function groupByDay<T extends { day: string; createdAt: number }>(counts: T[]): DayGroup<T>[] {
  const sorted = [...counts].sort((a, b) => (a.day === b.day ? b.createdAt - a.createdAt : a.day < b.day ? 1 : -1));
  const out: DayGroup<T>[] = [];
  for (const c of sorted) {
    const last = out[out.length - 1];
    if (last && last.day === c.day) last.counts.push(c);
    else out.push({ day: c.day, counts: [c] });
  }
  return out;
}

/**
 * A count's name under its till's name: shown only when it says something
 * the till's name does not ("Front register" over "Front register" is
 * shown once). Case and spaces at the ends do not count as a difference.
 */
export function showCountName(name: string, tillName: string): boolean {
  const n = name.trim().toLowerCase();
  return n.length > 0 && n !== tillName.trim().toLowerCase();
}

/**
 * True when a count's name is one the app would have given it for this
 * till (empty, the till's name, or "<till> close"), not one the person
 * typed. Case and spaces at the ends do not count.
 */
export function isDefaultName(name: string, tillName: string): boolean {
  const n = name.trim().toLowerCase();
  const t = tillName.trim().toLowerCase();
  return n === '' || n === t || n === defaultCountName(tillName).toLowerCase();
}

/**
 * The name a count in progress keeps when it moves to another till: a
 * default name follows the till (it becomes empty, so the new till's
 * default applies); a name the person typed stays.
 */
export function nameForTill(name: string, fromTillName: string): string {
  return isDefaultName(name, fromTillName) ? '' : name;
}

/** "Front register, Nov 22" style default name for a new count. */
export function defaultCountName(tillName: string): string {
  return `${tillName.trim() || 'Till'} close`;
}

function cell(v: string | number): string {
  const s = String(v);
  // Quote anything with a comma, quote or line break; a leading = + - @ is a formula in a spreadsheet, so it gets a quote mark.
  const safe = /^[=+\-@]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Minor units as "1250.50": plain, dot decimal, no symbol, so every spreadsheet reads it. */
export function plainAmount(minor: number): string {
  const neg = minor < 0;
  const m = Math.abs(minor);
  return `${neg ? '-' : ''}${Math.floor(m / 100)}.${String(m % 100).padStart(2, '0')}`;
}

/**
 * History as CSV, one row per saved count, oldest first: date, till, name,
 * currency, total, expected, difference, over or short, the note, then the
 * pieces of each note and coin of that currency and the custom rows.
 */
export function historyCsv(counts: SavedCount[]): string {
  const sorted = [...counts].sort((a, b) => (a.day === b.day ? a.createdAt - b.createdAt : a.day < b.day ? -1 : 1));
  const denomCols: { cur: CurrencyCode; id: string; head: string }[] = [];
  for (const cur of [...new Set(sorted.map((c) => c.currency))])
    for (const d of CURRENCIES[cur].denominations) denomCols.push({ cur, id: d.id, head: `${cur} ${d.tile} ${d.kind}` });
  const customHeads = [...new Set(sorted.flatMap((c) => c.custom.map((x) => x.label.trim() || 'Other')))];
  const head = ['Date', 'Till', 'Name', 'Currency', 'Total', 'Expected', 'Difference', 'Result', 'Note', ...denomCols.map((d) => d.head), ...customHeads];
  const lines = [head.map(cell).join(',')];
  for (const c of sorted) {
    const x = expectedAmount(c.expected);
    const result = c.diff == null ? '' : c.diff < 0 ? 'Short' : c.diff > 0 ? 'Over' : 'Balanced';
    const row: (string | number)[] = [c.day, c.tillName, c.name, c.currency, plainAmount(c.total), x == null ? '' : plainAmount(x), c.diff == null ? '' : plainAmount(c.diff), result, c.note];
    for (const d of denomCols) row.push(d.cur === c.currency ? c.pieces[d.id] ?? 0 : '');
    for (const h of customHeads) {
      const sum = c.custom.filter((x) => (x.label.trim() || 'Other') === h).reduce((a, x) => a + x.amount, 0);
      row.push(c.custom.some((x) => (x.label.trim() || 'Other') === h) ? plainAmount(sum) : '');
    }
    lines.push(row.map(cell).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

/** "Cash counts 2026-11-22.csv". */
export function csvFileName(today: string): string {
  return `Cash counts ${today}.csv`;
}
