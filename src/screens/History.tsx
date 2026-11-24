import React, { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useTheme, radius, space, Theme, type } from '../theme';
import { useData } from '../data';
import { useApp } from '../state';
import { groupByDay, showCountName } from '../history';
import type { SavedCount } from '../history';
import { visibleHistory } from '../gates';
import { formatDayHeading, formatMoney } from '../format';
import Glyph from '../ui/Glyph';
import { CoinMark, DiffLine } from '../ui/Cash';
import { Choice, Fine, Heading, PlainButton, Press, RoundButton, Tray } from '../ui/Kit';

/**
 * Saved counts by day, newest first: the till, the name, the total and
 * over or short. Tap one to open it, then reopen, duplicate, print or bank
 * it. The free plan shows the last three; older ones stay on the phone.
 */
export default function History({ onOpen, onExport }: { onOpen: (id: string) => void; onExport: () => void }) {
  const theme = useTheme();
  const data = useData();
  const { isPro, askPro } = useApp();
  const [tillFilter, setTillFilter] = useState<string>('all');
  const { shown, hidden } = useMemo(() => visibleHistory(isPro, data.counts), [isPro, data.counts]);
  const filtered = tillFilter === 'all' ? shown : shown.filter((c) => c.tillId === tillFilter);
  const sections = useMemo(() => groupByDay(filtered).map((g) => ({ title: g.day, data: g.counts })), [filtered]);
  const tillsUsed = useMemo(() => {
    const ids = new Set(data.counts.map((c) => c.tillId));
    return data.tills.filter((t) => ids.has(t.id));
  }, [data.counts, data.tills]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <Heading theme={theme} style={{ flex: 1 }}>
          History
        </Heading>
        {data.counts.length > 0 ? <RoundButton theme={theme} glyph="csv" label="Export CSV" onPress={onExport} size={56} /> : null}
      </View>
      {tillsUsed.length > 1 ? (
        <View style={{ paddingHorizontal: space.l, marginBottom: space.m }}>
          <Choice theme={theme} label="Till" options={[{ id: 'all', label: 'All' }, ...tillsUsed.slice(0, 3).map((t) => ({ id: t.id, label: t.name }))]} value={tillFilter} onChange={setTillFilter} />
        </View>
      ) : null}
      {data.counts.length === 0 ? (
        <View style={styles.empty}>
          <CoinMark theme={theme} />
          <Text style={[type.strong, { color: theme.ink, textAlign: 'center' }]}>No saved counts yet.</Text>
          <Fine theme={theme} style={{ textAlign: 'center' }}>
            Count the till and tap Save count. Each count lands here with its total and how far over or short it was.
          </Fine>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(c) => c.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <Text style={[type.label, styles.day, { color: theme.inkSoft }]} accessibilityRole="header">
              {formatDayHeading(section.title, data.locale.tag)}
            </Text>
          )}
          renderItem={({ item, index, section }) => <HistoryRow theme={theme} c={item} locale={data.locale.tag} first={index === 0} last={index === section.data.length - 1} onPress={() => onOpen(item.id)} />}
          ListFooterComponent={
            hidden > 0 ? (
              <Tray theme={theme} style={styles.more}>
                <Glyph name="lock" size={22} color={theme.inkSoft} />
                <Text style={[type.body, { color: theme.ink }]}>
                  {hidden === 1 ? '1 older count is' : `${hidden} older counts are`} kept on this iPhone. Pro shows every count you save.
                </Text>
                <PlainButton theme={theme} label="See Pro" onPress={() => askPro('save')} />
              </Tray>
            ) : null
          }
        />
      )}
    </View>
  );
}

function HistoryRow({ theme, c, locale, first, last, onPress }: { theme: Theme; c: SavedCount; locale: string; first: boolean; last: boolean; onPress: () => void }) {
  const money = (m: number) => formatMoney(m, c.currency, locale);
  return (
    <Press
      onPress={onPress}
      style={[styles.row, { backgroundColor: theme.tile, borderColor: theme.edge }, first && styles.rowFirst, last && styles.rowLast, !first && { borderTopWidth: 0 }]}
      pressedStyle={{ backgroundColor: theme.raised }}
      accessibilityRole="button"
      accessibilityLabel={`${c.tillName}, ${showCountName(c.name, c.tillName) ? `${c.name}, ` : ''}${money(c.total)}${c.diff == null ? '' : c.diff === 0 ? ', balanced' : c.diff < 0 ? `, short by ${money(-c.diff)}` : `, over by ${money(c.diff)}`}`}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.strong, { color: theme.ink }]} numberOfLines={1}>
          {c.tillName}
        </Text>
        {showCountName(c.name, c.tillName) ? (
          <Text style={[type.small, { color: theme.inkSoft }]} numberOfLines={1}>
            {c.name}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={[type.figure, { color: theme.ink }]}>{money(c.total)}</Text>
        {c.diff != null ? <DiffLine theme={theme} diff={c.diff} money={money} size="small" /> : <Text style={[type.small, { color: theme.inkFaint }]}>No expected amount</Text>}
      </View>
      <Glyph name="chevron" size={18} color={theme.inkFaint} weight={2} />
    </Press>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.l, paddingRight: space.xs, paddingTop: space.s, marginBottom: space.s },
  list: { paddingHorizontal: space.m, paddingBottom: space.xxl },
  day: { marginTop: space.l, marginBottom: space.s, marginLeft: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 72, paddingHorizontal: space.l, paddingVertical: space.m, borderWidth: 1 },
  rowFirst: { borderTopLeftRadius: radius.large, borderTopRightRadius: radius.large },
  rowLast: { borderBottomLeftRadius: radius.large, borderBottomRightRadius: radius.large },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.m, paddingHorizontal: space.xxl, paddingBottom: 80 },
  more: { marginTop: space.xl, padding: space.l, gap: space.m },
});
