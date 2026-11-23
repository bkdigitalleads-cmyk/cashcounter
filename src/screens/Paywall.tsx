import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useTheme, radius, space, tabular, type, Theme } from '../theme';
import { useApp } from '../state';
import type { PaywallReason } from '../gates';
import { getOffering, purchasePackage, restorePurchases, isBillingAvailable } from '../purchases';
import { getTrialEligibleIds, trialLabel } from '../trial';
import { cancelTrialReminder, scheduleTrialReminderIfTrial } from '../reminder';
import { disclosureText, planOrder, planTitle, planTypeOf, preselect, PlanType } from '../offer';
import { TERMS_URL } from '../links';
import Glyph from '../ui/Glyph';
import { MainButton, Press, RoundButton } from '../ui/Kit';
import { MODAL_ANIMATION } from '../ui/motion';

/** On the first-launch paywall the close button appears after this delay. */
const ONBOARDING_CLOSE_DELAY_MS = 3000;

/** The headline and one line, by why the paywall opened. */
const REASON: Record<PaywallReason, { title: string; line: string }> = {
  save: { title: 'Keep every count.', line: 'Save as many counts as you like and see them all in History, by day and by till.' },
  sheet: { title: 'A count sheet for every close.', line: 'Share, print or save a signed count sheet for every count, and export History as CSV.' },
  csv: { title: 'Your whole history in a spreadsheet.', line: 'Export every saved count as CSV, any time, and a count sheet for every close.' },
  till: { title: 'Count more than one till.', line: 'Keep the front register, the bar and the safe apart, each with its own float and History.' },
  deposit: { title: 'Know what to bank.', line: 'Pick the float to leave and see which notes and coins go in the deposit.' },
  rows: { title: 'Count checks and vouchers too.', line: 'Add your own rows, like checks or gift vouchers, entered as an amount.' },
  currency: { title: 'Count in any of six currencies.', line: 'Dollars, euros, pounds and pesos, with a currency for each till.' },
  pro: { title: 'Cash Counter Pro.', line: 'Every saved count, more tills, count sheets and CSV, the deposit helper, your own rows and every currency.' },
};

/**
 * Two paywalls in one component (the engine's, from Estimate Maker,
 * Signature Maker 1.0.2 and Odo 1.0.6), with three rows: cash_pro_weekly
 * ($rc_weekly, 3-day free trial), cash_pro_yearly ($rc_annual) and
 * cash_pro_lifetime ($rc_lifetime, one-time).
 *  - onboarding: after the three intro screens, "What are you counting?"
 *    and the trial and reminder screens. Trial wording only when this
 *    Apple ID can get the trial; the close button appears after 3 seconds.
 *  - in-app (the fourth save, the second count sheet, a second till, the
 *    deposit helper, custom rows, another currency, or Settings): no trial
 *    advertised in the headline.
 * Weekly is listed first and preselected on both. Prices and trial lengths
 * always come from StoreKit. Restore on both.
 */
