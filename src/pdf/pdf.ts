/**
 * Writing the count sheet with pdf-lib: the layout's operations, drawn one
 * to one. Pure (no native imports), so `npm test` makes real PDFs and
 * checks them.
 */
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { FontKey, Page } from './layout.ts';
import { FEATURES } from './fonts.ts';
import type { FontBytes } from './fonts.ts';

function color(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export interface PdfMeta {
  title: string;
  subject: string;
}

export async function writePdf(pages: Page[], fonts: FontBytes, meta: PdfMeta): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit as any);
  pdf.setTitle(meta.title);
  pdf.setSubject(meta.subject);
  pdf.setCreator('Cash Counter');
  pdf.setProducer('Cash Counter');
  const embedded = {} as Record<FontKey, Awaited<ReturnType<typeof pdf.embedFont>>>;
  for (const k of Object.keys(fonts) as FontKey[]) embedded[k] = await pdf.embedFont(fonts[k], { subset: true, features: FEATURES });

  for (const p of pages) {
    const page = pdf.addPage([p.width, p.height]);
    const H = p.height;
    for (const op of p.ops) {
      if (op.k === 'text') {
        page.drawText(op.text, { x: op.x, y: H - op.y, size: op.size, font: embedded[op.font], color: color(op.color) });
      } else if (op.k === 'rect') {
        page.drawRectangle({
          x: op.x,
          y: H - op.y - op.h,
          width: op.w,
          height: op.h,
          color: op.fill ? color(op.fill) : undefined,
          borderColor: op.stroke ? color(op.stroke) : undefined,
          borderWidth: op.stroke ? op.lw ?? 1 : 0,
        });
      } else if (op.k === 'line') {
        page.drawLine({ start: { x: op.x1, y: H - op.y1 }, end: { x: op.x2, y: H - op.y2 }, thickness: op.lw, color: color(op.color) });
      }
    }
  }
  return pdf.save();
}
