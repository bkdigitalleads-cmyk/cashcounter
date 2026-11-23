/**
 * What is free and what is Pro, as pure functions checked by `npm test`.
 *
 * Free forever: counting with no limit, one till, the last three saved
 * counts in History, the first count sheet and the first CSV export, and
 * one currency (set from the phone's region, and changeable until the
 * first count is saved).
 *
 * Pro: every saved count in History, more tills, every count sheet and CSV
 * export, the deposit helper, custom rows, and any currency for any till.
 *
 * Nobody loses what they made: a count is always saved, even past three on
 * the free plan (older ones stay on the phone, out of sight, and come back
 * with Pro); a count sheet that went out free can go out again; tills and
 * custom rows made while Pro keep working when Pro ends.
 */

/** Saved counts shown in History on the free plan. */
export const FREE_HISTORY = 3;
/** Count sheets that go out free (by count). */
export const FREE_SHEETS = 1;
/** CSV exports that go out free. */
export const FREE_CSV = 1;
/** Tills on the free plan. */
export const FREE_TILLS = 1;

/** Why the in-app paywall opened. */
export type PaywallReason = 'save' | 'sheet' | 'csv' | 'till' | 'deposit' | 'rows' | 'currency' | 'pro';

/**
 * Saving a count: always saved. On the free plan the paywall opens first
 * once three counts are already saved (the fourth save and every one
 * after). Editing a count that is already saved never asks.
 */
export function saveAsksPro(isPro: boolean, savedCount: number, editing: boolean): boolean {
  return !isPro && !editing && savedCount >= FREE_HISTORY;
}

/** How many saved counts History shows (null: all of them). */
export function historyLimit(isPro: boolean): number | null {
  return isPro ? null : FREE_HISTORY;
}

/** The saved counts History shows, newest first, and how many older ones are kept out of sight. */
export function visibleHistory<T extends { createdAt: number }>(isPro: boolean, counts: T[]): { shown: T[]; hidden: number } {
  const sorted = [...counts].sort((a, b) => b.createdAt - a.createdAt);
  const limit = historyLimit(isPro);
  if (limit == null) return { shown: sorted, hidden: 0 };
  return { shown: sorted.slice(0, limit), hidden: Math.max(0, sorted.length - limit) };
}

export interface ExportDecision {
  allowed: boolean;
  /** Going out now uses the free one. */
  usesFree: boolean;
}

/** A count sheet for this count: free for the first count, free again for that same count, Pro after. */
export function sheetDecision(isPro: boolean, freeSheets: string[], countId: string): ExportDecision {
  if (isPro) return { allowed: true, usesFree: false };
  if (freeSheets.includes(countId)) return { allowed: true, usesFree: false };
  if (freeSheets.length < FREE_SHEETS) return { allowed: true, usesFree: true };
  return { allowed: false, usesFree: false };
}

/** A CSV of History: the first export is free. */
export function csvDecision(isPro: boolean, csvUsed: number): ExportDecision {
  if (isPro) return { allowed: true, usesFree: false };
  if (csvUsed < FREE_CSV) return { allowed: true, usesFree: true };
  return { allowed: false, usesFree: false };
}

/** Adding a till: the first is free, a second needs Pro. */
export function canAddTill(isPro: boolean, tills: number): boolean {
  return isPro || tills < FREE_TILLS;
}

/** The deposit helper is Pro. */
export function canUseDeposit(isPro: boolean): boolean {
  return isPro;
}

/** Adding a custom row is Pro. Rows already made stay. */
export function canAddCustomRow(isPro: boolean): boolean {
  return isPro;
}

/**
 * Changing a currency. Free: the one currency can be changed until the
 * first count is saved (a phone set to the wrong region is not stuck);
 * after that a different currency is Pro.
 */
export function canChangeCurrency(isPro: boolean, savedCount: number): boolean {
  return isPro || savedCount === 0;
}

/** Records something that went out free once (the same count twice counts once). */
export function recordFree(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

/** A stored list, cleaned: strings only, no repeats. Bad data counts as none used. */
export function parseIdList(json: string | null): string[] {
  try {
    const v = JSON.parse(json ?? '[]');
    if (!Array.isArray(v)) return [];
    return [...new Set(v.filter((x) => typeof x === 'string' && x.length > 0))];
  } catch {
    return [];
  }
}

/** Counting never waits on Pro. */
export function canCount(_isPro: boolean): true {
  return true;
}
