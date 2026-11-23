/**
 * Money, dates and times in the phone's own format (expo-localization
 * gives the locale; Intl does the rest). Pure, checked by `npm test`.
 * Formatting divides by 100 only to print; no total is ever added up here.
 */
import { dayMs } from './dates.ts';

const nf = new Map<string, Intl.NumberFormat>();

function moneyFormat(currency: string, locale: string, whole: boolean): Intl.NumberFormat {
  const key = `${locale}|${currency}|${whole}`;
  let f = nf.get(key);
  if (!f) {
    const opts: Intl.NumberFormatOptions = { style: 'currency', currency, ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}) };
    try {
      f = new Intl.NumberFormat(locale, opts);
    } catch {
      f = new Intl.NumberFormat('en-US', { ...opts, currency: 'USD' });
    }
    nf.set(key, f);
  }
  return f;
}

/** Minor units as money: 125050 USD in en-US is "$1,250.50"; in de-DE, "1.250,50 $". */
export function formatMoney(minor: number, currency: string, locale: string): string {
  const v = Number.isFinite(minor) ? minor : 0;
  return moneyFormat(currency, locale, false).format(v / 100);
}

/** With a sign for a difference: "+$2.00", "-$4.50", "$0.00". */
export function formatSigned(minor: number, currency: string, locale: string): string {
  const s = formatMoney(Math.abs(minor), currency, locale);
  return minor > 0 ? `+${s}` : minor < 0 ? `-${s}` : s;
}

/** Minor units as a plain number for an input field ("1250.50" or "1250,50"), no symbol or grouping. */
export function moneyInput(minor: number, locale: string): string {
  if (!minor) return '';
  const whole = Math.floor(minor / 100);
  const frac = String(minor % 100).padStart(2, '0');
  return `${whole}${decimalMark(locale)}${frac}`;
}

/** The locale's decimal mark, "." or ",". */
export function decimalMark(locale: string): string {
  try {
    const part = new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === 'decimal');
    return part?.value === ',' ? ',' : '.';
  } catch {
    return '.';
  }
}

/** A count of pieces with grouping: "1,250". */
export function formatQty(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
  } catch {
    return String(n);
  }
}

/** "Nov 22, 2026" in en-US, "22 Nov 2026" in en-GB. */
export function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dayMs(iso)));
  } catch {
    return iso;
  }
}

/** "Saturday, Nov 22" for a History heading. */
export function formatDayHeading(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(dayMs(iso)));
  } catch {
    return iso;
  }
}

/** "9:41 PM". */
export function formatTime(ms: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
  } catch {
    return '';
  }
}
