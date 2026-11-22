import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, radius, space, Theme, type } from '../theme';
import { getOffering } from '../purchases';
import { getTrialEligibleIds, trialLabel } from '../trial';
import { requestReminderPermission } from '../reminder';
import { trialLength } from '../offer';
import { COUNTING_FOR, CountingFor } from '../rules';
import { useData } from '../data';
import { CURRENCIES } from '../currencies';
import { formatMoney, formatQty } from '../format';
import { isoDay } from '../dates';
import { sampleCount } from '../sample';
import { sheetKit, sheetPage, SheetKit } from '../sheetAssets';
import Glyph from '../ui/Glyph';
import { CashTile, DiffLine, SheetView } from '../ui/Cash';
import { MainButton, Press, Slot, Tray } from '../ui/Kit';

/**
 * First launch, in this order (App.tsx runs it):
 *   1-3. three short screens: count a till in under a minute; see at once
 *        if it is over or short; keep a record you can print
 *   4.   "What are you counting?", which only names the first till
 *   a.   TrialSteps "Try it free"                      } only when RevenueCat says this
 *   b.   TrialSteps "We'll remind you the day before"  } Apple ID can get the free trial
 *   then the onboarding paywall (close button after 3 seconds).
 * No name or email is asked, and no camera, location, contacts or photos.
 */
const PAGES: { title: string; line: string; show: 'count' | 'diff' | 'sheet' }[] = [
  { title: 'Count a till in under a minute.', line: 'Big buttons for one thumb. Tap a number to type it, hold a row to add a roll.', show: 'count' },
  { title: 'See at once if it is over or short.', line: 'Enter what the till should hold, or the float plus sales.', show: 'diff' },
  { title: 'Keep a record you can print.', line: 'Every count saved by day, with a one-page count sheet to sign.', show: 'sheet' },
];

interface TrialOffer {
  length: string;
  then: string;
}

let offerPromise: Promise<TrialOffer | null> | null = null;

async function loadTrialOffer(): Promise<TrialOffer | null> {
  const off = await getOffering();
  const pkg = off?.weekly;
  if (!pkg) return null;
  if (!trialLabel(pkg, await getTrialEligibleIds([pkg]))) return null;
  const length = trialLength(pkg.product.introPrice);
  if (!length) return null;
  return { length, then: `${pkg.product.priceString} a week` };
}

/** Starts the eligibility check early; it is ready long before the trial screen. */
function trialOffer(): Promise<TrialOffer | null> {
  if (!offerPromise) offerPromise = loadTrialOffer().catch(() => null);
  return offerPromise;
}

