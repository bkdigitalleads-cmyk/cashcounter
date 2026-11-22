/**
 * The component kit ("the count tray"). Everything tappable goes through
 * Press, so it shows a pressed state; anything a thumb uses on the count
 * is at least 56 points. The accent (deposit-slip blue) is on MainButton
 * only; the flag (signal amber) is on DiffLine only.
 *
 *   Press        a pressable with a pressed state
 *   MainButton   the one primary action on a screen, in the accent
 *   PlainButton  an outlined button in ink
 *   RoundButton  a glyph-only button, always labeled for VoiceOver
 *   Choice       a row of options, the picked one in solid ink
 *   Tray         a white compartment with a 1 px edge
 *   Slot         a row inside a Tray
 *   Heading      a screen title
 *   Fine         small secondary text
 *   SectionHead  capitals over a group
 *   TextBox      a text field
 *   Bar          the top bar of a screen over the tabs
 *   Toast        a short line for a few seconds
 *   Sheet        a sheet from the bottom over a dimmed tray
 */
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Pressable, PressableProps, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAIN_BUTTON, TOUCH, Theme, radius, space, type } from '../theme';
import Glyph, { GlyphName } from './Glyph';
import { MODAL_ANIMATION, tick } from './motion';

export function Press({
  style,
  pressedStyle,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; pressedStyle?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <Pressable {...rest} style={({ pressed }) => [style, pressed && (pressedStyle ?? { opacity: 0.55 })]}>
      {children}
    </Pressable>
  );
}

/** The primary action: the accent, full width, at least 60 points tall. One per screen. */
export function MainButton({
  theme,
  label,
  onPress,
  disabled = false,
  busy = false,
  hint,
  glyph,
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  hint?: string;
  glyph?: GlyphName;
}) {
  const off = disabled || busy;
  return (
    <Press
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: off, busy }}
      style={[styles.main, { backgroundColor: theme.accent, opacity: disabled ? 0.4 : 1 }]}
      pressedStyle={{ opacity: 0.84 }}
    >
      {busy ? (
        <ActivityIndicator color={theme.onAccent} />
      ) : (
        <View style={styles.row}>
          {glyph ? <Glyph name={glyph} size={22} color={theme.onAccent} weight={2.2} /> : null}
          <Text style={[type.button, { color: theme.onAccent }]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Press>
  );
}

/** An outlined button in ink. */
export function PlainButton({
  theme,
  label,
  onPress,
  glyph,
  disabled = false,
  tone = 'ink',
  grow = false,
  hint,
  tall = false,
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
  glyph?: GlyphName;
  disabled?: boolean;
  tone?: 'ink' | 'danger';
  grow?: boolean;
  hint?: string;
  tall?: boolean;
}) {
  const color = tone === 'danger' ? theme.danger : theme.ink;
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      style={[styles.plain, tall && { minHeight: TOUCH }, grow && { flex: 1 }, { backgroundColor: theme.tile, borderColor: tone === 'danger' ? theme.danger : theme.ink, opacity: disabled ? 0.4 : 1 }]}
      pressedStyle={{ backgroundColor: theme.raised }}
    >
      {glyph ? <Glyph name={glyph} size={20} color={color} weight={2} /> : null}
      <Text style={[type.button, { color, fontSize: 17 }]} maxFontSizeMultiplier={1.4} numberOfLines={1}>
        {label}
      </Text>
    </Press>
  );
}

/** A glyph-only button. Always has a label for VoiceOver. */
export function RoundButton({
  theme,
  glyph,
  label,
  onPress,
  disabled = false,
  color,
  size = 44,
  filled = false,
}: {
  theme: Theme;
  glyph: GlyphName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  size?: number;
  filled?: boolean;
}) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={[styles.round, { width: size, height: size, opacity: disabled ? 0.3 : 1 }, filled && { backgroundColor: theme.tile, borderColor: theme.edge, borderWidth: 1 }]}
      pressedStyle={{ backgroundColor: theme.raised }}
    >
      <Glyph name={glyph} size={Math.round(Math.min(size, 48) * 0.5)} color={color ?? theme.ink} weight={2} />
    </Press>
  );
}

