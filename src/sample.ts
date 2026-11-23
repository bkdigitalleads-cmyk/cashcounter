/**
 * The made-up count on the onboarding screens and in the store renders:
 * one evening's close, in the phone's own currency. Never saved, never
 * printed on a person's own count sheet.
 */
import type { CurrencyCode } from './currencies.ts';
import { CURRENCIES } from './currencies.ts';
import type { SavedCount } from './history.ts';
import { countTotals, difference } from './count.ts';

const QTY = [1, 2, 9, 6, 7, 23, 31, 18, 22, 14, 41, 12, 9, 30, 25];

export function samplePieces(currency: CurrencyCode): Record<string, number> {
  const out: Record<string, number> = {};
  CURRENCIES[currency].denominations.filter((d) => d.shown).forEach((d, i) => (out[d.id] = QTY[i % QTY.length]));
  return out;
}

export function sampleCount(currency: CurrencyCode, day: string, now: number): SavedCount {
  const pieces = samplePieces(currency);
  const total = countTotals(currency, pieces).total;
  // Expected a little above what was counted, so the sample shows "Short by".
  const short = currency === 'MXN' ? 4500 : 450;
  const expected = { mode: 'floatSales' as const, amount: 0, float: 20000, sales: total - 20000 + short };
  return {
    id: 'sample',
    tillId: 'sample',
    tillName: 'Front register',
    name: 'Evening close',
    note: 'Float left for tomorrow.',
    day,
    currency,
    pieces,
    custom: [],
    expected,
    total,
    diff: difference(total, expected),
    createdAt: now,
    updatedAt: now,
  };
}