export default function Welcome({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  useEffect(() => {
    trialOffer();
  }, []);
  const { width } = useWindowDimensions();
  const next = () => (step < PAGES.length - 1 ? setStep(step + 1) : onDone());
  const p = PAGES[step];
  const w = width - space.l * 2;
  const visual = p.show === 'count' ? <CountShow theme={theme} /> : p.show === 'diff' ? <DiffShow theme={theme} /> : <SheetShow width={w} />;
  return <Page key={step} theme={theme} title={p.title} line={p.line} visual={visual} dots={{ count: PAGES.length + 1, active: step }} button="Continue" onPress={next} />;
}

function useSample() {
  const data = useData();
  return useMemo(() => sampleCount(data.till.currency, isoDay(Date.now()), Date.now()), [data.till.currency]);
}

/** Three rows of the count, as they look on the count screen. */
function CountShow({ theme }: { theme: Theme }) {
  const data = useData();
  const s = useSample();
  const locale = data.locale.tag;
  const dens = CURRENCIES[s.currency].denominations.filter((d) => d.shown);
  const pick = [dens[2], dens[4], dens[dens.length - 4]].filter(Boolean);
  const money = (m: number) => formatMoney(m, s.currency, locale);
  return (
    <View style={{ alignSelf: 'stretch', gap: space.s }} accessible accessibilityLabel="Rows of notes and coins with a minus and plus button and the number counted">
      {pick.map((d) => (
        <View key={d.id} style={[styles.showRow, { backgroundColor: theme.tile, borderColor: theme.edge }]}>
          <CashTile theme={theme} d={d} />
          <View style={{ flex: 1 }}>
            <Text style={[type.small, { color: theme.inkSoft }]}>{d.name}</Text>
            <Text style={[type.figure, { color: theme.ink, fontSize: 18 }]}>{money((s.pieces[d.id] ?? 0) * d.value)}</Text>
          </View>
          <View style={[styles.showStep, { backgroundColor: theme.surface, borderColor: theme.edge }]}>
            <Glyph name="minus" size={24} color={theme.ink} weight={2.6} />
          </View>
          <View style={[styles.showQty, { borderColor: theme.ink }]}>
            <Text style={[type.figure, { color: theme.ink, fontSize: 24 }]}>{formatQty(s.pieces[d.id] ?? 0, locale)}</Text>
          </View>
          <View style={[styles.showStep, { backgroundColor: theme.surface, borderColor: theme.edge }]}>
            <Glyph name="plus" size={24} color={theme.ink} weight={2.6} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** The total with its difference, as the bottom of the count screen shows it. */
function DiffShow({ theme }: { theme: Theme }) {
  const data = useData();
  const s = useSample();
  const money = (m: number) => formatMoney(m, s.currency, data.locale.tag);
  return (
    <View style={[styles.diffCard, { backgroundColor: theme.tile, borderColor: theme.edge }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[type.label, { color: theme.inkSoft }]}>Total</Text>
        <Text style={[type.small, { color: theme.inkSoft, fontWeight: '600' }]}>Expected {money(s.total - (s.diff ?? 0))}</Text>
      </View>
      <Text style={[type.total, { color: theme.ink }]}>{money(s.total)}</Text>
      <DiffLine theme={theme} diff={s.diff ?? 0} money={money} />
    </View>
  );
}

/** The top of a sample count sheet. */
function SheetShow({ width }: { width: number }) {
  const data = useData();
  const s = useSample();
  const [kit, setKit] = useState<SheetKit | null>(null);
  useEffect(() => {
    sheetKit().then(setKit, () => {});
  }, []);
  const page = useMemo(() => (kit ? sheetPage(kit, s, data.paper, data.locale.tag) : null), [kit, s, data.paper, data.locale.tag]);
  const h = Math.round(width * 1.02);
  return (
    <View style={[styles.sheetCrop, { width, height: h }]}>
      {page ? <SheetView page={page} width={width} label="A sample count sheet with the notes, coins, total and difference" /> : <ActivityIndicator color="#4E545C" style={{ marginTop: space.xxl }} />}
    </View>
  );
}

/** "What are you counting?" It only sets the first till's name. */
export function WhatCounting({ onDone }: { onDone: (choice: CountingFor | null) => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [pick, setPick] = useState<CountingFor | null>(null);
  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, space.l) }]}>
      <View style={styles.listPage}>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          What are you counting?
        </Text>
        <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>This names your first till. You can add more later.</Text>
        <Tray theme={theme} style={{ marginTop: space.xl }}>
          {COUNTING_FOR.map((c, i) => (
            <Press
              key={c.id}
              onPress={() => setPick(c.id)}
              style={[styles.need, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }, pick === c.id && { backgroundColor: theme.raised }]}
              pressedStyle={{ backgroundColor: theme.raised }}
              accessibilityRole="radio"
              accessibilityState={{ selected: pick === c.id }}
              accessibilityLabel={c.label}
            >
              <View style={[styles.radio, { borderColor: pick === c.id ? theme.ink : theme.inkFaint }]}>{pick === c.id ? <View style={[styles.radioDot, { backgroundColor: theme.ink }]} /> : null}</View>
              <View style={{ flex: 1 }}>
                <Text style={[type.strong, { color: theme.ink }]}>{c.label}</Text>
                <Text style={[type.small, { color: theme.inkSoft }]}>Till name: {c.till}</Text>
              </View>
            </Press>
          ))}
        </Tray>
      </View>
      <View style={styles.dots} accessible accessibilityLabel={`Page ${PAGES.length + 1} of ${PAGES.length + 1}`}>
        {Array.from({ length: PAGES.length + 1 }, (_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i === PAGES.length ? theme.ink : theme.rule }, i === PAGES.length && styles.dotOn]} />
        ))}
      </View>
      <View style={styles.footer}>
        <MainButton theme={theme} label="Continue" onPress={() => onDone(pick)} disabled={!pick} />
        <Press onPress={() => onDone(null)} accessibilityRole="button" style={styles.skip}>
          <Text style={[type.body, { color: theme.inkSoft, textAlign: 'center' }]}>Skip</Text>
        </Press>
      </View>
    </View>
  );
}

