// Count sheet samples for docs/design: `node store/sheet-samples.mjs` from the repo root.
// Writes docs/design/sheet/<name>.pdf and a PNG of each (needs pdftoppm).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const ROOT = new URL('..', import.meta.url).pathname;
const F = await import(`${ROOT}src/pdf/fonts.ts`);
const L = await import(`${ROOT}src/pdf/layout.ts`);
const P = await import(`${ROOT}src/pdf/pdf.ts`);
const S = await import(`${ROOT}src/sample.ts`);
const bytes = {};
for (const [k, f] of Object.entries(F.FONT_FILES)) bytes[k] = readFileSync(`${ROOT}assets/fonts/${f}`);
const m = F.makeMeasure(bytes);
const out = `${ROOT}docs/design/sheet`;
mkdirSync(out, { recursive: true });
const now = Date.UTC(2026, 10, 23, 3, 12);
const samples = [
  ['usd-letter-short', { ...S.sampleCount('USD', '2026-11-22', now), custom: [] }, 'letter', 'en-US'],
  ['eur-a4-balanced', (() => { const c = S.sampleCount('EUR', '2026-11-22', now); return { ...c, expected: { mode: 'amount', amount: c.total, float: 0, sales: 0 }, diff: 0, note: '' }; })(), 'a4', 'de-DE'],
  ['gbp-a4-over-checks', (() => { const c = S.sampleCount('GBP', '2026-11-22', now); return { ...c, tillName: 'Bar', custom: [{ id: 'x', label: 'Cheques', amount: 4500 }], total: c.total + 4500 }; })(), 'a4', 'en-GB'],
];
for (const [name, count, paper, locale] of samples) {
  const page = L.layoutSheet(m, { count, paper, locale });
  const pdf = await P.writePdf([page], bytes, { title: `Count sheet, ${count.tillName}`, subject: count.name });
  writeFileSync(`${out}/${name}.pdf`, pdf);
  execFileSync('pdftoppm', ['-png', '-r', '72', '-singlefile', `${out}/${name}.pdf`, `${out}/${name}`]);
  console.log('wrote', name);
}
