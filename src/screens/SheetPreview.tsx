import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTheme, space } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import { sheetDecision } from '../gates';
import { formatDate } from '../format';
import { sheetKit, sheetPage, sheetPdf, SheetKit } from '../sheetAssets';
import { printPdf, safeFileName, shareFileAt, writePdfFile } from '../exporting';
import { SheetView } from '../ui/Cash';
import { Bar, Fine, MainButton, PlainButton } from '../ui/Kit';
import { savedHaptic } from '../ui/motion';

/**
 * The count sheet as it will print, then Share, Print or Save to Files.
 * The first count sheet is free; a sheet that went out free can go out
 * again; any other needs Pro. A free sheet is used only once one goes out.
 */
export default function SheetPreview({ id, onBack }: { id: string; onBack: () => void }) {
  const theme = useTheme();
  const data = useData();
  const { isPro, askPro, freeSheets, noteFreeSheet, say } = useApp();
  const { width } = useWindowDimensions();
  const c = data.counts.find((x) => x.id === id) ?? null;
  const [kit, setKit] = useState<SheetKit | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<null | 'share' | 'print' | 'files'>(null);

  useEffect(() => {
    sheetKit().then(setKit, () => setFailed(true));
  }, []);

  const page = useMemo(() => (kit && c ? sheetPage(kit, c, data.paper, data.locale.tag) : null), [kit, c, data.paper, data.locale.tag]);

  const send = async (how: 'share' | 'print' | 'files') => {
    if (!kit || !c || !page || busy) return;
    const gate = sheetDecision(isPro, freeSheets, c.id);
    if (!gate.allowed && !(await askPro('sheet'))) return;
    setBusy(how);
    try {
      const bytes = await sheetPdf(kit, page, c, data.locale.tag);
      const uri = writePdfFile(safeFileName(['Count sheet', c.tillName, c.day], 'pdf'), bytes);
      if (how === 'print') await printPdf(uri);
      else await shareFileAt(uri, 'pdf', how === 'files' ? 'Save to Files' : 'Count sheet');
      if (gate.usesFree) noteFreeSheet(c.id);
      savedHaptic();
      say('Count sheet ready.');
    } catch (e: any) {
      Alert.alert('The count sheet did not go out', e?.message ?? 'Try once more.');
    } finally {
      setBusy(null);
    }
  };

  const w = width - space.l * 2;
  return (
    <View style={{ flex: 1 }}>
      <Bar theme={theme} onBack={onBack} title="Count sheet" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.paper, { borderColor: theme.edge }]}>
          {page && c ? (
            <SheetView page={page} width={w} label={`Count sheet for ${c.tillName}, ${formatDate(c.day, data.locale.tag)}`} />
          ) : failed ? (
            <Fine theme={theme} style={{ padding: space.l }}>
              The count sheet could not be drawn. Close the app and open it again.
            </Fine>
          ) : (
            <View style={{ width: w, height: w * 1.29, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.sheet }}>
              <ActivityIndicator color="#4E545C" />
            </View>
          )}
        </View>
        <Fine theme={theme}>{data.paper === 'letter' ? 'US Letter' : 'A4'}, one page, with lines to sign for who counted and who checked.</Fine>
      </ScrollView>
      <View style={[styles.foot, { borderTopColor: theme.rule, backgroundColor: theme.tile }]}>
        <MainButton theme={theme} label="Share" glyph="share" onPress={() => send('share')} busy={busy === 'share'} disabled={!page} />
        <View style={styles.pair}>
          <PlainButton theme={theme} label="Print" glyph="print" grow tall onPress={() => send('print')} disabled={!page || busy != null} />
          <PlainButton theme={theme} label="Save to Files" glyph="files" grow tall onPress={() => send('files')} disabled={!page || busy != null} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, gap: space.m, paddingBottom: space.xl },
  paper: { borderWidth: 1, alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  foot: { borderTopWidth: 1, padding: space.l, gap: space.s },
  pair: { flexDirection: 'row', gap: space.s },
});
