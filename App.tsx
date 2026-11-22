import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useTheme, UI_FONT_FILES, space, type } from './src/theme';
import { AppProvider, useApp, ONBOARDED_KEY } from './src/state';
import { kvGet, kvSet, sweepCache } from './src/store';
import { afterOnboardingPaywall, savedOnLaterDay, tillNameFor } from './src/rules';
import { csvDecision, FREE_HISTORY, saveAsksPro } from './src/gates';
import { csvFileName, historyCsv } from './src/history';
import { isoDay } from './src/dates';
import { maybeRequestReview } from './src/reviews';
import { shareFileAt, writeCsvFile } from './src/exporting';
import { PRIVACY_URL } from './src/links';
import { DataProvider, useData } from './src/data';
import Count, { SaveMeta } from './src/screens/Count';
import History from './src/screens/History';
import CountView from './src/screens/CountView';
import Deposit from './src/screens/Deposit';
import SheetPreview from './src/screens/SheetPreview';
import Tills from './src/screens/Tills';
import Rows from './src/screens/Rows';
import Settings from './src/screens/Settings';
import PaywallModal from './src/screens/Paywall';
import Welcome, { TrialSteps, WhatCounting } from './src/screens/Welcome';
import TabBar, { Tab } from './src/ui/TabBar';
import { Heading, MainButton, Sheet, Toast } from './src/ui/Kit';
import { savedHaptic } from './src/ui/motion';

