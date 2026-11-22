/**
 * The deposit helper: from a count and the float to leave in the till,
 * which notes and coins to bank. Pure, checked by `npm test`.
 *
 * Rules:
 *  - It never leaves or banks more of a note or coin than was counted.
 *  - It leaves exactly the float whenever some mix of what was counted
 *    makes it. Among the mixes that do, it banks the largest notes first
 *    (a float is change: small notes and coins).
 *  - When no mix makes the float exactly, it leaves the smallest amount
 *    above it that one does, and says so.
 *  - When the cash counted is less than the float, everything stays and
 *    nothing is banked.
 * Custom rows (checks, vouchers) are not cash and are left out.
 */
import type { CurrencyCode } from './currencies.ts';
import { CURRENCIES } from './currencies.ts';
import { cleanAmount, cleanQty } from './money.ts';

export interface DepositLine {
  id: string;
  value: number;
  counted: number;
  leave: number;
  bank: number;
}

export interface DepositPlan {
  lines: DepositLine[];
  float: number;
  /** What stays in the till. */
  left: number;
  /** What goes to the bank. */
  deposit: number;
  cash: number;
  /** 'exact': leaves the float. 'above': leaves more, no mix makes it. 'short': less cash than the float. */
  fit: 'exact' | 'above' | 'short';
}

/** Above this many steps the search falls back to banking largest first (never reached by a real till). */
const MAX_STATES = 3_000_000;

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

/** reach[i][s]: amount s (in units of g) can be made from denominations i.. (smaller ones), within the counts. */
function reachTables(values: number[], counts: number[], limit: number): Uint8Array[] {
  const n = values.length;
  const tables: Uint8Array[] = new Array(n + 1);
  let cur = new Uint8Array(limit + 1);
  cur[0] = 1;
  tables[n] = cur;
  for (let i = n - 1; i >= 0; i--) {
    const next = cur.slice();
    // Bounded: split the count into powers of two so each piece is used at most `counts[i]` times.
    let left = counts[i];
    let k = 1;
    while (left > 0) {
      const take = Math.min(k, left);
      const w = take * values[i];
      if (w <= limit) for (let s = limit; s >= w; s--) if (next[s - w]) next[s] = 1;
      left -= take;
      k *= 2;
    }
    tables[i] = next;
    cur = next;
  }
  return tables;
}

export function suggestDeposit(currency: CurrencyCode, pieces: Record<string, number>, float: number): DepositPlan {
  const denoms = CURRENCIES[currency].denominations; // largest first
  const counted = denoms.map((d) => cleanQty(pieces[d.id]));
  const cash = denoms.reduce((a, d, i) => a + d.value * counted[i], 0);
  const target = cleanAmount(float);
  const build = (leave: number[], fit: DepositPlan['fit']): DepositPlan => {
    const lines = denoms.map((d, i) => ({ id: d.id, value: d.value, counted: counted[i], leave: leave[i], bank: counted[i] - leave[i] })).filter((l) => l.counted > 0);
    const left = lines.reduce((a, l) => a + l.leave * l.value, 0);
    return { lines, float: target, left, deposit: cash - left, cash, fit };
  };

  if (target >= cash) return build(counted.slice(), target === cash ? 'exact' : 'short');
  if (target === 0) return build(counted.map(() => 0), 'exact');

  const used = denoms.map((d, i) => ({ v: d.value, c: counted[i] }));
  const g = used.filter((u) => u.c > 0).reduce((a, u) => gcd(a, u.v), 0) || 1;
  const values = used.map((u) => u.v / g);
  const totalUnits = cash / g;
  // The smallest amount at or above the float that a mix can make is found within cash.
  const limit = totalUnits;

  if (limit * denoms.length > MAX_STATES) {
    // Bank largest first while what stays is still at least the float.
    let left = cash;
    const leave = counted.slice();
    for (let i = 0; i < denoms.length; i++) {
      const bank = Math.min(leave[i], Math.floor((left - target) / denoms[i].value));
      leave[i] -= bank;
      left -= bank * denoms[i].value;
    }
    return build(leave, left === target ? 'exact' : 'above');
  }

  const reach = reachTables(values, counted, limit);
  // Exactly the float, or the nearest amount above it that can be made.
  let goal = -1;
  const start = Math.ceil(target / g);
  for (let s = start; s <= limit; s++) {
    if (reach[0][s]) {
      goal = s;
      break;
    }
  }
  // goal always exists: leaving everything (limit) can be made.
  const leave: number[] = new Array(denoms.length).fill(0);
  let rest = goal;
  for (let i = 0; i < denoms.length; i++) {
    // Leave as few of the larger pieces as still lets the smaller ones make up the rest.
    for (let q = 0; q <= counted[i]; q++) {
      const after = rest - q * values[i];
      if (after < 0) break;
      if (reach[i + 1][after]) {
        leave[i] = q;
        rest = after;
        break;
      }
    }
  }
  return build(leave, goal * g === target ? 'exact' : 'above');
}
