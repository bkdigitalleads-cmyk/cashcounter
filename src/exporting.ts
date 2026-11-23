/**
 * Getting a count out: the share sheet (Messages, Mail, Files with "Save to
 * Files", AirDrop and the rest) or Print. Files are made on the phone and
 * go only where the person sends them.
 */
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { shareFile } from './store';

/** Opens the share sheet for a file already on disk. Resolves when the sheet closes. */
export async function shareFileAt(uri: string, kind: 'pdf' | 'csv', title: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone.');
  await Sharing.shareAsync(uri, kind === 'pdf' ? { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title } : { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: title });
}

/** Writes the PDF under a readable name in the cache. */
export function writePdfFile(name: string, bytes: Uint8Array): string {
  return shareFile(name, bytes);
}

/** Writes the CSV under a readable name in the cache. */
export function writeCsvFile(name: string, csv: string): string {
  return shareFile(name, csv, 'utf8');
}

/** The system print sheet for the PDF. */
export async function printPdf(uri: string): Promise<void> {
  await Print.printAsync({ uri });
}

/** "Count sheet Front register 2026-11-22.pdf": readable, safe on every file system. */
export function safeFileName(parts: string[], ext: 'pdf' | 'csv'): string {
  const clean = parts
    .join(' ')
    .replace(/[\\/:*?"<>|,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${clean || 'Count sheet'}.${ext}`;
}