/** A screen over the tabs. Back pops one. */
type Over =
  | { name: 'view'; id: string }
  | { name: 'sheet'; id: string }
  | { name: 'deposit'; id: string | null }
  | { name: 'tills' }
  | { name: 'rows' };

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, notice, isPro, askPro, say, setCounting, csvUsed, noteCsv } = useApp();
  const data = useData();
  const [tab, setTab] = useState<Tab>('count');
  const [stack, setStack] = useState<Over[]>([]);
  const push = (o: Over) => setStack((s) => [...s, o]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  // New installs: three screens, "What are you counting?", the trial and reminder screens, then the paywall.
  const [step, setStep] = useState<'intro' | 'what' | 'trial' | 'paywall'>('intro');
  // After the onboarding paywall is closed with the X: the small "Counting is free" sheet.
  const [claim, setClaim] = useState(false);
  const paywallOpened = useRef(false);

  useEffect(() => {
    sweepCache();
  }, []);

  useEffect(() => {
    if (!ready || !data.loaded || onboarded !== null) return;
    (async () => {
      if ((await kvGet(ONBOARDED_KEY)) === '1') return setOnboarded(true);
      // Anyone who already saved a count, or is Pro, has used the app: no onboarding.
      if (isPro || data.counts.length > 0) {
        kvSet(ONBOARDED_KEY, '1').catch(() => {});
        return setOnboarded(true);
      }
      setOnboarded(false);
    })().catch(() => setOnboarded(true)); // fail open: never trap anyone
  }, [ready, data.loaded, onboarded, isPro, data.counts.length]);

  const openOnboardingPaywall = () => {
    if (paywallOpened.current) return;
    paywallOpened.current = true;
    setStep('paywall');
    askPro('pro').then((pro) => {
      if (afterOnboardingPaywall(pro) === 'claim') setTimeout(() => setClaim(true), 450);
      kvSet(ONBOARDED_KEY, '1').catch(() => {});
      setOnboarded(true);
      setTab('count');
    });
  };

  /** Save count: the paywall first on the free plan's fourth save and after, then always saved. */
  const save = async (m: SaveMeta) => {
    const editing = data.draft.savedId != null;
    let pro = isPro;
    if (saveAsksPro(isPro, data.counts.length, editing)) pro = await askPro('save');
    try {
      const saved = await data.saveDraft(m);
      setCounting(false);
      savedHaptic();
      say(editing ? 'Changes saved.' : !pro && data.counts.length >= FREE_HISTORY ? 'Count saved. History shows your last three.' : 'Count saved.');
      setStack([{ name: 'view', id: saved.id }]);
      if (savedOnLaterDay(data.installDay, isoDay(Date.now()))) maybeRequestReview('laterDaySave');
    } catch (e: any) {
      Alert.alert('The count was not saved', e?.message ?? 'Try once more. The count is still on screen.');
    }
  };

  const exportCsv = async () => {
    const gate = csvDecision(isPro, csvUsed);
    if (!gate.allowed && !(await askPro('csv'))) return;
    try {
      const uri = writeCsvFile(csvFileName(isoDay(Date.now())), historyCsv(data.counts));
      await shareFileAt(uri, 'csv', 'Cash counts');
      if (gate.usesFree) noteCsv();
      say('CSV ready.');
    } catch (e: any) {
      Alert.alert('The CSV did not go out', e?.message ?? 'Try once more.');
    }
  };

  if (!ready || !data.loaded || onboarded === null) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  if (data.failed) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: space.l, paddingTop: insets.top + space.xxl }}>
        <Heading theme={theme}>Your counts did not open.</Heading>
        <Text style={[type.body, { color: theme.inkSoft, marginTop: space.s }]}>Close the app and open it again. If it keeps happening, write to support from the App Store page. ({data.failed})</Text>
      </View>
    );
  }

  if (!onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        {step === 'intro' && <Welcome onDone={() => setStep('what')} />}
        {step === 'what' && (
          <WhatCounting
            onDone={async (choice) => {
              const first = data.tills[0];
              if (choice && first) await data.saveTill({ ...first, name: tillNameFor(choice) });
              setStep('trial');
            }}
          />
        )}
        {(step === 'trial' || step === 'paywall') && <TrialSteps onDone={openOnboardingPaywall} />}
        <PaywallModal privacyUrl={PRIVACY_URL} onboarding />
      </View>
    );
  }

  const top = stack[stack.length - 1];
  let body: React.ReactNode;
  if (top?.name === 'view')
    body = (
      <CountView
        key={top.id}
        id={top.id}
        onBack={pop}
        onSheet={(id) => push({ name: 'sheet', id })}
        onDeposit={(id) => push({ name: 'deposit', id })}
        onReopen={() => {
          setStack([]);
          setTab('count');
        }}
      />
    );
  else if (top?.name === 'sheet') body = <SheetPreview key={top.id} id={top.id} onBack={pop} />;
  else if (top?.name === 'deposit') body = <Deposit countId={top.id} onBack={pop} />;
  else if (top?.name === 'tills') body = <Tills onBack={pop} />;
  else if (top?.name === 'rows') body = <Rows onBack={pop} />;
  else if (tab === 'count') body = <Count onSave={save} onDeposit={() => push({ name: 'deposit', id: null })} onRows={() => push({ name: 'rows' })} onTills={() => push({ name: 'tills' })} />;
  else if (tab === 'history') body = <History onOpen={(id) => push({ name: 'view', id })} onExport={exportCsv} />;
  else
    body = (
      <Settings
        onTills={() => push({ name: 'tills' })}
        onRows={() => push({ name: 'rows' })}
        onExport={exportCsv}
        onReplayOnboarding={() => {
          paywallOpened.current = false;
          setStep('intro');
          setOnboarded(false);
        }}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>{body}</View>
      {top == null ? <TabBar theme={theme} tab={tab} onTab={setTab} /> : null}
      <Toast theme={theme} text={notice} top={insets.top} />
      <PaywallModal privacyUrl={PRIVACY_URL} />
      <Sheet theme={theme} visible={claim} onClose={() => setClaim(false)}>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          Counting is free.
        </Text>
        <Text style={[type.body, { color: theme.inkSoft, marginTop: space.s, marginBottom: space.xl }]}>Count as often as you like. Your last three counts stay in History, and your first count sheet is on us.</Text>
        <MainButton theme={theme} label="Start counting" onPress={() => setClaim(false)} />
      </Sheet>
    </View>
  );
}

/** A failure while a screen renders: shown instead of a frozen screen. Nothing is lost on disk. */
class Guard extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: '#E9ECEF', padding: space.l, paddingTop: 80 }}>
        <Text style={[type.title, { color: '#0C0E11' }]}>Something went wrong on this screen.</Text>
        <Text style={[type.body, { color: '#0C0E11', marginTop: space.s }]}>Close the app and open it again. Your saved counts and the count in progress are kept.</Text>
        <Text style={{ fontSize: 12, color: '#757C86', marginTop: space.l }}>{error.message}</Text>
      </View>
    );
  }
}

export default function App() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({ ...UI_FONT_FILES });
  // If the fonts are still not in after a few seconds, open anyway with the system font.
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), 6000);
    return () => clearTimeout(t);
  }, []);
  // The background colour while fonts load, so launch never flashes white.
  if (!fontsLoaded && !fontError && !gaveUp) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  return (
    <Guard>
      <SafeAreaProvider>
        <AppProvider>
          <DataProvider>
            <Shell />
          </DataProvider>
        </AppProvider>
      </SafeAreaProvider>
    </Guard>
  );
}
