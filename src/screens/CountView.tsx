import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, space, type } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import { CURRENCIES } from '../currencies';
import { countTotals, expectedAmount, isBlank } from '../count';
import { canUseDeposit } from '../gates';
import { formatDate, formatMoney, formatQty, formatTime } from '../format';
import Glyph from '../ui/Glyph';
import { CashTile, DiffLine } from '../ui/Cash';
import { Bar, Fine, MainButton, PlainButton, RoundButton, SectionHead, Slot, Tray } from '../ui/Kit';

/** One saved count: what was counted, the total, over or short, and what to do next. */
export default function CountView({ id, onBack, onSheet, onDeposit, onReopen }: { id: string; onBack: () => void; onSheet: (id: string) => void; onDeposit: (id: string) => void; onReopen: () => void }) {
  const theme = useTheme();
  const data = useData();
  const { isPro, askPro } = useApp();
  const c = data.counts.find((x) => x.id === id);
  if (!c) {
    return (
      <View style={{ flex: 1 }}>
        <Bar theme={theme} onBack={onBack} />
        <Fine theme={theme} style={{ padding: space.l }}>
          This count was deleted.
        </Fine>
      </View>
    );
  }
  const locale = data.locale.tag;
  const money = (m: number) => formatMoney(m, c.currency, locale);
  const t = countTotals(c.currency, c.pieces, c.custom);
  const x = expectedAmount(c.expected);
  const counted = CURRENCIES[c.currency].denominations.filter((d) => (c.pieces[d.id] ?? 0) > 0);

  const putOnCount = (mode: 'edit' | 'duplicate') => {
    const go = () => {
      data.openDraft(c, mode);
      onReopen();
    };
    if (!isBlank(data.draft) && data.draft.savedId !== c.id)
      Alert.alert('Replace the count on screen?', 'The count you have started is cleared.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Replace', style: 'destructive', onPress: go }]);
    else go();
  };

  return (
    <View style={{ flex: 1 }}>
      <Bar
        theme={theme}
        onBack={onBack}
        title={c.tillName}
        right={
          <RoundButton
            theme={theme}
            glyph="trash"
            label="Delete this count"
            onPress={() =>
              Alert.alert('Delete this count?', 'It is removed from History. A count sheet already sent stays where you sent it.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await data.removeCount(c.id);
                    onBack();
                  },
                },
              ])
            }
            size={48}
          />
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ gap: space.xs }}>
          <Text style={[type.small, { color: theme.inkSoft }]}>
            {c.name}, {formatDate(c.day, locale)}, saved {formatTime(c.updatedAt, locale)}
          </Text>
          <Text style={[type.total, { color: theme.ink }]} accessibilityLabel={`Total ${money(c.total)}`}>
            {money(c.total)}
          </Text>
          {c.diff != null ? <DiffLine theme={theme} diff={c.diff} money={money} /> : null}
          {x != null ? (
            <Fine theme={theme}>
              Expected {money(x)}
              {c.expected.mode === 'floatSales' ? `: float ${money(c.expected.float)} plus sales ${money(c.expected.sales)}` : ''}
            </Fine>
          ) : null}
        </View>

        <View style={{ gap: space.s }}>
          <MainButton
            theme={theme}
            label="Count sheet"
            glyph="sheet"
            onPress={() => onSheet(c.id)}
          />
          <View style={styles.pair}>
            <PlainButton theme={theme} label="Deposit" glyph="deposit" grow tall onPress={async () => (canUseDeposit(isPro) || (await askPro('deposit')) ? onDeposit(c.id) : undefined)} />
            <PlainButton theme={theme} label="Reopen" glyph="edit" grow tall onPress={() => putOnCount('edit')} />
          </View>
          <PlainButton theme={theme} label="Duplicate as a new count" glyph="copy" tall onPress={() => putOnCount('duplicate')} />
        </View>

        <View>
          <SectionHead theme={theme} right={<Text style={[type.small, { color: theme.inkSoft }]}>{formatQty(t.pieces, locale)} pieces</Text>}>
            Counted
          </SectionHead>
          <Tray theme={theme}>
            {counted.length === 0 && c.custom.length === 0 ? <Slot theme={theme} first label="Nothing counted" /> : null}
            {counted.map((d, i) => (
              <View key={d.id} style={[styles.line, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }]}>
                <CashTile theme={theme} d={d} width={48} />
                <Text style={[type.body, { color: theme.inkSoft, flex: 1 }]} numberOfLines={1}>
                  {formatQty(c.pieces[d.id], locale)} × {d.tile}
                </Text>
                <Text style={[type.figure, { color: theme.ink, fontSize: 19 }]}>{money(t.rows[d.id])}</Text>
              </View>
            ))}
            {c.custom.map((o, i) => (
              <View key={o.id} style={[styles.line, (i > 0 || counted.length > 0) && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }]}>
                <View style={styles.otherIcon}>
                  <Glyph name="sheet" size={22} color={theme.inkSoft} />
                </View>
                <Text style={[type.body, { color: theme.inkSoft, flex: 1 }]} numberOfLines={1}>
                  {o.label}
                </Text>
                <Text style={[type.figure, { color: theme.ink, fontSize: 19 }]}>{money(o.amount)}</Text>
              </View>
            ))}
          </Tray>
        </View>

        {c.note ? (
          <View>
            <SectionHead theme={theme}>Note</SectionHead>
            <Tray theme={theme} style={{ padding: space.l }}>
              <Text style={[type.body, { color: theme.ink }]}>{c.note}</Text>
            </Tray>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, gap: space.xl, paddingBottom: space.xxl },
  pair: { flexDirection: 'row', gap: space.s },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 56, paddingHorizontal: space.l, paddingVertical: space.s },
  otherIcon: { width: 48, alignItems: 'center' },
});
