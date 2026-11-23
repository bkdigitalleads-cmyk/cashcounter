import React, { useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useTheme, space, type } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import { CURRENCIES, CURRENCY_CODES } from '../currencies';
import { canChangeCurrency, FREE_HISTORY } from '../gates';
import { isBlank } from '../count';
import { restorePurchases } from '../purchases';
import { cancelTrialReminder } from '../reminder';
import { kvSet } from '../store';
import { PRIVACY_URL, SUPPORT_EMAIL, SUPPORT_MAIL_URL, SUPPORT_URL, TERMS_URL } from '../links';
import Glyph from '../ui/Glyph';
import { Fine, Heading, SectionHead, Sheet, Slot, Tray } from '../ui/Kit';

/** Tills, rows, currency, export, Pro, restore, help and About. Test tools behind seven taps on the version line, in test builds only. */
export default function Settings({ onTills, onRows, onExport, onReplayOnboarding }: { onTills: () => void; onRows: () => void; onExport: () => void; onReplayOnboarding: () => void }) {
  const theme = useTheme();
  const data = useData();
  const { isPro, setIsPro, askPro, testBuild, actFree, setActFree, resetFreeUse, say } = useApp();
  const [restoring, setRestoring] = useState(false);
  const [picking, setPicking] = useState(false);
  const [taps, setTaps] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = `${Constants.expoConfig?.version ?? '1.0.0'} (${Constants.expoConfig?.ios?.buildNumber ?? '1'})`;
  const till = data.till;

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    const res = await restorePurchases();
    setRestoring(false);
    if (res.ok) cancelTrialReminder();
    if (res.ok && res.isPro) {
      setIsPro(true);
      Alert.alert('Pro is back on', 'Every count, till and count sheet is open again.');
    } else if (res.ok) Alert.alert('Nothing to restore', 'This Apple ID has no Cash Counter Pro purchase.');
    else Alert.alert('Restore did not work', res.error ?? 'Try once more.');
  };

  const versionTap = () => {
    if (!testBuild) return;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTaps(0), 2000);
    setTaps((t) => t + 1);
  };

  const pickCurrency = async () => {
    if (canChangeCurrency(isPro, data.counts.length) || (await askPro('currency'))) setPicking(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Heading theme={theme}>Settings</Heading>

      <View>
        <SectionHead theme={theme}>Counting</SectionHead>
        <Tray theme={theme}>
          <Slot theme={theme} first glyph="till" label="Tills" sub={data.tills.map((t) => t.name).join(', ')} onPress={onTills} />
          <Slot theme={theme} glyph="rows" label="Rows on the count" sub="Hide notes and coins, add checks or vouchers" onPress={onRows} />
          <Slot theme={theme} glyph="count" label="Currency" sub={`${CURRENCIES[till.currency].name}, for ${till.name}`} onPress={pickCurrency} right={<Text style={[type.figure, { color: theme.ink }]}>{till.currency}</Text>} />
        </Tray>
      </View>

      <View>
        <SectionHead theme={theme}>Export</SectionHead>
        <Tray theme={theme}>
          <Slot theme={theme} first glyph="csv" label="Export history as CSV" sub={data.counts.length ? `${data.counts.length} saved ${data.counts.length === 1 ? 'count' : 'counts'}, for a spreadsheet` : 'No saved counts yet'} onPress={data.counts.length ? onExport : undefined} />
        </Tray>
      </View>

      <View>
        <SectionHead theme={theme}>Pro</SectionHead>
        <Tray theme={theme}>
          {isPro ? (
            <Slot theme={theme} first glyph="check" label="Cash Counter Pro is on" sub="Every count, till, count sheet and the deposit helper" />
          ) : (
            <Slot theme={theme} first glyph="star" label="Cash Counter Pro" sub={`Counting is free. Pro keeps more than ${FREE_HISTORY} counts, more tills, every sheet and the deposit helper.`} onPress={() => askPro('pro')} />
          )}
          <Slot theme={theme} glyph="undo" label={restoring ? 'Restoring' : 'Restore purchases'} onPress={restore} right={<View />} />
        </Tray>
      </View>

      <View>
        <SectionHead theme={theme}>Help</SectionHead>
        <Tray theme={theme}>
          <Slot theme={theme} first label="Support and questions" sub="How counting, tills and count sheets work" onPress={() => Linking.openURL(SUPPORT_URL)} />
          <Slot
            theme={theme}
            label="Email support"
            sub={SUPPORT_EMAIL}
            hint="Opens Mail with the subject Cash Counter support"
            onPress={() => Linking.openURL(SUPPORT_MAIL_URL).catch(() => Alert.alert('Mail did not open', `Write to ${SUPPORT_EMAIL}.`))}
          />
          <Slot theme={theme} label="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Slot theme={theme} label="Terms of Use (EULA)" onPress={() => Linking.openURL(TERMS_URL)} />
        </Tray>
      </View>

      <View>
        <SectionHead theme={theme}>About</SectionHead>
        <Tray theme={theme} style={styles.about}>
          <Text style={[type.body, { color: theme.ink }]}>A cash counter and a record of each count. It adds up what you type; it does not scan money.</Text>
          <Text style={[type.small, { color: theme.inkSoft }]}>No account. Your counts stay on this iPhone and work offline.</Text>
          <Text style={[type.small, { color: theme.inkFaint, paddingVertical: space.xs }]} onPress={versionTap} accessibilityRole="text">
            Version {version}
          </Text>
        </Tray>
      </View>

      {testBuild && taps >= 7 ? (
        <View>
          <SectionHead theme={theme}>Testing (test builds only)</SectionHead>
          <Tray theme={theme}>
            <Slot theme={theme} first label="Act as a free user" right={<Switch value={actFree} onValueChange={(v) => setActFree(v)} />} />
            <Slot
              theme={theme}
              label="Make the first count sheet and CSV free again"
              onPress={() => {
                resetFreeUse();
                say('Free use reset.');
              }}
              right={<View />}
            />
            <Slot
              theme={theme}
              label="Show onboarding again"
              onPress={() => {
                kvSet('flag.onboarded', '0').catch(() => {});
                onReplayOnboarding();
              }}
              right={<View />}
            />
          </Tray>
        </View>
      ) : null}

      <Sheet theme={theme} visible={picking} onClose={() => setPicking(false)} title="Currency">
        <View style={{ gap: space.m, paddingBottom: space.l }}>
          <Tray theme={theme}>
            {CURRENCY_CODES.map((code, i) => (
              <Slot
                key={code}
                theme={theme}
                first={i === 0}
                label={CURRENCIES[code].name}
                sub={code}
                onPress={() => {
                  const go = () => {
                    data.setTillCurrency(till.id, code);
                    setPicking(false);
                  };
                  if (code === till.currency) return setPicking(false);
                  if (!isBlank(data.draft)) Alert.alert('Clear the count on screen?', 'The count you started is in the old currency.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear and change', style: 'destructive', onPress: go }]);
                  else go();
                }}
                right={code === till.currency ? <Glyph name="check" size={22} color={theme.ink} weight={2.4} /> : <View />}
              />
            ))}
          </Tray>
          <Fine theme={theme}>{isPro ? 'Each till can count in its own currency.' : 'The free plan counts in one currency. You can change it until you save your first count.'}</Fine>
        </View>
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, gap: space.xl, paddingBottom: space.xxl },
  about: { padding: space.l, gap: space.s },
});
