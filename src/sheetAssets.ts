/**
 * The count sheet's font bytes from the app bundle (expo-asset), loaded
 * once, and what is built on them: the measurer, the page, and the
 * finished PDF.
 */
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import type { FontKey, Measure, Page, Paper } from './pdf/layout';
import { layoutSheet } from './pdf/layout';
import { FontBytes, makeMeasure } from './pdf/fonts';
import { writePdf } from './pdf/pdf';
import type { SavedCount } from './history';
import { formatDate } from './format';

const MODULES: Record<FontKey, number> = {
  regular: require('../assets/fonts/BarlowTab-Regular.ttf'),
  medium: require('../assets/fonts/BarlowTab-Medium.ttf'),
  bold: require('../assets/fonts/BarlowTab-Bold.ttf'),
};

export interface SheetKit {
  bytes: FontBytes;
  measure: Measure;
}

let loading: Promise<SheetKit> | null = null;

async function load(): Promise<SheetKit> {
  const bytes = {} as FontBytes;
  for (const k of Object.keys(MODULES) as FontKey[]) {
    const asset = Asset.fromModule(MODULES[k]);
    await asset.downloadAsync();
    bytes[k] = await new File(asset.localUri ?? asset.uri).bytes();
  }
  return { bytes, measure: makeMeasure(bytes) };
}

/** Fonts for laying out and writing count sheets, loaded on first use. */
export function sheetKit(): Promise<SheetKit> {
  if (!loading) {
    loading = load().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

export function sheetPage(kit: SheetKit, count: SavedCount, paper: Paper, locale: string): Page {
  return layoutSheet(kit.measure, { count, paper, locale });
}

export function sheetPdf(kit: SheetKit, page: Page, count: SavedCount, locale: string): Promise<Uint8Array> {
  return writePdf([page], kit.bytes, {
    title: `Count sheet, ${count.tillName}, ${formatDate(count.day, locale)}`,
    subject: count.name || 'Cash count',
  });
}