/** The trial and reminder screens. Calls onDone right away when no trial is on offer. */
export function TrialSteps({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [offer, setOffer] = useState<TrialOffer | null | undefined>(undefined);
  const [step, setStep] = useState<'trial' | 'remind'>('trial');
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let live = true;
    trialOffer().then((o) => {
      if (!live) return;
      if (o) setOffer(o);
      else onDone();
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!offer) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.inkSoft} />
      </View>
    );
  }

  if (step === 'trial') {
    return (
      <Page
        theme={theme}
        title={`Try Pro free for ${offer.length}.`}
        line={`Then ${offer.then}. Cancel in Settings any time before it ends.`}
        button="Try it free"
        onPress={() => setStep('remind')}
        noPayment
        visual={
          <Tray theme={theme} style={{ alignSelf: 'stretch' }}>
            <Slot theme={theme} first glyph="check" label="Today" sub="Every saved count, more tills, count sheets and the deposit helper." />
            <Slot theme={theme} glyph="date" label="The day before it ends" sub="One reminder, so nothing surprises you." />
            <Slot theme={theme} glyph="star" label={`After ${offer.length}`} sub={`${offer.then[0].toUpperCase()}${offer.then.slice(1)}. Cancel before then and pay nothing.`} />
          </Tray>
        }
      />
    );
  }

  return (
    <Page
      theme={theme}
      title="We’ll remind you the day before it ends."
      line="It is the only notification the app sends."
      button="Continue"
      waiting={waiting}
      onPress={async () => {
        setWaiting(true);
        await requestReminderPermission();
        setWaiting(false);
        onDone();
      }}
    />
  );
}

/** One idea per screen: the product, one large line, one line under it, the dots and the button. */
function Page({
  theme,
  title,
  line,
  dots,
  button,
  onPress,
  waiting = false,
  noPayment = false,
  visual,
}: {
  theme: Theme;
  title: string;
  line?: string;
  visual?: React.ReactNode;
  dots?: { count: number; active: number };
  button: string;
  onPress: () => void;
  waiting?: boolean;
  noPayment?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, space.l) }]}>
      {visual ? <View style={styles.visual}>{visual}</View> : null}
      <View style={visual ? styles.wordsUnder : styles.words}>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          {title}
        </Text>
        {line ? <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>{line}</Text> : null}
      </View>
      {dots && (
        <View style={styles.dots} accessible accessibilityLabel={`Page ${dots.active + 1} of ${dots.count}`}>
          {Array.from({ length: dots.count }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === dots.active ? theme.ink : theme.rule }, i === dots.active && styles.dotOn]} />
          ))}
        </View>
      )}
      <View style={styles.footer}>
        {waiting ? <ActivityIndicator color={theme.inkSoft} style={styles.waiting} /> : <MainButton theme={theme} label={button} onPress={onPress} />}
        {noPayment && (
          <View style={styles.noPaymentRow}>
            <Glyph name="check" size={18} color={theme.ink} weight={2.4} />
            <Text style={[type.strong, { color: theme.ink }]}>No payment now</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  words: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  visual: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.l, paddingTop: space.xl },
  wordsUnder: { paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.xl },
  listPage: { flex: 1, paddingTop: space.xxl, paddingHorizontal: space.l },
  line: { marginTop: space.m },
  need: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 68, paddingHorizontal: space.l, paddingVertical: space.m },
  radio: { width: 26, height: 26, borderRadius: radius.round, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: radius.round },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.s, marginBottom: space.l },
  dot: { width: space.s, height: space.s, borderRadius: radius.round },
  dotOn: { width: space.xl },
  footer: { paddingHorizontal: space.l, gap: space.m, paddingTop: space.m },
  waiting: { height: 64 },
  skip: { minHeight: 48, justifyContent: 'center' },
  noPaymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
  showRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 68, padding: space.s, borderRadius: radius.large, borderWidth: 1 },
  showStep: { width: 52, height: 52, borderRadius: radius.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  showQty: { minWidth: 58, height: 52, borderRadius: radius.small, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  diffCard: { alignSelf: 'stretch', borderRadius: radius.large, borderWidth: 1, padding: space.l, gap: space.s },
  sheetCrop: { overflow: 'hidden', borderRadius: radius.small, backgroundColor: '#FFFFFF' },
});
