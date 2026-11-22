import * as Haptics from 'expo-haptics';

/**
 * Quiet motion: sheets and modals fade (no slides or bounces), and
 * feedback comes by touch, so a count can be felt as much as seen.
 */
export const MODAL_ANIMATION = 'fade' as const;

/** A count saved, a sheet out: a soft confirmation. */
export const savedHaptic = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
/** Picking an option. */
export const tick = () => Haptics.selectionAsync().catch(() => {});
/** Plus and minus on a row, and each keypad digit. */
export const stepHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
/** A roll or strap added. */
export const packHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
