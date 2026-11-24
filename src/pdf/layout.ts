/**
 * The count sheet: one page with the count's rows, subtotals, total,
 * expected amount, difference, till, date, note and signature lines, as a
 * list of drawing operations in points, top-left origin. Pure: the PDF
 * writer (pdf.ts, pdf-lib) and the on-screen preview (ui/SheetView.tsx,
 * react-native-svg) draw these same operations with the same font files,
 * so the preview is the PDF. Checked by `npm test`.
 *
 * The page carries only what the person counted and typed. No logo, no
 * brand, no artwork: notes and coins are named, not pictured.
 */
import type { CurrencyCode } from '../currencies.ts';
import { CURRENCIES } from '../currencies.ts';
import type { SavedCount } from '../history.ts';
import { showCountName } from '../history.ts';
import { countTotals, diffKind, diffWords, expectedAmount } from '../count.ts';
import { formatDate, formatMoney, formatQty, formatTime } from '../format.ts';

export type FontKey = 'regular' | 'medium' | 'bold';

export interface Measure {
  /** Width of the text in points at this size, as the PDF will set it. */
  width(text: string, font: FontKey, size: number): number;
  /** The text with anything the font cannot draw replaced. */
  clean(text: string, font: FontKey): string;
}

export type Op =
  | { k: 'text'; x: number; y: number; text: string; font: FontKey; size: number; color: string }
  | { k: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; lw?: number }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; lw: number };

export interface Page {
  width: number;
  height: number;
  ops: Op[];
}

export type Paper = 'letter' | 'a4';

export const PAPER_SIZE: Record<Paper, { width: number; height: number }> = {
  letter: { width: 612, height: 792 },
  a4: { width: 595.28, height: 841.89 },
};

export const SHEET_INK = '#111418';
export const SHEET_SOFT = '#4E545C';
export const SHEET_FAINT = '#8A9099';
export const SHEET_RULE = '#D5D9DF';
export const SHEET_BAND = '#EEF0F3';
/** The difference, when over or short: one color, dark enough to print and copy. */
export const SHEET_FLAG = '#9A3A00';

export interface SheetInput {
  count: SavedCount;
  paper: Paper;
  locale: string;
}

