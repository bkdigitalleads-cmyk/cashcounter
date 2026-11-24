// Unit checks for the count sheet: the fonts carry every currency sign and
// one width per digit, the page lays out inside the paper on Letter and A4
// in every currency, it prints what was counted, and a real PDF is written
// and read back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';

const F = await import('../src/pdf/fonts.ts');
const L = await import('../src/pdf/layout.ts');
const P = await import('../src/pdf/pdf.ts');
const S = await import('../src/sample.ts');
const C = await import('../src/currencies.ts');

const ROOT = new URL('..', import.meta.url).pathname;
const bytes = {};
for (const [k, f] of Object.entries(F.FONT_FILES)) bytes[k] = new Uint8Array(readFileSync(`${ROOT}assets/fonts/${f}`));
const m = F.makeMeasure(bytes);
const texts = (page) => page.ops.filter((o) => o.k === 'text').map((o) => o.text);

test('fonts: every digit is one width (tabular), and every currency sign and tile label draws', () => {
  for (const k of Object.keys(bytes)) {
    const w = [...'0123456789'].map((d) => m.width(d, k, 10));
    assert.ok(w.every((x) => Math.abs(x - w[0]) < 1e-9), `${k}: ${w}`);
    for (const ch of ['$', '€', '£', '¢']) assert.equal(m.clean(ch, k), ch, `${k} ${ch}`);
  }
  for (const code of C.CURRENCY_CODES) for (const d of C.CURRENCIES[code].denominations) assert.ok(!m.clean(d.tile, 'bold').includes('?'), d.tile);
  assert.equal(m.clean('Tips 🎉', 'regular'), 'Tips ?', 'what the font cannot draw becomes ?');
});

test('the sheet: every currency on Letter and A4 stays inside the page, with the total, difference and signature lines', () => {
  for (const code of C.CURRENCY_CODES) {
    for (const paper of ['letter', 'a4']) {
      const count = { ...S.sampleCount(code, '2026-11-22', Date.UTC(2026, 10, 22, 22)), custom: [{ id: 'x', label: 'Checks', amount: 12500 }], note: 'A long note. '.repeat(30) };
      count.total += 12500;
      const page = L.layoutSheet(m, { count, paper, locale: 'en-US' });
      const { width, height } = L.PAPER_SIZE[paper];
      for (const op of page.ops) {
        if (op.k === 'text') {
          assert.ok(op.x >= 0 && op.x + m.width(op.text, op.font, op.size) <= width + 0.01 && op.y > 0 && op.y <= height, `${code} ${paper}: ${op.text}`);
        }
        if (op.k === 'line') assert.ok(op.y1 <= height - 20, `${code} ${paper}: a rule off the page`);
      }
      const t = texts(page);
      assert.ok(t.includes('Total'), code);
      assert.ok(t.includes('Counted by') && t.includes('Checked by'), code);
      assert.ok(t.some((s) => /^Over by /.test(s)), `${code}: the difference (checks put the sample over)`);
      assert.ok(t.includes('Checks'), `${code}: custom rows`);
    }
  }
});

test('the sheet prints what was counted: pieces, subtotals, total, expected and Balanced', () => {
  const count = { id: 'a', tillId: 't', tillName: 'Bar', name: 'Friday close', note: '', day: '2026-11-20', currency: 'USD', pieces: { n2000: 21, c25: 40 }, custom: [], expected: { mode: 'amount', amount: 43000, float: 0, sales: 0 }, total: 43000, diff: 0, createdAt: 1, updatedAt: 1 };
  const t = texts(L.layoutSheet(m, { count, paper: 'letter', locale: 'en-US' }));
  for (const s of ['CASH COUNT', 'Bar', 'Friday close', 'Nov 20, 2026', '$20', 'Twenties', '21', '$420.00', 'Quarters', '40', '$10.00', '$430.00', 'Expected', 'Balanced']) assert.ok(t.includes(s), s);
  assert.ok(!t.some((s) => /Short|Over/.test(s)));
  assert.ok(!t.includes('$100.00'), 'an uncounted row prints a dash, not an amount');
});

test('a real PDF: one page, the right size, subset fonts, readable title', async () => {
  const count = S.sampleCount('EUR', '2026-11-22', 1);
  const page = L.layoutSheet(m, { count, paper: 'a4', locale: 'de-DE' });
  const pdf = await P.writePdf([page], bytes, { title: 'Count sheet, Front register', subject: 'Evening close' });
  assert.ok(pdf.length > 5_000 && pdf.length < 120_000, `${pdf.length} bytes`);
  const doc = await PDFDocument.load(pdf);
  assert.equal(doc.getPageCount(), 1);
  const { width, height } = doc.getPage(0).getSize();
  assert.ok(Math.abs(width - 595.28) < 0.01 && Math.abs(height - 841.89) < 0.01);
  assert.equal(doc.getTitle(), 'Count sheet, Front register');
  assert.equal(doc.getCreator(), 'Cash Counter');
});

test('wrap and fit keep text inside its column', () => {
  const lines = L.wrap(m, 'Supercalifragilisticexpialidocious words that keep going and going', 'regular', 10, 60);
  for (const l of lines) assert.ok(m.width(l, 'regular', 10) <= 60.01, l);
  const f = L.fit(m, 'A very long till name that does not fit', 'bold', 24, 100);
  assert.ok(f.endsWith('...') && m.width(f, 'bold', 24) <= 100.01);
});

test('build 2: the sheet prints the count name under the till name only when they differ', () => {
  const base = { id: 'a', tillId: 't', tillName: 'Front register', note: '', day: '2026-11-22', currency: 'USD', pieces: { n2000: 3 }, custom: [], expected: { mode: 'none', amount: 0, float: 0, sales: 0 }, total: 6000, diff: null, createdAt: 1, updatedAt: 1 };
  const same = texts(L.layoutSheet(m, { count: { ...base, name: 'Front register' }, paper: 'letter', locale: 'en-US' }));
  assert.equal(same.filter((t) => t === 'Front register').length, 1, 'shown once');
  const other = texts(L.layoutSheet(m, { count: { ...base, name: 'Sunday close' }, paper: 'letter', locale: 'en-US' }));
  assert.ok(other.includes('Front register') && other.includes('Sunday close'));
});

test('build 3: the count sheet heads the paper money Bills in dollars (US, Canada) and Notes elsewhere', () => {
  for (const [cur, want] of [['USD', 'BILLS'], ['CAD', 'BILLS'], ['EUR', 'NOTES'], ['GBP', 'NOTES'], ['AUD', 'NOTES'], ['MXN', 'NOTES']]) {
    const t = texts(L.layoutSheet(m, { count: S.sampleCount(cur, '2026-11-22', 1), paper: 'letter', locale: 'en-US' }));
    assert.ok(t.includes(want), `${cur}: ${want}`);
    assert.ok(!t.includes(want === 'BILLS' ? 'NOTES' : 'BILLS'), cur);
  }
});
