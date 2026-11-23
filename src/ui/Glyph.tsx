import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * The app's own glyphs, drawn on a 24 grid with round ends and a firm line
 * that holds up in bad light. No icon pack. The tab glyphs: count (a stack
 * of coins beside a note), history (a list with a clock), settings (two
 * sliders).
 */
export type GlyphName =
  | 'count'
  | 'history'
  | 'settings'
  | 'close'
  | 'back'
  | 'check'
  | 'plus'
  | 'minus'
  | 'chevron'
  | 'down'
  | 'share'
  | 'print'
  | 'files'
  | 'trash'
  | 'copy'
  | 'edit'
  | 'deposit'
  | 'expected'
  | 'sheet'
  | 'csv'
  | 'till'
  | 'roll'
  | 'strap'
  | 'eye'
  | 'eyeOff'
  | 'backspace'
  | 'star'
  | 'undo'
  | 'more'
  | 'date'
  | 'lock'
  | 'rows';

const D: Record<GlyphName, string> = {
  count: 'M3.5 7.5h11v8h-11zM6.5 11.5h5M17.5 19.5c-1.9 0-3.5-.6-3.5-1.4v-2.2M21 15.9v2.2c0 .8-1.6 1.4-3.5 1.4M17.5 14.5c-1.9 0-3.5-.6-3.5-1.4s1.6-1.4 3.5-1.4 3.5.6 3.5 1.4-1.6 1.4-3.5 1.4zM14 13.1v2.8c0 .8 1.6 1.4 3.5 1.4s3.5-.6 3.5-1.4v-2.8',
  history: 'M4.5 6.5h8M4.5 11.5h5M4.5 16.5h5M16.5 20.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM16.5 14v2.2l1.6 1.2',
  settings: 'M4 8h9M17 8h3M4 16h3M11 16h9M15 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM9 18.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  back: 'M14.5 5.5L8 12l6.5 6.5',
  check: 'M5 12.5l4.2 4.2L19 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chevron: 'M9.5 6.5L15 12l-5.5 5.5',
  down: 'M6.5 9.5L12 15l5.5-5.5',
  share: 'M12 14.5V4M8 7.5L12 3.8l4 3.7M7.5 10.5H6.6c-.9 0-1.6.7-1.6 1.6v6.8c0 .9.7 1.6 1.6 1.6h10.8c.9 0 1.6-.7 1.6-1.6v-6.8c0-.9-.7-1.6-1.6-1.6h-.9',
  print: 'M7.5 9V4.5h9V9M7.5 16.5H5.6c-.9 0-1.6-.7-1.6-1.6v-4.3c0-.9.7-1.6 1.6-1.6h12.8c.9 0 1.6.7 1.6 1.6v4.3c0 .9-.7 1.6-1.6 1.6h-1.9M7.5 13.5h9v6h-9z',
  files: 'M4 7.1c0-.9.7-1.6 1.6-1.6h3.6l1.8 2h7.4c.9 0 1.6.7 1.6 1.6v8.8c0 .9-.7 1.6-1.6 1.6H5.6c-.9 0-1.6-.7-1.6-1.6V7.1zM12 10.5v5.5M9.5 13.5L12 16l2.5-2.5',
  trash: 'M5 7h14M10 7V5.4c0-.5.4-.9.9-.9h2.2c.5 0 .9.4.9.9V7M7 7l.8 11.4c.1.9.8 1.6 1.7 1.6h5c.9 0 1.6-.7 1.7-1.6L17 7',
  copy: 'M9 8.5V6.1c0-.9.7-1.6 1.6-1.6h7.3c.9 0 1.6.7 1.6 1.6v7.3c0 .9-.7 1.6-1.6 1.6H15.5M6.1 9h7.3c.9 0 1.6.7 1.6 1.6v7.3c0 .9-.7 1.6-1.6 1.6H6.1c-.9 0-1.6-.7-1.6-1.6v-7.3C4.5 9.7 5.2 9 6.1 9z',
  edit: 'M14.5 6.5l3 3M5 19l1-4L15.8 5.2c.6-.6 1.5-.6 2.1 0l.9.9c.6.6.6 1.5 0 2.1L9 18l-4 1z',
  deposit: 'M12 3.5v9M8.5 9l3.5 3.5L15.5 9M4 14.5h4l1.5 2.5h5l1.5-2.5h4v4c0 .9-.7 1.6-1.6 1.6H5.6c-.9 0-1.6-.7-1.6-1.6v-4z',
  expected: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  sheet: 'M13.5 3.5H7.1c-.9 0-1.6.7-1.6 1.6v13.8c0 .9.7 1.6 1.6 1.6h9.8c.9 0 1.6-.7 1.6-1.6V8.5l-5-5zM13.5 3.5v3.4c0 .9.7 1.6 1.6 1.6h3.4M8.5 12h7M8.5 15h7M8.5 18h4',
  csv: 'M5.1 4.5h13.8c.9 0 1.6.7 1.6 1.6v11.8c0 .9-.7 1.6-1.6 1.6H5.1c-.9 0-1.6-.7-1.6-1.6V6.1c0-.9.7-1.6 1.6-1.6zM3.5 9.5h17M3.5 14.5h17M9.5 4.5v15',
  till: 'M4.5 11.5h15v7.4c0 .9-.7 1.6-1.6 1.6H6.1c-.9 0-1.6-.7-1.6-1.6v-7.4zM4.5 11.5L6.5 5h11l2 6.5M9.5 15.5h5M9 8h6',
  roll: 'M7.5 5.5h9M7.5 18.5h9M7.5 5.5c-1.1 0-2 2.9-2 6.5s.9 6.5 2 6.5M16.5 5.5c1.1 0 2 2.9 2 6.5s-.9 6.5-2 6.5M16.5 5.5c-1.1 0-2 2.9-2 6.5s.9 6.5 2 6.5',
  strap: 'M4.5 7.5h15v9h-15zM10.5 7.5v9M13.5 7.5v9',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M4 4l16 16M9.9 6c.7-.3 1.4-.5 2.1-.5 6 0 9.5 6.5 9.5 6.5s-.9 1.7-2.6 3.4M6.6 7.6C4 9.4 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.4 0 2.7-.4 3.8-.9M9.9 9.9a3 3 0 0 0 4.2 4.2',
  backspace: 'M8.7 5.5h10.7c.9 0 1.6.7 1.6 1.6v9.8c0 .9-.7 1.6-1.6 1.6H8.7L3 12l5.7-6.5zM11.5 9.5l5 5M16.5 9.5l-5 5',
  star: 'M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 4.5z',
  undo: 'M8.5 6L5 9.5 8.5 13M5.5 9.5h8.3c2.8 0 5 2.2 5 5s-2.2 5-5 5H10',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  date: 'M6.1 6h11.8c.9 0 1.6.7 1.6 1.6v10.8c0 .9-.7 1.6-1.6 1.6H6.1c-.9 0-1.6-.7-1.6-1.6V7.6c0-.9.7-1.6 1.6-1.6zM4.5 10.5h15M8.5 4v3.5M15.5 4v3.5',
  lock: 'M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5M6.6 10.5h10.8c.6 0 1.1.5 1.1 1.1v7.3c0 .6-.5 1.1-1.1 1.1H6.6c-.6 0-1.1-.5-1.1-1.1v-7.3c0-.6.5-1.1 1.1-1.1z',
  rows: 'M4.5 6.5h15M4.5 12h15M4.5 17.5h9M17 15.5v4M15 17.5h4',
};

export default function Glyph({ name, size = 24, color, weight = 1.8, fill }: { name: GlyphName; size?: number; color: string; weight?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d={D[name]} stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" fill={fill ?? 'none'} />
      {name === 'more' ? [6, 12, 18].map((x) => <Circle key={x} cx={x} cy={12} r={1.6} fill={color} />) : null}
    </Svg>
  );
}
