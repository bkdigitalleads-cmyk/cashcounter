import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, TOUCH, space, type } from '../theme';
import Glyph, { GlyphName } from './Glyph';
import { Press } from './Kit';

export type Tab = 'count' | 'history' | 'settings';

const TABS: { id: Tab; label: string; glyph: GlyphName }[] = [
  { id: 'count', label: 'Count', glyph: 'count' },
  { id: 'history', label: 'History', glyph: 'history' },
  { id: 'settings', label: 'Settings', glyph: 'settings' },
];

/** The three places, along the bottom. The current one is in full ink with a bar over it, the rest faint. */
export default function TabBar({ theme, tab, onTab }: { theme: Theme; tab: Tab; onTab: (t: Tab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: theme.tile, borderTopColor: theme.rule, paddingBottom: Math.max(insets.bottom - space.s, space.xs) }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const on = t.id === tab;
        const color = on ? theme.ink : theme.inkFaint;
        return (
          <Press
            key={t.id}
            onPress={() => onTab(t.id)}
            style={styles.tab}
            pressedStyle={{ opacity: 0.6 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.label}
          >
            <View style={[styles.mark, { backgroundColor: on ? theme.ink : 'transparent' }]} />
            <Glyph name={t.glyph} size={26} color={color} weight={on ? 2.2 : 1.8} />
            <Text style={[type.label, styles.label, { color, letterSpacing: 0.4, textTransform: 'none', fontSize: 13 }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {t.label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1 },
  mark: { position: 'absolute', top: 0, height: 3, left: '32%', right: '32%', borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: TOUCH, gap: 2, paddingTop: space.s },
  label: { alignSelf: 'stretch', textAlign: 'center' },
});
