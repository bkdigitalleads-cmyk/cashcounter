import { useColorScheme } from 'react-native';

/**
 * "The count tray." The app is the insert of a cash drawer at closing
 * time: a cool steel tray, white compartments, one per note and coin,
 * each labeled in heavy figures you can read under a bad light with one
 * thumb. Two colors carry meaning and nothing else does:
 *  - accent, deposit-slip blue: the primary action on a screen (Save count,
 *    Continue, Share)
 *  - flag, signal amber: over or short, always with the words beside it
 * Everything else is ink on white, with high contrast. Dark follows the
 * system: the tray goes to near-black, compartments to graphite, and the
 * figures stay bright.
 */
export interface Theme {
  /** The tray: the screen background. */
  bg: string;
  /** A compartment: rows, sheets, panels. */
  tile: string;
  /** Inputs and quiet buttons. */
  surface: string;
  /** One step up: pressed rows, wells, unpicked choices. */
  raised: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  /** Hairlines between rows. */
  rule: string;
  /** The 1 px edge around panels and sheets. */
  edge: string;
  /** The primary action. Nothing else uses it. */
  accent: string;
  onAccent: string;
  /** Over or short. Nothing else uses it. */
  flag: string;
  onFlag: string;
  /** A light wash of the flag behind the difference line. */
  flagWash: string;
  /** A picked choice: solid ink, not the accent. */
  picked: string;
  onPicked: string;
  danger: string;
  /** The count sheet's page: white in both themes, as it prints. */
  sheet: string;
  scrim: string;
  isDark: boolean;
}

export const lightTheme: Theme = {
  bg: '#E9ECEF',
  tile: '#FFFFFF',
  surface: '#F5F6F8',
  raised: '#DCE0E5',
  ink: '#0C0E11',
  inkSoft: '#434952',
  inkFaint: '#757C86',
  rule: '#D6DAE0',
  edge: 'rgba(12, 14, 17, 0.14)',
  accent: '#1E4FD8',
  onAccent: '#FFFFFF',
  flag: '#A93C00',
  onFlag: '#FFFFFF',
  flagWash: '#FBEADF',
  picked: '#0C0E11',
  onPicked: '#FFFFFF',
  danger: '#B42318',
  sheet: '#FFFFFF',
  scrim: 'rgba(8, 10, 14, 0.45)',
  isDark: false,
};

export const darkTheme: Theme = {
  bg: '#0B0D10',
  tile: '#171A1F',
  surface: '#12151A',
  raised: '#262B32',
  ink: '#F3F5F8',
  inkSoft: '#B4BAC3',
  inkFaint: '#858C96',
  rule: '#2A3038',
  edge: 'rgba(255, 255, 255, 0.10)',
  accent: '#7EA3FF',
  onAccent: '#06142E',
  flag: '#FFA45C',
  onFlag: '#2A1200',
  flagWash: '#33200F',
  picked: '#F3F5F8',
  onPicked: '#0B0D10',
  danger: '#FF8A80',
  sheet: '#FFFFFF',
  scrim: 'rgba(0, 0, 0, 0.6)',
  isDark: true,
};

/** Follows the system: light unless the phone is in dark mode. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

/**
 * Corners: compartments are rounded like a molded tray.
 *  - large (14): panels, sheets, the main button
 *  - small (10): rows' buttons, inputs, choices
 *  - round: circles (coin tiles, radio dots)
 */
export const radius = { large: 14, small: 10, round: 999 };

/** The spacing scale. Every margin, padding and gap is one of these. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

/**
 * Barlow Tab (Barlow, SIL OFL, with its tabular figures made the default by
 * store/tabular-fonts.py): every figure is the same width, so a column of
 * amounts never jumps as it changes. Used for titles, labels, tiles and
 * every number. Sentences people read stay in the system font, which
 * follows Dynamic Type.
 */
export const fonts = {
  regular: 'CC-Regular',
  medium: 'CC-Medium',
  semibold: 'CC-SemiBold',
  bold: 'CC-Bold',
};

/**
 * One type scale:
 *  - total 44: the running total (bold figures)
 *  - title 30: screen titles and onboarding lines
 *  - figure 22: a row's pieces and amounts
 *  - body 17: rows, fields, text (system)
 *  - small 14: secondary lines
 *  - label 13: section heads, capitals
 *  - button 18: the main button
 */
export const type = {
  total: { fontFamily: fonts.bold, fontSize: 44, lineHeight: 50 },
  title: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 35 },
  figure: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 },
  body: { fontSize: 17, lineHeight: 23 },
  strong: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  small: { fontSize: 14, lineHeight: 19 },
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase' as const },
  button: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, letterSpacing: 0.3 },
};

/** Numbers: Barlow Tab, whose figures are all one width. */
export const tabular = { fontFamily: fonts.semibold, fontVariant: ['tabular-nums' as const] };

/** Every control a thumb uses on the count is at least this tall and wide. */
export const TOUCH = 56;
/** The main button is at least this tall. */
export const MAIN_BUTTON = 60;

/** UI font files for useFonts in App.tsx. The count sheet preview uses the same names. */
export const UI_FONT_FILES = {
  [fonts.regular]: require('../assets/fonts/BarlowTab-Regular.ttf'),
  [fonts.medium]: require('../assets/fonts/BarlowTab-Medium.ttf'),
  [fonts.semibold]: require('../assets/fonts/BarlowTab-SemiBold.ttf'),
  [fonts.bold]: require('../assets/fonts/BarlowTab-Bold.ttf'),
};