/** A row of options; the picked one is solid ink. */
export function Choice<T extends string>({ theme, options, value, onChange, label }: { theme: Theme; options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <View style={[styles.choice, { backgroundColor: theme.raised }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Press
            key={o.id}
            onPress={() => {
              tick();
              onChange(o.id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            style={[styles.choiceItem, { backgroundColor: on ? theme.picked : 'transparent' }]}
            pressedStyle={{ opacity: 0.7 }}
          >
            <Text style={[type.strong, { color: on ? theme.onPicked : theme.ink, fontSize: 16 }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {o.label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

/** A white compartment with the 1 px edge. */
export function Tray({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.tray, { backgroundColor: theme.tile, borderColor: theme.edge }, style]}>{children}</View>;
}

/** A row inside a Tray. */
export function Slot({
  theme,
  label,
  sub,
  onPress,
  glyph,
  right,
  first = false,
  tone = 'ink',
  hint,
}: {
  theme: Theme;
  label: string;
  sub?: string;
  onPress?: () => void;
  glyph?: GlyphName;
  right?: React.ReactNode;
  first?: boolean;
  tone?: 'ink' | 'danger';
  hint?: string;
}) {
  const color = tone === 'danger' ? theme.danger : theme.ink;
  const body = (
    <>
      {glyph ? <Glyph name={glyph} size={22} color={color} weight={1.9} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color }]}>{label}</Text>
        {sub ? <Text style={[type.small, { color: theme.inkSoft }]}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Glyph name="chevron" size={18} color={theme.inkFaint} weight={2} /> : null)}
    </>
  );
  const st = [styles.slot, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }];
  if (!onPress) return <View style={st} accessible accessibilityLabel={sub ? `${label}. ${sub}` : label}>{body}</View>;
  return (
    <Press onPress={onPress} style={st} pressedStyle={{ backgroundColor: theme.raised }} accessibilityRole="button" accessibilityLabel={sub ? `${label}. ${sub}` : label} accessibilityHint={hint}>
      {body}
    </Press>
  );
}

export function Heading({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: any }) {
  return (
    <Text style={[type.title, { color: theme.ink }, style]} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
      {children}
    </Text>
  );
}

export function Fine({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: any }) {
  return <Text style={[type.small, { color: theme.inkSoft }, style]}>{children}</Text>;
}

/** Capitals over a group of controls. */
export function SectionHead({ theme, children, right }: { theme: Theme; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={[type.label, { color: theme.inkSoft, flex: 1 }]} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
        {children}
      </Text>
      {right}
    </View>
  );
}

/** A text field. */
export function TextBox({ theme, style, ...rest }: TextInputProps & { theme: Theme }) {
  return (
    <TextInput
      placeholderTextColor={theme.inkFaint}
      selectionColor={theme.accent}
      {...rest}
      style={[type.body, styles.field, { color: theme.ink, backgroundColor: theme.tile, borderColor: theme.inkFaint }, style]}
    />
  );
}

/** The top bar of a screen over the tabs: back or close on the left, a title, an optional action. */
export function Bar({ theme, title, onBack, closeGlyph = 'back', right }: { theme: Theme; title?: string; onBack?: () => void; closeGlyph?: GlyphName; right?: React.ReactNode }) {
  return (
    <View style={styles.bar}>
      <View style={styles.barSide}>{onBack ? <RoundButton theme={theme} glyph={closeGlyph} label={closeGlyph === 'close' ? 'Close' : 'Back'} onPress={onBack} size={48} /> : null}</View>
      {title ? (
        <Text style={[type.strong, styles.barTitle, { color: theme.ink }]} numberOfLines={1} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={[styles.barSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

/** A short line near the top for a few seconds ("Count saved."). */
export function Toast({ theme, text, top }: { theme: Theme; text: string | null; top: number }) {
  const fade = useRef(new Animated.Value(0)).current;
  const last = useRef(text);
  if (text) last.current = text;
  useEffect(() => {
    Animated.timing(fade, { toValue: text ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [text, fade]);
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { top: top + space.s, opacity: fade, backgroundColor: theme.ink }]} accessibilityLiveRegion="polite">
      <Text style={[type.strong, { color: theme.bg, textAlign: 'center', fontSize: 16 }]}>{last.current}</Text>
    </Animated.View>
  );
}

/** A sheet from the bottom over a dimmed tray. Fades in. Shrinks above the keyboard and scrolls. */
export function Sheet({ theme, visible, onClose, children, title, scroll = true }: { theme: Theme; visible: boolean; onClose: () => void; children: React.ReactNode; title?: string; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType={MODAL_ANIMATION} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={[styles.sheet, { backgroundColor: theme.bg, borderColor: theme.edge, paddingBottom: Math.max(insets.bottom, space.l) }]}>
          <View style={styles.sheetHead}>
            <Text style={[type.strong, { color: theme.ink, flex: 1, fontSize: 19 }]} accessibilityRole="header">
              {title ?? ''}
            </Text>
            <RoundButton theme={theme} glyph="close" label="Close" onPress={onClose} size={48} />
          </View>
          {scroll ? (
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  main: { minHeight: MAIN_BUTTON, borderRadius: radius.large, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  plain: { minHeight: 48, borderRadius: radius.small, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s, paddingHorizontal: space.l },
  round: { borderRadius: radius.round, alignItems: 'center', justifyContent: 'center' },
  choice: { flexDirection: 'row', borderRadius: radius.small, padding: 3, gap: 3 },
  choiceItem: { flex: 1, minHeight: 44, borderRadius: radius.small - 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.s },
  tray: { borderRadius: radius.large, borderWidth: 1, overflow: 'hidden' },
  slot: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: TOUCH, paddingHorizontal: space.l, paddingVertical: space.m },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginBottom: space.s, minHeight: 20 },
  field: { minHeight: TOUCH, borderRadius: radius.small, borderWidth: 1, paddingHorizontal: space.m },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH, paddingHorizontal: space.s },
  barSide: { minWidth: 96 },
  barTitle: { flex: 1, textAlign: 'center' },
  toast: { position: 'absolute', left: space.xl, right: space.xl, borderRadius: radius.small, paddingVertical: space.m, paddingHorizontal: space.l },
  sheet: { borderTopLeftRadius: radius.large + 4, borderTopRightRadius: radius.large + 4, borderWidth: 1, paddingHorizontal: space.l, paddingTop: space.s, maxHeight: '90%' },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH },
});
