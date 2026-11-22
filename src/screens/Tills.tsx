import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, space, type } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import type { Till } from '../db/repo';
import { CURRENCIES, CURRENCY_CODES } from '../currencies';
import { canAddTill, canChangeCurrency } from '../gates';
import { formatMoney } from '../format';
import Glyph from '../ui/Glyph';
import { Keypad } from '../ui/Cash';
import { Bar, Fine, MainButton, PlainButton, SectionHead, Sheet, Slot, TextBox, Tray } from '../ui/Kit';

/** Named tills (Front register, Bar, Safe), each with its usual float. The first is free; more are Pro. */
export default function Tills({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const data = useData();
  const { isPro, askPro } = useApp();
  const [editing, setEditing] = useState<Till | 'new' | null>(null);

  const add = async () => {
    if (canAddTill(isPro, data.tills.length) || (await askPro('till'))) setEditing('new');
  };

  return (
    <View style={{ flex: 1 }}>
      <Bar theme={theme} onBack={onBack} title="Tills" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Tray theme={theme}>
          {data.tills.map((t, i) => (
            <Slot key={t.id} theme={theme} first={i === 0} glyph="till" label={t.name} sub={`${CURRENCIES[t.currency].name}, float ${formatMoney(t.float, t.currency, data.locale.tag)}`} onPress={() => setEditing(t)} />
          ))}
        </Tray>
        <PlainButton theme={theme} label="Add a till" glyph="plus" tall onPress={add} />
        <Fine theme={theme}>Each till keeps its own float and History. Saved counts keep the till name they were saved with.{isPro ? '' : ' One till is free; more tills come with Pro.'}</Fine>
      </ScrollView>
      <Sheet theme={theme} visible={editing != null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New till' : 'Till'}>
        {editing ? (
          <TillEditor
            key={editing === 'new' ? 'new' : editing.id}
            till={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

function TillEditor({ till, onClose }: { till: Till | null; onClose: () => void }) {
  const theme = useTheme();
  const data = useData();
  const { isPro, askPro } = useApp();
  const [name, setName] = useState(till?.name ?? '');
  const [float, setFloat] = useState(till?.float ?? 0);
  const [currency, setCurrency] = useState(till?.currency ?? data.till.currency);
  const [typing, setTyping] = useState(false);
  const [picking, setPicking] = useState(false);
  const [digits, setDigits] = useState('');
  const money = (m: number) => formatMoney(m, currency, data.locale.tag);

  if (typing) {
    return (
      <View style={{ paddingBottom: space.l }}>
        <Keypad
          theme={theme}
          digits={digits}
          onDigits={setDigits}
          maxDigits={10}
          display={money(Number(digits || '0'))}
          sub="The float usually left in this till"
          onDone={() => {
            setFloat(Number(digits || '0'));
            setTyping(false);
          }}
        />
      </View>
    );
  }
  if (picking) {
    return (
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
                setCurrency(code);
                setPicking(false);
              }}
              right={code === currency ? <Glyph name="check" size={22} color={theme.ink} weight={2.4} /> : <View />}
            />
          ))}
        </Tray>
      </View>
    );
  }
  const save = async () => {
    if (till) {
      if (currency !== till.currency) await data.setTillCurrency(till.id, currency);
      await data.saveTill({ ...till, name: name.trim() || till.name, float, currency });
    } else {
      const t = await data.addTill(name.trim() || 'Till', currency);
      await data.saveTill({ ...t, float });
    }
    onClose();
  };
  return (
    <View style={{ gap: space.l, paddingBottom: space.l }}>
      <View>
        <SectionHead theme={theme}>Name</SectionHead>
        <TextBox theme={theme} value={name} onChangeText={setName} placeholder="Front register, Bar, Safe" maxLength={40} autoCapitalize="words" accessibilityLabel="Name" />
      </View>
      <Tray theme={theme}>
        <Slot
          theme={theme}
          first
          label="Usual float"
          onPress={() => {
            setDigits(float ? String(float) : '');
            setTyping(true);
          }}
          right={<Text style={[type.figure, { color: theme.ink }]}>{money(float)}</Text>}
        />
        <Slot
          theme={theme}
          label="Currency"
          sub={CURRENCIES[currency].name}
          onPress={async () => {
            if (canChangeCurrency(isPro, data.counts.length) || (await askPro('currency'))) setPicking(true);
          }}
          right={<Text style={[type.figure, { color: theme.ink }]}>{currency}</Text>}
        />
      </Tray>
      <MainButton theme={theme} label={till ? 'Save till' : 'Add till'} onPress={save} />
      {till && data.tills.length > 1 ? (
        <PlainButton
          theme={theme}
          label="Remove this till"
          tone="danger"
          onPress={() =>
            Alert.alert(`Remove ${till.name}?`, 'Its saved counts stay in History.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  await data.removeTill(till.id);
                  onClose();
                },
              },
            ])
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, gap: space.l, paddingBottom: space.xxl },
});
