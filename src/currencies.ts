/**
 * The six launch currencies, their notes and coins, largest first, and the
 * standard roll (or bag) and strap counts for each. Pure, checked by
 * `npm test`. Every value is in minor units (cents, pence, centavos) as an
 * integer, so a count never adds up floating point dust.
 *
 * Roll and strap counts are the usual bank wrapping for that currency:
 *  - US dollar: rolls of 50 pennies, 40 nickels, 50 dimes, 40 quarters,
 *    20 half dollars, 25 dollar coins; straps of 100 notes.
 *  - Canadian dollar: rolls of 40 nickels, 50 dimes, 40 quarters,
 *    25 loonies, 25 toonies; bundles of 100 notes.
 *  - Euro: rolls of 50 (1, 2 and 5 cent), 40 (10, 20 and 50 cent),
 *    25 (1 and 2 euro); straps of 100 notes.
 *  - Pound: bank bags by value (1p and 2p £1, 5p and 10p £5, 20p and 50p
 *    £10, £1 and £2 £20); straps of 50 notes.
 *  - Australian dollar: rolls of 5c $2, 10c $4, 20c $4, 50c $10, $1 $20,
 *    $2 $50; straps of 100 notes.
 *  - Mexican peso: straps (fajillas) of 100 notes. No coin roll is offered:
 *    there is no single wrapping count used everywhere.
 * Brian checks these against a local bank before launch (NOTES.md).
 */

export type CurrencyCode = 'USD' | 'CAD' | 'EUR' | 'GBP' | 'AUD' | 'MXN';

export const CURRENCY_CODES: CurrencyCode[] = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'MXN'];

export interface Denomination {
  /** Unique within its currency: "n2000" is a 20 note, "c25" a 25 coin. */
  id: string;
  kind: 'note' | 'coin';
  /** Minor units. */
  value: number;
  /** What the tile says: "$20", "25¢", "€2", "20p". */
  tile: string;
  /** The row's name: "Twenties", "Quarters", "€50 notes". */
  name: string;
  /** Pieces in a standard roll, bag or strap, when there is one. */
  pack?: number;
  /** Shown on screen until the person hides it. */
  shown: boolean;
}

export interface Currency {
  code: CurrencyCode;
  name: string;
  /** The word for a wrapped stack of coins: roll, or bag in the UK. */
  coinPack: 'roll' | 'bag';
  denominations: Denomination[];
}

