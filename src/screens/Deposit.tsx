import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, space, tabular, type } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import { CURRENCIES } from '../currencies';
import { suggestDeposit } from '../deposit';
import { formatMoney, formatQty } from '../format';
import { CashTile, Keypad } from '../ui/Cash';
import { Bar, Fine, PlainButton, Press, SectionHead, Sheet, Slot, Tray } from '../ui/Kit';
import Glyph from '../ui/Glyph';

/**
 * The deposit helper: pick the float to leave in the till, and the app
 * says which notes and coins to bank and what the deposit comes to. It
 * works from a saved count, or from the count on screen (countId null).
 */
export default function Deposit({ countId, onBack }: { countId: string | null; onBack: () => void }) {
  const theme = useTheme();
  const data = useData();
  const { say } = useApp();
  const saved = countId ? data.counts.find((c) => c.id === countId) ?? null : null;
  const source = saved ?? data.draft;
  const tillId = saved ? saved.tillId : data.draft.tillId;
  const till = data.tills.find((t) => t.id === tillId) ?? null;
  const currency = source.currency;
  const [float, setFloat] = useState(till?.float ?? 0);
  const [typing, setTyping] = useState(false);
  const [digits, setDigits] = useState('');
  const plan = useMemo(() => suggestDeposit(currency, source.pieces, float), [currency, source.pieces, float]);
  const locale = data.locale.tag;
  const money = (m: number) => formatMoney(m, currency, locale);
  const den = (id: string) => CURRENCIES[currency].denominations.find((d) => d.id === id)!;
  const other = source.custom.filter((c) => c.amount > 0);

  return (
    <View style={{ flex: 1 }}>
      <Bar theme={theme} onBack={onBack} title="Deposit" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <SectionHead theme={theme}>Float to leave</SectionHead>
          <Tray theme={theme}>
            <Slot
              theme={theme}
              first
              glyph="till"
              label={till?.name ?? 'Till'}
              sub="Tap to change the float"
              onPress={() => {
                setDigits(float ? String(float) : '');
                setTyping(true);
              }}
              right={<Text style={[type.figure, { color: theme.ink }]}>{money(float)}</Text>}
            />
          </Tray>
        </View>

        <View style={[styles.summary, { backgroundColor: theme.tile, borderColor: theme.edge }]}>
          <Text style={[type.label, { color: theme.inkSoft }]}>Deposit</Text>
          <Text style={[type.total, { color: theme.ink }]} accessibilityLabel={`Deposit ${money(plan.deposit)}`}>
            {money(plan.deposit)}
          </Text>
          <Text style={[type.body, { color: theme.ink }]}>
            Leaves <Text style={[tabular, { fontWeight: '600' }]}>{money(plan.left)}</Text> in the till.
          </Text>
          {plan.fit === 'above' ? (
            <Fine theme={theme}>No mix of what you counted makes exactly {money(plan.float)}. This leaves {money(plan.left - plan.float)} more.</Fine>
          ) : plan.fit === 'short' ? (
            <Fine theme={theme}>The cash counted is less than the float, so all of it stays and nothing is banked.</Fine>
          ) : null}
        </View>

        <View>
          <View style={styles.colHead}>
            <Text style={[type.label, { color: theme.inkSoft, flex: 1 }]}>Counted</Text>
            <Text style={[type.label, styles.col, { color: theme.inkSoft }]}>Leave</Text>
            <Text style={[type.label, styles.col, { color: theme.ink }]}>Bank</Text>
          </View>
          <Tray theme={theme}>
            {plan.lines.length === 0 ? <Slot theme={theme} first label="Nothing counted yet" /> : null}
            {plan.lines.map((l, i) => (
              <View key={l.id} style={[styles.line, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }]} accessible accessibilityLabel={`${den(l.id).name}: ${l.counted} counted, leave ${l.leave}, bank ${l.bank}`}>
                <CashTile theme={theme} d={den(l.id)} width={48} />
                <Text style={[type.figure, { color: theme.inkSoft, flex: 1, fontSize: 18 }]}>{formatQty(l.counted, locale)}</Text>
                <Text style={[type.figure, styles.col, { color: theme.inkSoft, fontSize: 18 }]}>{formatQty(l.leave, locale)}</Text>
                <Text style={[type.figure, styles.col, { color: l.bank ? theme.ink : theme.inkFaint, fontSize: 20 }]}>{formatQty(l.bank, locale)}</Text>
              </View>
            ))}
          </Tray>
          {other.length > 0 ? (
            <Fine theme={theme} style={{ marginTop: space.s }}>
              Not in the suggestion: {other.map((o) => `${o.label} ${money(o.amount)}`).join(', ')}. Bank or keep those as you usually do.
            </Fine>
          ) : null}
        </View>

        {till && float !== till.float ? (
          <PlainButton
            theme={theme}
            label={`Use ${money(float)} as the usual float`}
            onPress={async () => {
              await data.saveTill({ ...till, float });
              say('Float saved for this till.');
            }}
          />
        ) : null}
        <Press disabled accessibilityRole="text" style={styles.howRow}>
          <Glyph name="deposit" size={18} color={theme.inkFaint} />
          <Fine theme={theme} style={{ flex: 1 }}>
            The largest notes go to the bank first, and the float keeps the small notes and coins you need for change.
          </Fine>
        </Press>
      </ScrollView>

      <Sheet theme={theme} visible={typing} onClose={() => setTyping(false)} title="Float to leave" scroll={false}>
        <Keypad
          theme={theme}
          digits={digits}
          onDigits={setDigits}
          maxDigits={10}
          display={money(Number(digits || '0'))}
          sub="What stays in the till for tomorrow"
          onDone={() => {
            setFloat(Number(digits || '0'));
            setTyping(false);
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, gap: space.xl, paddingBottom: space.xxl },
  summary: { borderRadius: 14, borderWidth: 1, padding: space.l, gap: space.xs },
  colHead: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.l + 48 + space.m, paddingRight: space.l, marginBottom: space.s },
  col: { width: 64, textAlign: 'right' },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 56, paddingHorizontal: space.l, paddingVertical: space.s },
  howRow: { flexDirection: 'row', gap: space.s, alignItems: 'flex-start' },
});
