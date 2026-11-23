/**
 * Money in, money out, as integers. Pure, checked by `npm test`. Nothing
 * else in the app adds up money.
 *
 * Every amount is an integer in minor units (cents, pence, centavos), and
 * every quantity is a whole number of pieces. A count is a sum of
 * pieces x value, so it is exact: no floating point sum ever happens, and
 * a typed amount is read digit by digit, never through a float.
 */

/** The most pieces one row takes (a strap of 100 notes 999 times over). */
export const MAX_QTY = 99_999;

/** The largest amount anyone types (expected, float, sales, a custom row): 99,999,999.99. */
export const MAX_AMOUNT = 9_999_999_999;

/** A whole number of pieces, 0 to MAX_QTY. Anything else becomes the nearest that is. */
export function cleanQty(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(MAX_QTY, Math.floor(v));
}

/** An amount in minor units: an integer, 0 to MAX_AMOUNT. */
export function cleanAmount(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(MAX_AMOUNT, Math.round(v));
}

/** Pieces typed on the keypad: digits only ("0012" is 12), capped at MAX_QTY. */
export function parseQty(text: string): number {
  const digits = String(text ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return 0;
  return digits.length > 5 ? MAX_QTY : cleanQty(Number(digits));
}

/**
 * A typed amount in minor units, read as text so no float is involved:
 * "12.5" is 1250, "1,234.56" is 123456, "12,5" on a comma phone is 1250.
 * Null when there is nothing to read.
 */
export function parseAmount(text: string, decimalMark = '.'): number | null {
  let s = String(text ?? '').trim();
  if (!s) return null;
  const other = decimalMark === ',' ? '.' : ',';
  s = s.replace(/[^\d.,]/g, '');
  // A lone "other" mark followed by 1 or 2 digits reads as a decimal mark too ("12.5" on a comma phone).
  const parts = s.split(other);
  if (parts.length === 2 && !s.includes(decimalMark) && parts[1].length > 0 && parts[1].length <= 2) s = parts.join(decimalMark);
  else s = parts.join('');
  const bits = s.split(decimalMark);
  if (bits.length > 2) return null;
  const whole = bits[0].replace(/^0+(?=\d)/, '');
  const frac = (bits[1] ?? '').slice(0, 2).padEnd(2, '0');
  if (!whole && !bits[1]) return null;
  if (whole.length > 8) return MAX_AMOUNT;
  return cleanAmount(Number(whole || '0') * 100 + Number(frac));
}

/** Adds integers and refuses anything that is not one, so a stray float can never slip into a total. */
export function sumMinor(values: number[]): number {
  let total = 0;
  for (const v of values) {
    if (!Number.isSafeInteger(v)) throw new Error(`Not a whole amount: ${v}`);
    total += v;
  }
  return total;
}