const note = (value: number, tile: string, name: string, pack: number, shown = true): Denomination => ({ id: `n${value}`, kind: 'note', value, tile, name, pack, shown });
const coin = (value: number, tile: string, name: string, pack: number | undefined, shown = true): Denomination => ({ id: `c${value}`, kind: 'coin', value, tile, name, pack, shown });

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: {
    code: 'USD',
    name: 'US dollar',
    coinPack: 'roll',
    denominations: [
      note(10000, '$100', 'Hundreds', 100),
      note(5000, '$50', 'Fifties', 100),
      note(2000, '$20', 'Twenties', 100),
      note(1000, '$10', 'Tens', 100),
      note(500, '$5', 'Fives', 100),
      note(200, '$2', 'Twos', 100, false),
      note(100, '$1', 'Ones', 100),
      coin(100, '$1', 'Dollar coins', 25, false),
      coin(50, '50¢', 'Half dollars', 20, false),
      coin(25, '25¢', 'Quarters', 40),
      coin(10, '10¢', 'Dimes', 50),
      coin(5, '5¢', 'Nickels', 40),
      coin(1, '1¢', 'Pennies', 50),
    ],
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian dollar',
    coinPack: 'roll',
    denominations: [
      note(10000, '$100', 'Hundreds', 100),
      note(5000, '$50', 'Fifties', 100),
      note(2000, '$20', 'Twenties', 100),
      note(1000, '$10', 'Tens', 100),
      note(500, '$5', 'Fives', 100),
      coin(200, '$2', 'Toonies', 25),
      coin(100, '$1', 'Loonies', 25),
      coin(25, '25¢', 'Quarters', 40),
      coin(10, '10¢', 'Dimes', 50),
      coin(5, '5¢', 'Nickels', 40),
    ],
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    coinPack: 'roll',
    denominations: [
      note(50000, '€500', '€500 notes', 100, false),
      note(20000, '€200', '€200 notes', 100, false),
      note(10000, '€100', '€100 notes', 100),
      note(5000, '€50', '€50 notes', 100),
      note(2000, '€20', '€20 notes', 100),
      note(1000, '€10', '€10 notes', 100),
      note(500, '€5', '€5 notes', 100),
      coin(200, '€2', '€2 coins', 25),
      coin(100, '€1', '€1 coins', 25),
      coin(50, '50c', '50 cent coins', 40),
      coin(20, '20c', '20 cent coins', 40),
      coin(10, '10c', '10 cent coins', 40),
      coin(5, '5c', '5 cent coins', 50),
      coin(2, '2c', '2 cent coins', 50),
      coin(1, '1c', '1 cent coins', 50),
    ],
  },
  GBP: {
    code: 'GBP',
    name: 'British pound',
    coinPack: 'bag',
    denominations: [
      note(5000, '£50', '£50 notes', 50),
      note(2000, '£20', '£20 notes', 50),
      note(1000, '£10', '£10 notes', 50),
      note(500, '£5', '£5 notes', 50),
      coin(200, '£2', '£2 coins', 10),
      coin(100, '£1', '£1 coins', 20),
      coin(50, '50p', '50p coins', 20),
      coin(20, '20p', '20p coins', 50),
      coin(10, '10p', '10p coins', 50),
      coin(5, '5p', '5p coins', 100),
      coin(2, '2p', '2p coins', 50),
      coin(1, '1p', '1p coins', 100),
    ],
  },
  AUD: {
    code: 'AUD',
    name: 'Australian dollar',
    coinPack: 'roll',
    denominations: [
      note(10000, '$100', '$100 notes', 100),
      note(5000, '$50', '$50 notes', 100),
      note(2000, '$20', '$20 notes', 100),
      note(1000, '$10', '$10 notes', 100),
      note(500, '$5', '$5 notes', 100),
      coin(200, '$2', '$2 coins', 25),
      coin(100, '$1', '$1 coins', 20),
      coin(50, '50c', '50c coins', 20),
      coin(20, '20c', '20c coins', 20),
      coin(10, '10c', '10c coins', 40),
      coin(5, '5c', '5c coins', 40),
    ],
  },
  MXN: {
    code: 'MXN',
    name: 'Mexican peso',
    coinPack: 'roll',
    denominations: [
      note(100000, '$1000', '$1000 notes', 100),
      note(50000, '$500', '$500 notes', 100),
      note(20000, '$200', '$200 notes', 100),
      note(10000, '$100', '$100 notes', 100),
      note(5000, '$50', '$50 notes', 100),
      note(2000, '$20', '$20 notes', 100),
      coin(2000, '$20', '$20 coins', undefined, false),
      coin(1000, '$10', '$10 coins', undefined),
      coin(500, '$5', '$5 coins', undefined),
      coin(200, '$2', '$2 coins', undefined),
      coin(100, '$1', '$1 coins', undefined),
      coin(50, '50¢', '50¢ coins', undefined),
      coin(20, '20¢', '20¢ coins', undefined, false),
      coin(10, '10¢', '10¢ coins', undefined, false),
    ],
  },
};

export function isCurrencyCode(c: unknown): c is CurrencyCode {
  return typeof c === 'string' && (CURRENCY_CODES as string[]).includes(c);
}

export function currencyOf(code: string | null | undefined): Currency {
  return isCurrencyCode(code) ? CURRENCIES[code] : CURRENCIES.USD;
}

/** The denomination with this id in this currency, or null. */
export function denomination(code: CurrencyCode, id: string): Denomination | null {
  return CURRENCIES[code].denominations.find((d) => d.id === id) ?? null;
}

const EURO_REGIONS = ['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'AD', 'MC', 'SM', 'VA', 'ME', 'XK', 'BG'];

/**
 * The currency on first launch, from the phone's region: US dollar in the
 * US, euro in the euro area, and so on. A phone whose region uses none of
 * the six falls back to its own currency when it is one of them, then to
 * the US dollar.
 */
export function currencyForRegion(region: string | null | undefined, phoneCurrency?: string | null): CurrencyCode {
  const r = (region ?? '').toUpperCase();
  const byRegion: Record<string, CurrencyCode> = { US: 'USD', PR: 'USD', EC: 'USD', SV: 'USD', PA: 'USD', CA: 'CAD', GB: 'GBP', IM: 'GBP', JE: 'GBP', GG: 'GBP', AU: 'AUD', MX: 'MXN' };
  if (byRegion[r]) return byRegion[r];
  if (EURO_REGIONS.includes(r)) return 'EUR';
  const c = (phoneCurrency ?? '').toUpperCase();
  return isCurrencyCode(c) ? c : 'USD';
}

/** "roll" or "bag" for a coin, "strap" for a note: the word on the long-press sheet. */
export function packWord(code: CurrencyCode, d: Denomination): string {
  return d.kind === 'note' ? 'strap' : CURRENCIES[code].coinPack;
}

/** Paper size for the count sheet: US Letter in the Americas that use it, A4 everywhere else. */
export function paperForRegion(region: string | null | undefined): 'letter' | 'a4' {
  return ['US', 'CA', 'MX', 'PR', 'PH', 'CL', 'CO', 'VE', 'GT', 'CR', 'SV', 'PA', 'DO'].includes((region ?? '').toUpperCase()) ? 'letter' : 'a4';
}
