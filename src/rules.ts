/**
 * Small behavior rules as pure functions checked by `npm test`: when a
 * rating prompt may ask, what the onboarding question sets, and the local
 * day key.
 */

/**
 * When the app asks for an App Store rating (SKStoreReviewController,
 * through expo-store-review): once a count is saved on a later day than
 * the app was installed, so the person has used it for at least two
 * closes. Never in the middle of a count, at most once per launch, once
 * ever, and StoreKit still decides whether it shows.
 */
export type ReviewTrigger = 'laterDaySave';

/** The guard for one ask: never mid-count, at most one per launch, each trigger once ever. */
export function reviewAllowed(opts: { counting: boolean; askedThisLaunch: boolean; triggerUsed: boolean }): boolean {
  return !opts.counting && !opts.askedThisLaunch && !opts.triggerUsed;
}

/** The whole decision for one ask: the guard above, and StoreKit able to show one at all. */
export function shouldAsk(opts: { counting: boolean; askedThisLaunch: boolean; triggerUsed: boolean; storeCanAsk: boolean }): boolean {
  return reviewAllowed(opts) && opts.storeCanAsk;
}

/** A save that earns the rating ask: its calendar day is after the install day. Days are "YYYY-MM-DD". */
export function savedOnLaterDay(installDay: string | null, savedDay: string): boolean {
  return installDay != null && /^\d{4}-\d{2}-\d{2}$/.test(installDay) && savedDay > installDay;
}

/**
 * When the onboarding paywall closes: with Pro, straight into the app;
 * with the X, the small "Counting is free" sheet first.
 */
export function afterOnboardingPaywall(isPro: boolean): 'app' | 'claim' {
  return isPro ? 'app' : 'claim';
}

/** "What are you counting?" on the last onboarding screen. It only names the first till. */
export type CountingFor = 'shop' | 'tips' | 'collection' | 'savings';

export const COUNTING_FOR: { id: CountingFor; label: string; till: string }[] = [
  { id: 'shop', label: 'A shop till', till: 'Front register' },
  { id: 'tips', label: 'Tips', till: 'Tip jar' },
  { id: 'collection', label: 'A collection', till: 'Collection' },
  { id: 'savings', label: 'Savings at home', till: 'Savings' },
];

export function tillNameFor(choice: CountingFor | null): string {
  return COUNTING_FOR.find((c) => c.id === choice)?.till ?? 'Till';
}

/** The local calendar day, "2026-11-22". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
