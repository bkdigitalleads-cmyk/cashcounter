import * as StoreReview from 'expo-store-review';
import { kvGet, kvSet } from './store';
import { ReviewTrigger, shouldAsk } from './rules';

export type { ReviewTrigger } from './rules';

/**
 * The App Store rating ask, at a moment the person just got something: a
 * count saved on a later day than install (rules.ts). At most one prompt
 * per launch, once ever, never in the middle of a count, and StoreKit
 * still decides whether the prompt is shown (it caps it at 3 a year). The
 * decisions are pure functions in rules.ts, checked by `npm test`.
 * Same engine as Estimate Maker, Signature Maker and Odo 1.0.6.
 */
const triggerKey = (t: ReviewTrigger) => `review.${t}`;

let launchState: 'idle' | 'checking' | 'asked' = 'idle';
let counting: () => boolean = () => false;

/** state.tsx tells this module whether a count is in progress on the count screen. */
export function setReviewGuard(isCounting: () => boolean): void {
  counting = isCounting;
}

export async function maybeRequestReview(trigger: ReviewTrigger): Promise<void> {
  if (launchState !== 'idle' || counting()) return;
  launchState = 'checking';
  try {
    const used = (await kvGet(triggerKey(trigger))) != null;
    const storeCanAsk = await StoreReview.hasAction();
    if (!shouldAsk({ counting: counting(), askedThisLaunch: false, triggerUsed: used, storeCanAsk })) return;
    await kvSet(triggerKey(trigger), '1');
    launchState = 'asked';
    setTimeout(() => {
      // One last look: a count started in the meantime wins.
      if (!counting()) StoreReview.requestReview().catch(() => {});
    }, 1200);
  } catch {
    // never let review plumbing get in the way
  } finally {
    if (launchState === 'checking') launchState = 'idle';
  }
}
