import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTheme, space, type } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import { CURRENCIES } from '../currencies';
import { addCustomRow, isShown, MAX_CUSTOM, removeCustomRow, setShown } from '../rows';
import { newId } from '../count';
import { canAddCustomRow } from '../gates';
import { CashTile } from '../ui/Cash';
import Glyph from '../ui/Glyph';
import { Bar, Fine, MainButton, PlainButton, RoundButton, SectionHead, Sheet, TextBox, Tray } from '../ui/Kit';

/** Which notes and coins the count shows, and custom rows (checks, vouchers) entered as amounts. */
export default function Rows({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const data = useData();
  const { isPro, askPro } = useApp();
  const currency = data.draft.currency;
  const setup = data.rowSetup(currency);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');

  const add = async () => {
    if (canAddCustomRow(isPro) || (await askPro('rows'))) {
      setLabel('');
      setAdding(true);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Bar theme={theme} onBack={onBack} title="Rows" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <SectionHead theme={theme}>{CURRENCIES[currency].name}</SectionHead>
          <Tray theme={theme}>
            {CURRENCIES[currency].denominations.map((d, i) => {
              const on = isShown(d, setup);
              return (
                <View key={d.id} style={[styles.line, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }]}>
                  <CashTile theme={theme} d={d} width={48} />
                  <Text style={[type.body, { color: on ? theme.ink : theme.inkFaint, flex: 1 }]}>{d.name}</Text>
                  <Switch value={on} onValueChange={(v) => data.saveRowSetup(currency, setShown(setup, d, v))} accessibilityLabel={`Show ${d.name}`} trackColor={{ true: theme.ink, false: theme.raised }} thumbColor={theme.isDark ? theme.bg : '#FFFFFF'} />
                </View>
              );
            })}
          </Tray>
          <Fine theme={theme} style={{ marginTop: space.s }}>
            A hidden row that has pieces in the count on screen still shows, so nothing counted is out of sight.
          </Fine>
        </View>

        <View>
          <SectionHead theme={theme}>Your own rows</SectionHead>
          {setup.custom.length > 0 ? (
            <Tray theme={theme}>
              {setup.custom.map((c, i) => (
                <View key={c.id} style={[styles.line, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }]}>
                  <View style={{ width: 48, alignItems: 'center' }}>
                    <Glyph name="sheet" size={22} color={theme.inkSoft} />
                  </View>
                  <Text style={[type.body, { color: theme.ink, flex: 1 }]}>{c.label}</Text>
                  <RoundButton theme={theme} glyph="trash" label={`Remove ${c.label}`} onPress={() => data.saveRowSetup(currency, removeCustomRow(setup, c.id))} size={48} color={theme.danger} />
                </View>
              ))}
            </Tray>
          ) : (
            <Fine theme={theme}>Checks, gift vouchers, a card tip envelope: anything you count by its amount.</Fine>
          )}
          {setup.custom.length < MAX_CUSTOM ? (
            <View style={{ marginTop: space.m }}>
              <PlainButton theme={theme} label="Add a row" glyph="plus" tall onPress={add} />
            </View>
          ) : null}
        </View>
      </ScrollView>
      <Sheet theme={theme} visible={adding} onClose={() => setAdding(false)} title="New row">
        <View style={{ gap: space.l, paddingBottom: space.l }}>
          <TextBox theme={theme} value={label} onChangeText={setLabel} placeholder="Checks" autoFocus maxLength={40} autoCapitalize="sentences" accessibilityLabel="Row name" />
          <Fine theme={theme}>On the count you type its amount, and it adds to the total.</Fine>
          <MainButton
            theme={theme}
            label="Add row"
            disabled={!label.trim()}
            onPress={async () => {
              await data.saveRowSetup(currency, addCustomRow(setup, newId(), label));
              setAdding(false);
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, gap: space.xl, paddingBottom: space.xxl },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 60, paddingHorizontal: space.l, paddingVertical: space.s },
});