export default function PaywallModal({ privacyUrl, onboarding = false, hero }: { privacyUrl: string; onboarding?: boolean; hero?: React.ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const { paywall, hidePaywall, setIsPro } = useApp();
  const visible = paywall != null;
  const reason: PaywallReason = onboarding ? 'pro' : paywall ?? 'pro';
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [trialEligible, setTrialEligible] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [canClose, setCanClose] = useState(!onboarding);

  useEffect(() => {
    if (!visible || !onboarding) return;
    setCanClose(false);
    const t = setTimeout(() => setCanClose(true), ONBOARDING_CLOSE_DELAY_MS);
    return () => clearTimeout(t);
  }, [visible, onboarding]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    (async () => {
      const off = await getOffering();
      setOffering(off);
      setTrialEligible(await getTrialEligibleIds(off?.availablePackages ?? []));
      const pkgs = (off?.availablePackages ?? []).filter((p) => planTypeOf(p.packageType) != null);
      const pick = preselect(pkgs.map((p) => p.packageType), onboarding);
      setSelected(pkgs.find((p) => p.packageType === pick) ?? null);
      setLoading(false);
    })();
  }, [visible, onboarding]);

  const close = () => {
    if (canClose) hidePaywall();
  };

  const buy = async () => {
    if (!selected) return;
    setPurchasing(true);
    const res = await purchasePackage(selected);
    setPurchasing(false);
    if (res.ok && res.isPro) {
      setIsPro(true);
      hidePaywall();
      const reminded = await scheduleTrialReminderIfTrial();
      // On the onboarding paywall the app opening with Pro on says the rest. (The only rating ask is after a later-day save.)
      if (!onboarding) {
        Alert.alert('Pro is on', `Every count, till and count sheet is yours.${reminded ? ' You will get a reminder the day before the trial ends.' : ''}`);
      }
    } else if (res.ok) {
      Alert.alert('Paid, but Pro is not showing', 'The App Store can lag a minute. Tap Restore purchases in a moment and it turns on.');
    } else if (!res.userCancelled && res.error) {
      Alert.alert('The purchase did not go through', res.error);
    }
  };

  const onRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    const res = await restorePurchases();
    setRestoring(false);
    if (res.ok) cancelTrialReminder();
    if (res.ok && res.isPro) {
      setIsPro(true);
      hidePaywall();
      Alert.alert('Pro is back on', 'Every count, till and count sheet is open again.');
    } else if (res.ok) {
      Alert.alert('Nothing to restore', 'This Apple ID has no Cash Counter Pro purchase.');
    } else {
      Alert.alert('Restore did not work', res.error ?? 'Try once more.');
    }
  };

  const order = planOrder(onboarding);
  const packages = [...(offering?.availablePackages ?? [])]
    .filter((p) => planTypeOf(p.packageType) != null)
    .sort((a, b) => order.indexOf(a.packageType as PlanType) - order.indexOf(b.packageType as PlanType));
  const weeklyPkg = packages.find((p) => p.packageType === 'WEEKLY');
  const yearlyPkg = packages.find((p) => p.packageType === 'ANNUAL');
  const lifetimePkg = packages.find((p) => p.packageType === 'LIFETIME');
  const weeklyTrial = trialLabel(weeklyPkg, trialEligible);
  const shownTrial = onboarding ? weeklyTrial : null;

  const money = (n: number, cur?: string) => n.toLocaleString(undefined, { style: 'currency', currency: cur ?? 'USD' });
  const yearlyPerWeek = yearlyPkg?.product.price ? `${money(yearlyPkg.product.price / 52, yearlyPkg.product.currencyCode)} a week` : null;

  const disclosure = disclosureText({ weekly: weeklyPkg?.product.priceString, yearly: yearlyPkg?.product.priceString, lifetime: lifetimePkg?.product.priceString, trial: weeklyTrial });

  const copy = REASON[reason];
  const headline = shownTrial ? `${copy.title} ${shownTrial[0].toUpperCase()}${shownTrial.slice(1)} first.` : copy.title;

  return (
    <Modal visible={visible} animationType={MODAL_ANIMATION} presentationStyle="fullScreen" onRequestClose={close}>
      <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Holds its space while hidden so nothing jumps when the close button appears. */}
          <View style={[styles.closeRow, { opacity: canClose ? 1 : 0 }]} accessibilityElementsHidden={!canClose} importantForAccessibility={canClose ? 'auto' : 'no-hide-descendants'}>
            <RoundButton theme={theme} glyph="close" label="Close" onPress={close} disabled={!canClose} color={theme.inkSoft} />
          </View>

          {hero ? <View style={styles.pad}>{hero}</View> : null}
          <Text style={[type.title, styles.pad, compact ? { marginTop: space.m } : { marginTop: space.l }, { color: theme.ink }]} accessibilityRole="header">
            {headline}
          </Text>
          <Text style={[type.body, styles.pad, styles.line, { color: theme.inkSoft }]}>{copy.line}</Text>
          <Text style={[type.body, styles.pad, styles.line, { color: theme.inkSoft }]}>Counting stays free, and every count you saved stays on your iPhone.</Text>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: space.xl }} color={theme.inkSoft} />
          ) : packages.length === 0 || !isBillingAvailable() ? (
            <Text style={[type.body, styles.unavailable, { color: theme.inkSoft }]}>The App Store did not answer. Try again in a minute.</Text>
          ) : (
            <View style={[styles.plans, compact && { marginTop: space.l }, { backgroundColor: theme.surface, borderColor: theme.edge }]} accessibilityRole="radiogroup">
              {packages.map((p, i) => {
                const t = p.packageType as PlanType;
                const on = selected?.identifier === p.identifier;
                const title = planTitle(t);
                const line =
                  t === 'ANNUAL'
                    ? `${p.product.priceString} a year${yearlyPerWeek ? `, ${yearlyPerWeek}` : ''}`
                    : t === 'LIFETIME'
                      ? `${p.product.priceString} once, yours to keep`
                      : weeklyTrial
                        ? `${weeklyTrial}, then ${p.product.priceString} a week`
                        : `${p.product.priceString} a week`;
                return (
                  <Press
                    key={p.identifier}
                    onPress={() => setSelected(p)}
                    style={[styles.plan, compact && styles.planCompact, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }, on && { backgroundColor: theme.raised }]}
                    pressedStyle={{ backgroundColor: theme.raised }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${title}, ${line}`}
                  >
                    <Radio theme={theme} on={on} />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.strong, { color: theme.ink }]}>{title}</Text>
                      <Text style={[type.small, { color: theme.inkSoft }]}>{line}</Text>
                    </View>
                    <Text style={[type.strong, { color: theme.ink }, tabular]}>{p.product.priceString}</Text>
                  </Press>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottom, { borderTopColor: theme.edge, paddingBottom: Math.max(insets.bottom, space.m) }]}>
          {/* The button says Continue, never Subscribe. */}
          <MainButton theme={theme} label={purchasing ? 'One moment' : 'Continue'} onPress={buy} disabled={purchasing || !selected || loading} />
          {selected && trialLabel(selected, trialEligible) ? (
            <View style={styles.checkLine}>
              <Glyph name="check" size={18} color={theme.ink} weight={2.2} />
              <Text style={[type.strong, { color: theme.ink }]}>No payment now</Text>
            </View>
          ) : null}
          {/*
            App Review guideline 3.1.2(c): title, length, price and functional
            Terms of Use (EULA) + Privacy Policy links live in the app itself,
            visible without scrolling and rendered even with no products.
          */}
          <Text style={[styles.legalText, { color: theme.inkFaint }]}>Cash Counter Pro. {disclosure}</Text>
          <View style={styles.legalLinks}>
            <Text style={[styles.legalLink, { color: theme.inkSoft }]} onPress={onRestore} accessibilityRole="button">
              {restoring ? 'Restoring' : 'Restore purchases'}
            </Text>
            <Text style={[styles.legalLink, { color: theme.inkSoft }]} onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">
              Terms of Use (EULA)
            </Text>
            <Text style={[styles.legalLink, { color: theme.inkSoft }]} onPress={() => Linking.openURL(privacyUrl)} accessibilityRole="link">
              Privacy Policy
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Radio({ theme, on }: { theme: Theme; on: boolean }) {
  return (
    <View style={[styles.radio, { borderColor: on ? theme.ink : theme.inkFaint }]}>
      {on && <View style={[styles.radioDot, { backgroundColor: theme.ink }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: space.xl },
  closeRow: { alignItems: 'flex-end', paddingHorizontal: space.s, paddingTop: space.xs },
  pad: { paddingHorizontal: space.xl },
  line: { marginTop: space.s },
  plans: { marginTop: space.xl, marginHorizontal: space.l, borderRadius: radius.large, borderWidth: 1, overflow: 'hidden' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 64, paddingHorizontal: space.l, paddingVertical: space.m },
  planCompact: { minHeight: 60, paddingVertical: space.s },
  radio: { width: 24, height: 24, borderRadius: radius.round, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: radius.round },
  unavailable: { textAlign: 'center', marginVertical: space.xl, paddingHorizontal: space.xl },
  bottom: { borderTopWidth: 1, paddingHorizontal: space.l, paddingTop: space.m, gap: space.s },
  checkLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
  legalText: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.m },
  legalLink: { fontSize: 12, fontWeight: '600', textDecorationLine: 'underline', paddingVertical: space.xs },
});
