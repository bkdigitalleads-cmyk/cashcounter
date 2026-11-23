/**
 * Which rows the count shows, per currency: the notes and coins (some rare
 * ones start hidden, like the $2 note), any the person hid or showed, and
 * their custom rows (checks, gift vouchers), each entered as an amount.
 * Pure, checked by `npm test`.
 */
import type { CurrencyCode, Denomination } from './currencies.ts';
import { CURRENCIES } from './currencies.ts';

export interface CustomRowDef {
  id: string;
  label: string;
}

export interface RowSetup {
  /** Denomination id to shown (true) or hidden (false), where it differs from the default. */
  overrides: Record<string, boolean>;
  custom: CustomRowDef[];
}

export const EMPTY_SETUP: RowSetup = { overrides: {}, custom: [] };

/** Most custom rows a currency can have. */
export const MAX_CUSTOM = 8;

export function isShown(d: Denomination, setup: RowSetup): boolean {
  return setup.overrides[d.id] ?? d.shown;
}

/** The rows on the count screen, largest first. A hidden row that holds pieces stays, so nothing counted is out of sight. */
export function visibleDenoms(currency: CurrencyCode, setup: RowSetup, pieces: Record<string, number> = {}): Denomination[] {
  return CURRENCIES[currency].denominations.filter((d) => isShown(d, setup) || (pieces[d.id] ?? 0) > 0);
}

export function setShown(setup: RowSetup, d: Denomination, shown: boolean): RowSetup {
  const overrides = { ...setup.overrides };
  if (shown === d.shown) delete overrides[d.id];
  else overrides[d.id] = shown;
  return { ...setup, overrides };
}

export function addCustomRow(setup: RowSetup, id: string, label: string): RowSetup {
  const clean = label.trim().slice(0, 40);
  if (!clean || setup.custom.length >= MAX_CUSTOM) return setup;
  return { ...setup, custom: [...setup.custom, { id, label: clean }] };
}

export function removeCustomRow(setup: RowSetup, id: string): RowSetup {
  return { ...setup, custom: setup.custom.filter((c) => c.id !== id) };
}

export function parseRowSetup(currency: CurrencyCode, json: string | null): RowSetup {
  try {
    const v = JSON.parse(json ?? 'null');
    if (!v || typeof v !== 'object') return { overrides: {}, custom: [] };
    const ids = new Set(CURRENCIES[currency].denominations.map((d) => d.id));
    const overrides: Record<string, boolean> = {};
    if (v.overrides && typeof v.overrides === 'object') for (const [k, b] of Object.entries(v.overrides)) if (ids.has(k) && typeof b === 'boolean') overrides[k] = b;
    const custom: CustomRowDef[] = Array.isArray(v.custom)
      ? v.custom.filter((c: any) => c && typeof c.id === 'string' && typeof c.label === 'string' && c.label.trim()).slice(0, MAX_CUSTOM).map((c: any) => ({ id: c.id, label: c.label.trim().slice(0, 40) }))
      : [];
    return { overrides, custom };
  } catch {
    return { overrides: {}, custom: [] };
  }
}
