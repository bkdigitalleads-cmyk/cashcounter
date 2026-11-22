import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useTheme, radius, space, tabular, Theme, TOUCH, type } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import type { Denomination } from '../currencies';
import { CURRENCIES, packWord } from '../currencies';
import type { Expected, ExpectedMode } from '../count';
import { countTotals, difference, expectedAmount, isBlank } from '../count';
import { MAX_QTY, parseQty } from '../money';
import { visibleDenoms } from '../rows';
import { formatDate, formatMoney, formatQty } from '../format';
import { addDays, isoDay } from '../dates';
import { defaultCountName } from '../history';
import { canUseDeposit } from '../gates';
import Glyph from '../ui/Glyph';
import { CashTile, DiffLine, Keypad } from '../ui/Cash';
import { Choice, Fine, MainButton, Press, RoundButton, SectionHead, Sheet, Slot, TextBox, Tray } from '../ui/Kit';
import { packHaptic, stepHaptic } from '../ui/motion';

type Typing = { kind: 'qty'; id: string } | { kind: 'custom'; id: string; label: string } | null;

export interface SaveMeta {
  name: string;
  note: string;
  day: string;
  tillId: string;
}

/**
 * Home is the count. One row per note and coin, largest first: the tile,
 * the row's subtotal, a large minus and plus, and the number of pieces,
 * which can be tapped to type. A long press adds a roll or a strap. The
 * total stays pinned at the bottom with over or short under it, and Save
 * count under that.
 */