/** Splits text into lines no wider than max, at spaces, keeping the person's own line breaks; long words are cut. */
export function wrap(m: Measure, text: string, font: FontKey, size: number, max: number): string[] {
  const out: string[] = [];
  for (const para of m.clean(text, font).split(/\r?\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let line = '';
    for (let word of words) {
      while (m.width(word, font, size) > max && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && m.width(word.slice(0, cut), font, size) > max) cut--;
        if (line) {
          out.push(line);
          line = '';
        }
        out.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (m.width(next, font, size) <= max) line = next;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  while (out.length > 1 && out[out.length - 1] === '') out.pop();
  return out;
}

/** Shortens one line with an ellipsis to fit. */
export function fit(m: Measure, text: string, font: FontKey, size: number, max: number): string {
  const t = m.clean(text, font);
  if (m.width(t, font, size) <= max) return t;
  let s = t;
  while (s.length > 1 && m.width(`${s}...`, font, size) > max) s = s.slice(0, -1);
  return `${s.trimEnd()}...`;
}

/** The rows the sheet lists: every note and coin normally shown, and any other with pieces. */
export function sheetRows(currency: CurrencyCode, pieces: Record<string, number>) {
  return CURRENCIES[currency].denominations.filter((d) => d.shown || (pieces[d.id] ?? 0) > 0);
}

export function layoutSheet(m: Measure, input: SheetInput): Page {
  const { count: c, locale } = input;
  const { width: W, height: H } = PAPER_SIZE[input.paper];
  const ops: Op[] = [];
  const M = 48;
  const right = W - M;
  const money = (minor: number) => formatMoney(minor, c.currency, locale);
  const text = (x: number, y: number, s: string, font: FontKey, size: number, color = SHEET_INK) => ops.push({ k: 'text', x, y, text: m.clean(s, font), font, size, color });
  const textR = (x: number, y: number, s: string, font: FontKey, size: number, color = SHEET_INK) => {
    const t = m.clean(s, font);
    ops.push({ k: 'text', x: x - m.width(t, font, size), y, text: t, font, size, color });
  };
  const rule = (y: number, lw = 0.6, color = SHEET_RULE, x1 = M, x2 = right) => ops.push({ k: 'line', x1, y1: y, x2, y2: y, color, lw });

  // ---- head: what, which till, when ----
  let y = M + 10;
  text(M, y, 'CASH COUNT', 'bold', 10, SHEET_SOFT);
  textR(right, y, `${CURRENCIES[c.currency].name}, ${c.currency}`, 'regular', 10, SHEET_SOFT);
  y += 26;
  text(M, y, fit(m, c.tillName || 'Till', 'bold', 24, right - M - 170), 'bold', 24);
  textR(right, y, formatDate(c.day, locale), 'medium', 14);
  y += 18;
  // The count's name under the till's, only when it says something else.
  if (showCountName(c.name, c.tillName)) text(M, y, fit(m, c.name, 'regular', 12, right - M - 170), 'regular', 12, SHEET_SOFT);
  textR(right, y, `Saved ${formatTime(c.updatedAt, locale)}`, 'regular', 10, SHEET_SOFT);
  y += 14;
  rule(y, 1.4, SHEET_INK);

  // ---- the table ----
  const rows = sheetRows(c.currency, c.pieces);
  const notes = rows.filter((d) => d.kind === 'note');
  const coins = rows.filter((d) => d.kind === 'coin');
  const custom = c.custom.filter((x) => x.amount > 0);
  const t = countTotals(c.currency, c.pieces, custom);
  const colPieces = M + 300;
  const sections = [notes.length > 0, coins.length > 0, custom.length > 0].filter(Boolean).length;
  const lineCount = rows.length + custom.length;
  // Room for the table: what is left after the head, totals, note and signatures.
  const noteLines = c.note.trim() ? Math.min(4, wrap(m, c.note.trim(), 'regular', 10, right - M).length) : 0;
  const reserved = 182 + (noteLines ? 26 + noteLines * 13 : 0) + 92 + 30;
  const avail = H - M - y - reserved - sections * 30;
  const rowH = Math.max(14, Math.min(21, avail / Math.max(1, lineCount)));
  const size = rowH >= 18 ? 11 : 9.5;

  const header = (label: string, sub: number) => {
    y += 8;
    ops.push({ k: 'rect', x: M, y, w: right - M, h: 20, fill: SHEET_BAND });
    text(M + 8, y + 14, label.toUpperCase(), 'bold', 9.5, SHEET_SOFT);
    textR(colPieces, y + 14, label === 'Other' ? '' : 'PIECES', 'bold', 9.5, SHEET_SOFT);
    textR(right - 8, y + 14, money(sub), 'bold', 9.5, SHEET_SOFT);
    y += 20;
  };
  const line = (left: string, name: string, pieces: string | null, amount: number, faint: boolean) => {
    y += rowH;
    const base = y - (rowH - size) / 2 - 1;
    const color = faint ? SHEET_FAINT : SHEET_INK;
    text(M + 8, base, left, 'bold', size, color);
    text(M + 64, base, fit(m, name, 'regular', size, colPieces - M - 120), 'regular', size, faint ? SHEET_FAINT : SHEET_SOFT);
    if (pieces != null) textR(colPieces, base, pieces, 'medium', size, color);
    textR(right - 8, base, faint ? '-' : money(amount), 'medium', size, color);
    rule(y, 0.5);
  };
  const sectionSum = (list: typeof rows) => list.reduce((a, d) => a + (t.rows[d.id] ?? 0), 0);
  if (notes.length) {
    header('Notes', sectionSum(notes));
    for (const d of notes) line(d.tile, d.name, formatQty(c.pieces[d.id] ?? 0, locale), t.rows[d.id] ?? 0, !(c.pieces[d.id] ?? 0));
  }
  if (coins.length) {
    header('Coins', sectionSum(coins));
    for (const d of coins) line(d.tile, d.name, formatQty(c.pieces[d.id] ?? 0, locale), t.rows[d.id] ?? 0, !(c.pieces[d.id] ?? 0));
  }
  if (custom.length) {
    header('Other', t.other);
    for (const x of custom) line('', x.label || 'Other', null, x.amount, false);
  }

  // ---- totals ----
  y += 22;
  const labelX = M + 250;
  const total = (label: string, value: string, font: FontKey, sz: number, color = SHEET_INK) => {
    text(labelX, y, label, font === 'bold' ? 'bold' : 'regular', sz, color === SHEET_INK ? SHEET_SOFT : color);
    textR(right - 8, y, value, font, sz, color);
  };
  total('Cash', money(t.cash), 'medium', 11);
  if (t.other) {
    y += 16;
    total('Other', money(t.other), 'medium', 11);
  }
  y += 10;
  rule(y, 1.4, SHEET_INK, labelX, right);
  y += 24;
  text(labelX, y, 'Total', 'bold', 16, SHEET_INK);
  textR(right - 8, y, money(t.total), 'bold', 20);
  const x = expectedAmount(c.expected);
  if (x != null) {
    if (c.expected.mode === 'floatSales') {
      y += 22;
      text(labelX, y, 'Starting float', 'regular', 10, SHEET_SOFT);
      textR(right - 8, y, money(c.expected.float), 'regular', 10, SHEET_SOFT);
      y += 14;
      text(labelX, y, 'Cash sales', 'regular', 10, SHEET_SOFT);
      textR(right - 8, y, money(c.expected.sales), 'regular', 10, SHEET_SOFT);
      y += 18;
    } else y += 22;
    text(labelX, y, 'Expected', 'regular', 11, SHEET_SOFT);
    textR(right - 8, y, money(x), 'medium', 11);
    y += 20;
    const diff = t.total - x;
    const k = diffKind(diff);
    const color = k === 'even' ? SHEET_INK : SHEET_FLAG;
    if (k !== 'even') ops.push({ k: 'rect', x: labelX - 8, y: y - 15, w: right - labelX + 8, h: 22, stroke: SHEET_FLAG, lw: 1.2 });
    text(labelX, y, 'Difference', 'bold', 11, color);
    textR(right - 8, y, diffWords(diff, money), 'bold', 12, color);
  } else {
    y += 20;
    text(labelX, y, 'No expected amount entered.', 'regular', 10, SHEET_FAINT);
  }

  // ---- note ----
  if (noteLines) {
    y += 30;
    text(M, y, 'NOTE', 'bold', 9.5, SHEET_SOFT);
    const lines = wrap(m, c.note.trim(), 'regular', 10, right - M).slice(0, 4);
    for (const l of lines) {
      y += 13;
      text(M, y, l, 'regular', 10, SHEET_INK);
    }
  }

  // ---- signatures, at the foot of the page ----
  const sy = Math.max(y + 56, H - M - 64);
  const half = (right - M - 24) / 2;
  for (const [i, label] of ['Counted by', 'Checked by'].entries()) {
    const x0 = M + i * (half + 24);
    rule(sy, 0.8, SHEET_INK, x0, x0 + half - 70);
    rule(sy, 0.8, SHEET_INK, x0 + half - 60, x0 + half);
    text(x0, sy + 13, label, 'regular', 9, SHEET_SOFT);
    text(x0 + half - 60, sy + 13, 'Date', 'regular', 9, SHEET_SOFT);
  }
  text(M, H - M + 18, fit(m, `Count sheet, ${c.tillName || 'Till'}, ${formatDate(c.day, locale)}`, 'regular', 8.5, right - M), 'regular', 8.5, SHEET_FAINT);

  return { width: W, height: H, ops };
}
