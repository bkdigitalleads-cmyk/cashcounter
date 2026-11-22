/**
 * The pieces only a cash count has:
 *
 *   CashTile   a note (a framed oblong) or a coin (a ringed disc) with its
 *              value lettered on it; drawn in the app's own style, never a
 *              picture of real money
 *   DiffLine   over, short or balanced, in words, in the one flag color
 *   Keypad     a large number pad for one thumb: pieces, or money typed
 *              from the right like a register (1, 2, 5, 0 is 12.50)
 *   SheetView  the count sheet page, drawn from the same operations as
 *              the PDF with the same fonts
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import type { Denomination } from '../currencies';
import { diffKind, diffWords } from '../count';
import type { FontKey, Page } from '../pdf/layout';
import { fonts, radius, space, tabular, Theme, TOUCH, type } from '../theme';
import Glyph from './Glyph';
import { MainButton, PlainButton, Press } from './Kit';
import { stepHaptic } from './motion';

export function CashTile({ theme, d, width = 56 }: { theme: Theme; d: Pick<Denomination, 'kind' | 'tile'>; width?: number }) {
  const long = d.tile.length;
  if (d.kind === 'coin') {
    const s = Math.round(width * 0.74);
    return (
      <View style={{ width, alignItems: 'center' }} accessible={false}>
        <View style={[styles.coin, { width: s, height: s, borderColor: theme.inkSoft, backgroundColor: theme.surface }]}>
          <View style={[styles.coinInner, { borderColor: theme.rule }]} />
          <Text style={[styles.tileText, { color: theme.ink, fontSize: long > 3 ? 12 : 14 }]} numberOfLines={1} maxFontSizeMultiplier={1}>
            {d.tile}
          </Text>
        </View>
      </View>
    );
  }
  const h = Math.round(width * 0.6);
  return (
    <View style={[styles.note, { width, height: h, borderColor: theme.inkSoft, backgroundColor: theme.surface }]} accessible={false}>
      <View style={[styles.noteFrame, { borderColor: theme.rule }]} />
      <Text style={[styles.tileText, { color: theme.ink, fontSize: long > 4 ? 13 : 16 }]} numberOfLines={1} maxFontSizeMultiplier={1}>
        {d.tile}
      </Text>
    </View>
  );
}

/** Over, short or balanced. `money` formats minor units in the count's currency. */
export function DiffLine({ theme, diff, money, size = 'large' }: { theme: Theme; diff: number; money: (minor: number) => string; size?: 'large' | 'small' }) {
  const k = diffKind(diff);
  const words = diffWords(diff, money);
  const big = size === 'large';
  if (k === 'even') {
    return (
      <View style={[styles.diff, !big && styles.diffSmall]} accessible accessibilityLabel={words}>
        <Glyph name="check" size={big ? 20 : 16} color={theme.ink} weight={2.4} />
        <Text style={[big ? type.figure : styles.diffSmallText, { color: theme.ink, fontSize: big ? 20 : 15 }]}>{words}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.diff, !big && styles.diffSmall, { backgroundColor: big ? theme.flagWash : 'transparent', borderColor: theme.flag, borderWidth: big ? 1.5 : 0 }]} accessible accessibilityLabel={words}>
      <View style={[styles.flagDot, { backgroundColor: theme.flag }, !big && { width: 8, height: 8 }]} />
      <Text style={[big ? type.figure : styles.diffSmallText, { color: theme.flag, fontSize: big ? 20 : 15 }]} numberOfLines={1}>
        {words}
      </Text>
    </View>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

/**
 * The number pad. `digits` is what has been typed. In money mode the
 * digits are cents, entered from the right.
 */
export function Keypad({
  theme,
  digits,
  onDigits,
  display,
  sub,
  head,
  onDone,
  onNext,
  nextLabel,
  maxDigits,
}: {
  theme: Theme;
  digits: string;
  onDigits: (d: string) => void;
  /** The big figure: "47" or "$12.50". */
  display: string;
  /** The line under it: "= $47.00". */
  sub?: string;
  head?: React.ReactNode;
  onDone: () => void;
  onNext?: () => void;
  nextLabel?: string;
  maxDigits: number;
}) {
  const press = (k: (typeof KEYS)[number]) => {
    stepHaptic();
    if (k === 'clear') return onDigits('');
    if (k === 'back') return onDigits(digits.slice(0, -1));
    if (digits.length >= maxDigits) return;
    onDigits((digits === '0' ? '' : digits) + k);
  };
  return (
    <View style={{ gap: space.m }}>
      {head}
      <View style={[styles.readout, { backgroundColor: theme.tile, borderColor: theme.edge }]} accessible accessibilityLiveRegion="polite" accessibilityLabel={sub ? `${display}, ${sub}` : display}>
        <Text style={[type.total, { color: theme.ink, fontSize: 40, lineHeight: 46 }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1}>
          {display}
        </Text>
        {sub ? <Text style={[type.figure, { color: theme.inkSoft, fontSize: 18 }]}>{sub}</Text> : null}
      </View>
      <View style={styles.keys}>
        {KEYS.map((k) => (
          <Press
            key={k}
            onPress={() => press(k)}
            onLongPress={k === 'back' ? () => onDigits('') : undefined}
            accessibilityRole="button"
            accessibilityLabel={k === 'clear' ? 'Clear' : k === 'back' ? 'Delete' : k}
            style={[styles.key, { backgroundColor: k === 'clear' || k === 'back' ? theme.raised : theme.tile, borderColor: theme.edge }]}
            pressedStyle={{ backgroundColor: theme.raised }}
          >
            {k === 'back' ? (
              <Glyph name="backspace" size={28} color={theme.ink} weight={2} />
            ) : k === 'clear' ? (
              <Text style={[type.button, { color: theme.ink }]}>Clear</Text>
            ) : (
              <Text style={[styles.keyText, { color: theme.ink }]} maxFontSizeMultiplier={1.2}>
                {k}
              </Text>
            )}
          </Press>
        ))}
      </View>
      <View style={styles.keyFoot}>
        {onNext ? (
          <View style={{ flex: 1 }}>
            <PlainButton theme={theme} label={nextLabel ?? 'Next'} onPress={onNext} glyph="down" tall />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <MainButton theme={theme} label="Done" onPress={onDone} />
        </View>
      </View>
    </View>
  );
}

const FONT_FOR: Record<FontKey, string> = { regular: fonts.regular, medium: fonts.medium, bold: fonts.bold };

/** One page of the count sheet as it will print. White paper in both themes. */
export function SheetView({ page, width, label }: { page: Page; width: number; label: string }) {
  const height = (page.height / page.width) * width;
  return (
    <View style={{ width, height, backgroundColor: '#FFFFFF' }} accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={width} height={height} viewBox={`0 0 ${page.width} ${page.height}`}>
        <G>
          {page.ops.map((op, i) => {
            if (op.k === 'text')
              return (
                <SvgText key={i} x={op.x} y={op.y} fontFamily={FONT_FOR[op.font]} fontSize={op.size} fill={op.color}>
                  {op.text}
                </SvgText>
              );
            if (op.k === 'rect') return <Rect key={i} x={op.x} y={op.y} width={op.w} height={op.h} fill={op.fill ?? 'none'} stroke={op.stroke} strokeWidth={op.stroke ? op.lw ?? 1 : 0} />;
            return <Line key={i} x1={op.x1} y1={op.y1} x2={op.x2} y2={op.y2} stroke={op.color} strokeWidth={op.lw} />;
          })}
        </G>
      </Svg>
    </View>
  );
}

/** A coin's ring, for the empty state and onboarding. */
export function CoinMark({ theme, size = 56 }: { theme: Theme; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Circle cx={28} cy={28} r={25} stroke={theme.inkSoft} strokeWidth={2.5} fill={theme.surface} />
      <Circle cx={28} cy={28} r={19} stroke={theme.rule} strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  note: { borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  noteFrame: { position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: 3, borderWidth: 1 },
  coin: { borderRadius: radius.round, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  coinInner: { position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: radius.round, borderWidth: 1 },
  tileText: { fontFamily: fonts.bold, ...{ fontVariant: tabular.fontVariant } },
  diff: { flexDirection: 'row', alignItems: 'center', gap: space.s, borderRadius: radius.small, paddingHorizontal: space.m, minHeight: 44, alignSelf: 'flex-start' },
  diffSmall: { minHeight: 0, paddingHorizontal: 0, gap: space.xs },
  diffSmallText: { fontFamily: fonts.semibold },
  flagDot: { width: 12, height: 12, borderRadius: radius.round },
  readout: { borderRadius: radius.large, borderWidth: 1, alignItems: 'flex-end', paddingHorizontal: space.l, paddingVertical: space.m },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  key: { width: '31.6%', flexGrow: 1, minHeight: TOUCH + 6, borderRadius: radius.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 36 },
  keyFoot: { flexDirection: 'row', gap: space.s },
});