export default function Count({ onSave, onDeposit, onRows, onTills }: { onSave: (m: SaveMeta) => void; onDeposit: () => void; onRows: () => void; onTills: () => void }) {
  const theme = useTheme();
  const data = useData();
  const { isPro, askPro, setCounting } = useApp();
  const { draft, till, locale } = data;
  const setup = data.rowSetup(draft.currency);
  const rows = useMemo(() => visibleDenoms(draft.currency, setup, draft.pieces), [draft.currency, setup, draft.pieces]);
  const customRows = useMemo(() => {
    // The currency's custom rows, and any a reopened count carries that are no longer set up.
    const list = setup.custom.map((c) => ({ id: c.id, label: c.label, amount: draft.custom.find((x) => x.id === c.id)?.amount ?? 0 }));
    for (const c of draft.custom) if (!list.some((x) => x.id === c.id) && c.amount > 0) list.push(c);
    return list;
  }, [setup.custom, draft.custom]);
  const totals = countTotals(draft.currency, draft.pieces, draft.custom);
  const money = (m: number) => formatMoney(m, draft.currency, locale.tag);
  const expected = expectedAmount(draft.expected);
  const diff = difference(totals.total, draft.expected);
  const blank = isBlank(draft);

  const [typing, setTyping] = useState<Typing>(null);
  const [digits, setDigits] = useState('');
  const [pack, setPack] = useState<Denomination | null>(null);
  const [sheet, setSheet] = useState<null | 'expected' | 'tills' | 'more' | 'save'>(null);

  useEffect(() => setCounting(!blank), [blank, setCounting]);

  const openQty = (d: Denomination) => {
    setDigits(draft.pieces[d.id] ? String(draft.pieces[d.id]) : '');
    setTyping({ kind: 'qty', id: d.id });
  };
  const commitQty = () => {
    if (typing?.kind === 'qty') data.setQty(typing.id, parseQty(digits));
    if (typing?.kind === 'custom') data.setCustom({ id: typing.id, label: typing.label, amount: Number(digits || '0') });
  };
  const typingDen = typing?.kind === 'qty' ? rows.find((d) => d.id === typing.id) ?? null : null;
  const nextDen = typingDen ? rows[rows.indexOf(typingDen) + 1] ?? null : null;

  const deposit = async () => {
    setSheet(null);
    if (canUseDeposit(isPro) || (await askPro('deposit'))) onDeposit();
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <Press onPress={() => setSheet('tills')} style={styles.tillButton} pressedStyle={{ opacity: 0.6 }} accessibilityRole="button" accessibilityLabel={`Till: ${till.name}. ${CURRENCIES[draft.currency].name}`} accessibilityHint="Pick another till">
          <Text style={[type.title, { color: theme.ink, fontSize: 26, lineHeight: 30, flexShrink: 1 }]} numberOfLines={1}>
            {till.name}
          </Text>
          <Glyph name="down" size={20} color={theme.inkSoft} weight={2.2} />
        </Press>
        <RoundButton theme={theme} glyph="expected" label="Expected amount" onPress={() => setSheet('expected')} size={TOUCH} />
        <RoundButton theme={theme} glyph="more" label="More" onPress={() => setSheet('more')} size={TOUCH} />
      </View>
      <Text style={[type.small, styles.subhead, { color: theme.inkSoft }]}>
        {draft.savedId ? `Editing a saved count, ${formatDate(draft.day ?? isoDay(Date.now()), locale.tag)}` : `${formatDate(isoDay(Date.now()), locale.tag)}, ${draft.currency}`}
      </Text>

      <FlatList
        data={rows}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: d }) => (
          <CountRow
            theme={theme}
            d={d}
            qty={draft.pieces[d.id] ?? 0}
            amount={totals.rows[d.id] ?? 0}
            money={money}
            locale={locale.tag}
            onMinus={() => {
              stepHaptic();
              data.bump(d.id, -1);
            }}
            onPlus={() => {
              stepHaptic();
              data.bump(d.id, 1);
            }}
            onType={() => openQty(d)}
            onLong={() => setPack(d)}
          />
        )}
        ListFooterComponent={
          <View style={{ gap: space.s, marginTop: customRows.length ? space.s : 0 }}>
            {customRows.map((c) => (
              <Press
                key={c.id}
                onPress={() => {
                  setDigits(c.amount ? String(c.amount) : '');
                  setTyping({ kind: 'custom', id: c.id, label: c.label });
                }}
                style={[styles.row, { backgroundColor: theme.tile, borderColor: theme.edge }]}
                pressedStyle={{ backgroundColor: theme.raised }}
                accessibilityRole="button"
                accessibilityLabel={`${c.label}, ${money(c.amount)}`}
                accessibilityHint="Type the amount"
              >
                <View style={[styles.otherTile, { borderColor: theme.inkSoft }]}>
                  <Glyph name="sheet" size={22} color={theme.inkSoft} weight={1.9} />
                </View>
                <Text style={[type.strong, { color: theme.ink, flex: 1 }]} numberOfLines={1}>
                  {c.label}
                </Text>
                <Text style={[type.figure, { color: c.amount ? theme.ink : theme.inkFaint }]}>{money(c.amount)}</Text>
              </Press>
            ))}
            <Press onPress={onRows} style={styles.rowsLink} accessibilityRole="button" pressedStyle={{ opacity: 0.6 }}>
              <Glyph name="rows" size={20} color={theme.inkSoft} weight={2} />
              <Text style={[type.small, { color: theme.inkSoft, fontWeight: '600' }]}>Hide rows or add your own</Text>
            </Press>
          </View>
        }
      />

      <View style={[styles.foot, { backgroundColor: theme.tile, borderTopColor: theme.rule }]}>
        <View style={styles.totalHead}>
          <Text style={[type.label, { color: theme.inkSoft }]}>Total</Text>
          <Press onPress={() => setSheet('expected')} accessibilityRole="button" style={styles.expectedLink} pressedStyle={{ opacity: 0.6 }}>
            <Text style={[type.small, tabular, { color: theme.inkSoft, fontWeight: '600' }]}>{expected == null ? 'Add expected amount' : `Expected ${money(expected)}`}</Text>
            <Glyph name="chevron" size={14} color={theme.inkSoft} weight={2.2} />
          </Press>
        </View>
        <Text style={[type.total, { color: theme.ink }]} numberOfLines={1} adjustsFontSizeToFit accessibilityLabel={`Total ${money(totals.total)}`} accessibilityLiveRegion="polite">
          {money(totals.total)}
        </Text>
        {diff != null && !blank ? <DiffLine theme={theme} diff={diff} money={money} /> : null}
        <MainButton theme={theme} label="Save count" onPress={() => setSheet('save')} disabled={blank} />
      </View>

      {/* Typing a number of pieces, or a custom row's amount. */}
      <Sheet theme={theme} visible={typing != null} onClose={() => setTyping(null)} title={typingDen ? typingDen.name : typing?.kind === 'custom' ? typing.label : ''} scroll={false}>
        {typing?.kind === 'qty' && typingDen ? (
          <Keypad
            theme={theme}
            digits={digits}
            onDigits={setDigits}
            maxDigits={String(MAX_QTY).length}
            display={formatQty(parseQty(digits), locale.tag)}
            sub={`= ${money(typingDen.value * parseQty(digits))}`}
            head={
              <View style={styles.keypadHead}>
                <CashTile theme={theme} d={typingDen} />
                <Fine theme={theme} style={{ flex: 1 }}>
                  How many {typingDen.kind === 'note' ? 'notes' : 'coins'}. Long press a row to add a {packWord(draft.currency, typingDen)}.
                </Fine>
              </View>
            }
            onDone={() => {
              commitQty();
              setTyping(null);
            }}
            onNext={
              nextDen
                ? () => {
                    commitQty();
                    setDigits(draft.pieces[nextDen.id] ? String(draft.pieces[nextDen.id]) : '');
                    setTyping({ kind: 'qty', id: nextDen.id });
                  }
                : undefined
            }
            nextLabel={nextDen ? `Next ${nextDen.tile}` : undefined}
          />
        ) : typing?.kind === 'custom' ? (
          <Keypad
            theme={theme}
            digits={digits}
            onDigits={setDigits}
            maxDigits={10}
            display={money(Number(digits || '0'))}
            sub="Type the amount, cents last"
            onDone={() => {
              commitQty();
              setTyping(null);
            }}
          />
        ) : null}
      </Sheet>

      {/* Long press: a roll, bag or strap at the standard count. */}
      <Sheet theme={theme} visible={pack != null} onClose={() => setPack(null)} title={pack?.name}>
        {pack ? (
          <View style={{ gap: space.m, paddingBottom: space.l }}>
            <Tray theme={theme}>
              {pack.pack ? (
                <Slot
                  theme={theme}
                  first
                  glyph={pack.kind === 'note' ? 'strap' : 'roll'}
                  label={`Add a ${packWord(draft.currency, pack)}`}
                  sub={`${pack.pack} ${pack.kind === 'note' ? 'notes' : 'coins'}, ${money(pack.pack * pack.value)}`}
                  onPress={() => {
                    packHaptic();
                    data.addPackTo(pack.id);
                    setPack(null);
                  }}
                  right={<Glyph name="plus" size={22} color={theme.ink} weight={2.2} />}
                />
              ) : (
                <Slot theme={theme} first label={`No standard ${packWord(draft.currency, pack)} for ${pack.name.toLowerCase()}`} sub="Type the number of pieces instead." />
              )}
              <Slot
                theme={theme}
                glyph="edit"
                label="Type the number"
                onPress={() => {
                  setPack(null);
                  openQty(pack);
                }}
              />
              <Slot
                theme={theme}
                glyph="trash"
                label="Clear this row"
                onPress={() => {
                  data.setQty(pack.id, 0);
                  setPack(null);
                }}
                right={<View />}
              />
            </Tray>
            <Fine theme={theme}>Now {formatQty(draft.pieces[pack.id] ?? 0, locale.tag)} {pack.kind === 'note' ? 'notes' : 'coins'}, {money((draft.pieces[pack.id] ?? 0) * pack.value)}.</Fine>
          </View>
        ) : null}
      </Sheet>

      <Sheet theme={theme} visible={sheet === 'expected'} onClose={() => setSheet(null)} title="Expected amount">
        <ExpectedEditor
          theme={theme}
          value={draft.expected}
          tillFloat={till.float}
          money={money}
          onDone={(e) => {
            data.setExpected(e);
            setSheet(null);
          }}
        />
      </Sheet>

      <Sheet theme={theme} visible={sheet === 'tills'} onClose={() => setSheet(null)} title="Which till">
        <View style={{ gap: space.m, paddingBottom: space.l }}>
          <Tray theme={theme}>
            {data.tills.map((t, i) => (
              <Slot
                key={t.id}
                theme={theme}
                first={i === 0}
                glyph="till"
                label={t.name}
                sub={`${CURRENCIES[t.currency].name}${t.float ? `, float ${formatMoney(t.float, t.currency, locale.tag)}` : ''}`}
                onPress={() => {
                  if (t.id === till.id) return setSheet(null);
                  const go = () => {
                    data.switchTill(t.id);
                    setSheet(null);
                  };
                  if (!blank && t.currency !== draft.currency) Alert.alert('Clear the count on screen?', `${t.name} counts in ${CURRENCIES[t.currency].name.toLowerCase()}s. The count on screen will be cleared.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear and switch', style: 'destructive', onPress: go }]);
                  else go();
                }}
                right={t.id === till.id ? <Glyph name="check" size={22} color={theme.ink} weight={2.4} /> : <View />}
              />
            ))}
          </Tray>
          <Slot
            theme={theme}
            first
            glyph="plus"
            label="Add or rename tills"
            onPress={() => {
              setSheet(null);
              onTills();
            }}
          />
        </View>
      </Sheet>

      <Sheet theme={theme} visible={sheet === 'more'} onClose={() => setSheet(null)} title="This count">
        <View style={{ paddingBottom: space.l }}>
          <Tray theme={theme}>
            <Slot theme={theme} first glyph="expected" label="Expected amount" sub={expected == null ? 'What the till should hold' : money(expected)} onPress={() => setSheet('expected')} />
            <Slot theme={theme} glyph="deposit" label="Deposit helper" sub="What to bank and what to leave as the float" onPress={deposit} right={canUseDeposit(isPro) ? undefined : <Glyph name="lock" size={18} color={theme.inkFaint} />} />
            <Slot
              theme={theme}
              glyph="rows"
              label="Rows on this screen"
              sub="Hide notes and coins you never use, add checks or vouchers"
              onPress={() => {
                setSheet(null);
                onRows();
              }}
            />
            <Slot
              theme={theme}
              glyph="trash"
              tone="danger"
              label={draft.savedId ? 'Stop editing' : 'Clear the count'}
              sub={draft.savedId ? 'The saved count stays as it was saved' : undefined}
              onPress={() => {
                setSheet(null);
                if (blank && !draft.savedId) return;
                Alert.alert(draft.savedId ? 'Stop editing this count?' : 'Clear the count?', draft.savedId ? 'Changes since it was saved are dropped.' : 'Every row goes back to zero.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: draft.savedId ? 'Stop editing' : 'Clear', style: 'destructive', onPress: data.clearDraft },
                ]);
              }}
              right={<View />}
            />
          </Tray>
        </View>
      </Sheet>

      <Sheet theme={theme} visible={sheet === 'save'} onClose={() => setSheet(null)} title={draft.savedId ? 'Save changes' : 'Save count'}>
        <SaveForm
          theme={theme}
          key={sheet === 'save' ? 'open' : 'closed'}
          total={money(totals.total)}
          diff={diff}
          money={money}
          tills={data.tills.filter((t) => t.currency === draft.currency)}
          tillId={till.id}
          locale={locale.tag}
          initialName={draft.name}
          initialNote={draft.note}
          initialDay={draft.day}
          onSave={(m) => {
            setSheet(null);
            onSave(m);
          }}
        />
      </Sheet>
    </View>
  );
}

function CountRow({ theme, d, qty, amount, money, locale, onMinus, onPlus, onType, onLong }: { theme: Theme; d: Denomination; qty: number; amount: number; money: (m: number) => string; locale: string; onMinus: () => void; onPlus: () => void; onType: () => void; onLong: () => void }) {
  return (
    <Press
      onLongPress={onLong}
      delayLongPress={350}
      style={[styles.row, { backgroundColor: theme.tile, borderColor: theme.edge }]}
      pressedStyle={{ backgroundColor: theme.tile }}
      accessible={false}
    >
      <CashTile theme={theme} d={d} />
      <View style={styles.rowMid} accessible accessibilityLabel={`${d.name}, ${money(amount)}`}>
        <Text style={[type.small, { color: theme.inkSoft }]} numberOfLines={1}>
          {d.name}
        </Text>
        <Text style={[type.figure, { color: qty ? theme.ink : theme.inkFaint, fontSize: 18, lineHeight: 23 }]} numberOfLines={1} adjustsFontSizeToFit>
          {money(amount)}
        </Text>
      </View>
      <Press onPress={onMinus} disabled={!qty} style={[styles.step, { backgroundColor: theme.surface, borderColor: theme.edge, opacity: qty ? 1 : 0.4 }]} pressedStyle={{ backgroundColor: theme.raised }} accessibilityRole="button" accessibilityLabel={`One less, ${d.name}`}>
        <Glyph name="minus" size={26} color={theme.ink} weight={2.6} />
      </Press>
      <Press
        onPress={onType}
        onLongPress={onLong}
        style={[styles.qty, { borderColor: qty ? theme.ink : theme.rule }]}
        pressedStyle={{ backgroundColor: theme.raised }}
        accessibilityRole="button"
        accessibilityLabel={`${d.name}: ${qty} ${d.kind === 'note' ? 'notes' : 'coins'}`}
        accessibilityHint="Type the number. Long press to add a roll or strap."
      >
        <Text style={[type.figure, { color: qty ? theme.ink : theme.inkFaint, fontSize: 24 }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
          {formatQty(qty, locale)}
        </Text>
      </Press>
      <Press onPress={onPlus} style={[styles.step, { backgroundColor: theme.surface, borderColor: theme.edge }]} pressedStyle={{ backgroundColor: theme.raised }} accessibilityRole="button" accessibilityLabel={`One more, ${d.name}`}>
        <Glyph name="plus" size={26} color={theme.ink} weight={2.6} />
      </Press>
    </Press>
  );
}

/** Expected: an amount, or a starting float plus sales. Each figure is typed on the keypad. */
function ExpectedEditor({ theme, value, tillFloat, money, onDone }: { theme: Theme; value: Expected; tillFloat: number; money: (m: number) => string; onDone: (e: Expected) => void }) {
  const [e, setE] = useState<Expected>(() => ({ ...value, mode: value.mode === 'none' ? 'amount' : value.mode, float: value.mode === 'floatSales' ? value.float : tillFloat }));
  const [field, setField] = useState<null | 'amount' | 'float' | 'sales'>(null);
  const [digits, setDigits] = useState('');
  if (field) {
    return (
      <View style={{ paddingBottom: space.s }}>
        <Keypad
          theme={theme}
          digits={digits}
          onDigits={setDigits}
          maxDigits={10}
          display={money(Number(digits || '0'))}
          sub={field === 'amount' ? 'What the till should hold' : field === 'float' ? 'Starting float' : 'Cash sales'}
          onDone={() => {
            setE({ ...e, [field]: Number(digits || '0') });
            setField(null);
          }}
        />
      </View>
    );
  }
  const slot = (f: 'amount' | 'float' | 'sales', label: string, first = false) => (
    <Slot
      theme={theme}
      first={first}
      label={label}
      onPress={() => {
        setDigits(e[f] ? String(e[f]) : '');
        setField(f);
      }}
      right={<Text style={[type.figure, { color: e[f] ? theme.ink : theme.inkFaint }]}>{money(e[f])}</Text>}
    />
  );
  const total = expectedAmount(e) ?? 0;
  return (
    <View style={{ gap: space.l, paddingBottom: space.l }}>
      <Fine theme={theme}>What the till should hold. The count then shows how far over or short it is.</Fine>
      <Choice<Exclude<ExpectedMode, 'none'>>
        theme={theme}
        label="How"
        options={[
          { id: 'amount', label: 'Amount' },
          { id: 'floatSales', label: 'Float + sales' },
        ]}
        value={e.mode === 'floatSales' ? 'floatSales' : 'amount'}
        onChange={(mode) => setE({ ...e, mode })}
      />
      <Tray theme={theme}>
        {e.mode === 'floatSales' ? (
          <>
            {slot('float', 'Starting float', true)}
            {slot('sales', 'Cash sales')}
            <Slot theme={theme} label="Expected" right={<Text style={[type.figure, { color: theme.ink }]}>{money(total)}</Text>} />
          </>
        ) : (
          slot('amount', 'Expected', true)
        )}
      </Tray>
      <MainButton theme={theme} label="Done" onPress={() => onDone(e)} />
      {value.mode !== 'none' ? (
        <Press onPress={() => onDone({ mode: 'none', amount: 0, float: 0, sales: 0 })} accessibilityRole="button" style={styles.textLink}>
          <Text style={[type.body, { color: theme.inkSoft, textAlign: 'center', fontWeight: '600' }]}>No expected amount</Text>
        </Press>
      ) : null}
    </View>
  );
}

function SaveForm({
  theme,
  total,
  diff,
  money,
  tills,
  tillId,
  locale,
  initialName,
  initialNote,
  initialDay,
  onSave,
}: {
  theme: Theme;
  total: string;
  diff: number | null;
  money: (m: number) => string;
  tills: { id: string; name: string }[];
  tillId: string;
  locale: string;
  initialName: string;
  initialNote: string;
  initialDay: string | null;
  onSave: (m: SaveMeta) => void;
}) {
  const today = isoDay(Date.now());
  const yesterday = addDays(today, -1);
  const [day, setDay] = useState(initialDay ?? today);
  const [till, setTill] = useState(tillId);
  const tillName = tills.find((t) => t.id === till)?.name ?? '';
  const [name, setName] = useState(initialName);
  const [note, setNote] = useState(initialNote);
  const dayChoices = [
    { id: today, label: 'Today' },
    { id: yesterday, label: 'Yesterday' },
    ...(day !== today && day !== yesterday ? [{ id: day, label: formatDate(day, locale) }] : []),
  ];
  return (
    <View style={{ gap: space.l, paddingBottom: space.l }}>
      <View style={styles.saveTotal}>
        <Text style={[type.total, { color: theme.ink, fontSize: 36, lineHeight: 42 }]}>{total}</Text>
        {diff != null ? <DiffLine theme={theme} diff={diff} money={money} size="small" /> : null}
      </View>
      <View>
        <SectionHead theme={theme}>Name</SectionHead>
        <TextBox theme={theme} value={name} onChangeText={setName} placeholder={defaultCountName(tillName)} maxLength={60} returnKeyType="done" accessibilityLabel="Name" />
      </View>
      <View>
        <SectionHead theme={theme}>Date</SectionHead>
        <Choice theme={theme} label="Date" options={dayChoices} value={day} onChange={setDay} />
      </View>
      {tills.length > 1 ? (
        <View>
          <SectionHead theme={theme}>Till</SectionHead>
          <Choice theme={theme} label="Till" options={tills.map((t) => ({ id: t.id, label: t.name }))} value={till} onChange={setTill} />
        </View>
      ) : null}
      <View>
        <SectionHead theme={theme}>Note</SectionHead>
        <TextBox theme={theme} value={note} onChangeText={setNote} placeholder="Optional, like who counted or a refund" multiline maxLength={500} style={{ minHeight: 84, paddingTop: space.m, textAlignVertical: 'top' }} accessibilityLabel="Note" />
      </View>
      <MainButton theme={theme} label="Save count" onPress={() => onSave({ name: name.trim() || defaultCountName(tillName), note, day, tillId: till })} />
    </View>
  );
}


const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.l, paddingRight: space.xs, minHeight: TOUCH },
  tillButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: TOUCH },
  subhead: { paddingHorizontal: space.l, marginTop: -space.xs, marginBottom: space.s },
  list: { paddingHorizontal: space.m, paddingBottom: space.l, gap: space.s },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 68, paddingLeft: space.s, paddingRight: space.s, paddingVertical: space.s, borderRadius: radius.large, borderWidth: 1 },
  rowMid: { flex: 1, minWidth: 0 },
  step: { width: TOUCH, height: TOUCH, borderRadius: radius.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 64, height: TOUCH, borderRadius: radius.small, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.s },
  otherTile: { width: 56, height: 34, borderRadius: 5, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  rowsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s, minHeight: 48 },
  foot: { borderTopWidth: 1, paddingHorizontal: space.l, paddingTop: space.m, paddingBottom: space.m, gap: space.s },
  totalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  expectedLink: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  keypadHead: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  textLink: { minHeight: 48, justifyContent: 'center' },
  saveTotal: { gap: space.xs },
});
