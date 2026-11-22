// Unit checks for the counting itself: totals in every launch currency in
// integer cents, typed numbers, rolls and straps, expected and difference,
// the deposit suggestion, rows, History limits and the CSV. Run with
// `npm test` (Node 22 strips the TypeScript types itself).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const C = await import('../src/currencies.ts');
const K = await import('../src/count.ts');
const M = await import('../src/money.ts');
const DP = await import('../src/deposit.ts');
const R = await import('../src/rows.ts');
const H = await import('../src/history.ts');
const F = await import('../src/format.ts');

const fmt = (cur) => (m) => F.formatMoney(m, cur, 'en-US');

// ---------- currencies ----------

test('six launch currencies, notes then coins, largest first, every value a positive integer of minor units', () => {
  assert.deepEqual(C.CURRENCY_CODES, ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'MXN']);
  for (const code of C.CURRENCY_CODES) {
    const ds = C.CURRENCIES[code].denominations;
    const firstCoin = ds.findIndex((d) => d.kind === 'coin');
    assert.ok(firstCoin > 0 && ds.slice(firstCoin).every((d) => d.kind === 'coin'), `${code}: notes first`);
    for (const kind of ['note', 'coin']) {
      const vals = ds.filter((d) => d.kind === kind).map((d) => d.value);
      assert.deepEqual(vals, [...vals].sort((a, b) => b - a), `${code} ${kind}: largest first`);
    }
    for (const d of ds) assert.ok(Number.isSafeInteger(d.value) && d.value > 0, `${code} ${d.id}`);
    assert.equal(new Set(ds.map((d) => d.id)).size, ds.length, `${code}: ids unique`);
  }
});

test('currency follows the region on first launch', () => {
  assert.equal(C.currencyForRegion('US'), 'USD');
  assert.equal(C.currencyForRegion('CA'), 'CAD');
  assert.equal(C.currencyForRegion('DE'), 'EUR');
  assert.equal(C.currencyForRegion('ie'), 'EUR');
  assert.equal(C.currencyForRegion('GB'), 'GBP');
  assert.equal(C.currencyForRegion('AU'), 'AUD');
  assert.equal(C.currencyForRegion('MX'), 'MXN');
  assert.equal(C.currencyForRegion('JP', 'JPY'), 'USD', 'none of the six: US dollar');
  assert.equal(C.currencyForRegion(null, 'GBP'), 'GBP', 'no region: the phone currency when it is one of the six');
  assert.equal(C.paperForRegion('US'), 'letter');
  assert.equal(C.paperForRegion('FR'), 'a4');
});

// ---------- totals in integer cents ----------

test('totals in every launch currency are exact integer sums of pieces x value', () => {
  for (const code of C.CURRENCY_CODES) {
    const ds = C.CURRENCIES[code].denominations;
    const pieces = {};
    let expect = 0;
    ds.forEach((d, i) => {
      pieces[d.id] = (i * 7 + 3) % 41;
      expect += d.value * pieces[d.id];
    });
    const t = K.countTotals(code, pieces);
    assert.equal(t.cash, expect, code);
    assert.ok(Number.isSafeInteger(t.total), code);
  }
});

test('no floating point dust: ten dimes and three pennies are exactly 1.03; 1,000 pennies are 10.00', () => {
  assert.equal(K.countTotals('USD', { c10: 10, c1: 3 }).total, 103);
  assert.equal(K.countTotals('USD', { c1: 1000 }).total, 1000);
  // The float way would be 0.1 * 3 = 0.30000000000000004.
  assert.equal(K.countTotals('EUR', { c10: 3 }).total, 30);
  assert.equal(K.countTotals('GBP', { c2: 7, c1: 1 }).total, 15);
  assert.equal(K.countTotals('AUD', { c5: 3, c20: 1 }).total, 35);
  assert.equal(K.countTotals('CAD', { c5: 1, c25: 3 }).total, 80);
  assert.equal(K.countTotals('MXN', { c50: 3, n100000: 1 }).total, 100150);
  assert.throws(() => M.sumMinor([1, 0.1]), /Not a whole amount/);
});

test('a big close: straps of hundreds add up without losing a cent', () => {
  const t = K.countTotals('USD', { n10000: 99999, c1: 99999 });
  assert.equal(t.total, 99999 * 10000 + 99999);
  assert.ok(Number.isSafeInteger(t.total));
});

test('pieces and custom rows: damaged values are cleaned, custom rows add to the total but not the cash', () => {
  const t = K.countTotals('USD', { n2000: 2.7, n1000: -3, c25: 'x', zz: 5 }, [{ id: 'a', label: 'Checks', amount: 12500 }]);
  assert.equal(t.cash, 4000);
  assert.equal(t.other, 12500);
  assert.equal(t.total, 16500);
  assert.equal(t.pieces, 2);
  assert.deepEqual(K.cleanPieces('USD', { n2000: 3, nope: 4, c1: 0 }), { n2000: 3 });
});

test('typed numbers: pieces are whole and capped; amounts are read as text, never through a float', () => {
  assert.equal(M.parseQty('0012'), 12);
  assert.equal(M.parseQty(''), 0);
  assert.equal(M.parseQty('1234567'), M.MAX_QTY);
  assert.equal(M.parseAmount('12.5'), 1250);
  assert.equal(M.parseAmount('1,234.56'), 123456);
  assert.equal(M.parseAmount('12,5', ','), 1250);
  assert.equal(M.parseAmount('1.234,56', ','), 123456);
  assert.equal(M.parseAmount('0.29'), 29);
  assert.equal(M.parseAmount('1.005'), 100, 'cents beyond two are dropped, not rounded through a float');
  assert.equal(M.parseAmount(''), null);
  assert.equal(M.cleanQty(3.9), 3);
  assert.equal(M.cleanQty(-1), 0);
});

// ---------- plus, minus, rolls and straps ----------

test('plus and minus never go below zero or above the cap', () => {
  assert.equal(K.stepQty(0, -1), 0);
  assert.equal(K.stepQty(4, 1), 5);
  assert.equal(K.stepQty(M.MAX_QTY, 1), M.MAX_QTY);
});

test('rolls, bags and straps at the standard counts', () => {
  const d = (cur, id) => C.denomination(cur, id);
  // US: 50 pennies, 40 nickels, 50 dimes, 40 quarters; straps of 100.
  assert.deepEqual(['c1', 'c5', 'c10', 'c25', 'c50', 'c100'].map((id) => d('USD', id).pack), [50, 40, 50, 40, 20, 25]);
  assert.equal(d('USD', 'n2000').pack, 100);
  assert.equal(K.addPack(3, d('USD', 'c25')), 43);
  assert.equal(K.countTotals('USD', { c25: K.addPack(0, d('USD', 'c25')) }).total, 1000, 'a quarter roll is $10.00');
  assert.equal(K.countTotals('USD', { n2000: K.addPack(0, d('USD', 'n2000')) }).total, 200000, 'a strap of twenties is $2,000');
  // Canada: no penny; 40 nickels, 50 dimes, 40 quarters, 25 loonies, 25 toonies.
  assert.equal(d('CAD', 'c1'), null);
  assert.deepEqual(['c5', 'c10', 'c25', 'c100', 'c200'].map((id) => d('CAD', id).pack), [40, 50, 40, 25, 25]);
  // Euro rolls by value: 1c 0.50, 2c 1.00, 5c 2.50, 10c 4.00, 20c 8.00, 50c 20.00, 1 euro 25.00, 2 euro 50.00.
  assert.deepEqual(['c1', 'c2', 'c5', 'c10', 'c20', 'c50', 'c100', 'c200'].map((id) => d('EUR', id).pack * d('EUR', id).value), [50, 100, 250, 400, 800, 2000, 2500, 5000]);
  // Pound bags by value: 1p and 2p £1, 5p and 10p £5, 20p and 50p £10, £1 and £2 £20.
  assert.deepEqual(['c1', 'c2', 'c5', 'c10', 'c20', 'c50', 'c100', 'c200'].map((id) => d('GBP', id).pack * d('GBP', id).value), [100, 100, 500, 500, 1000, 1000, 2000, 2000]);
  assert.equal(C.packWord('GBP', d('GBP', 'c50')), 'bag');
  assert.equal(C.packWord('USD', d('USD', 'c25')), 'roll');
  assert.equal(C.packWord('USD', d('USD', 'n100')), 'strap');
  // Australia: 5c $2, 10c $4, 20c $4, 50c $10, $1 $20, $2 $50.
  assert.deepEqual(['c5', 'c10', 'c20', 'c50', 'c100', 'c200'].map((id) => d('AUD', id).pack * d('AUD', id).value), [200, 400, 400, 1000, 2000, 5000]);
  // Mexico: straps of 100 notes; no coin roll is offered.
  assert.equal(d('MXN', 'n50000').pack, 100);
  assert.equal(d('MXN', 'c1000').pack, undefined);
  assert.equal(K.addPack(7, d('MXN', 'c1000')), 7, 'no roll: unchanged');
  assert.equal(K.addPack(M.MAX_QTY - 10, d('USD', 'c1')), M.MAX_QTY, 'capped');
});

// ---------- expected and difference ----------

test('expected: an amount, or a float plus sales; difference is counted minus expected', () => {
  assert.equal(K.expectedAmount(K.NO_EXPECTED), null);
  assert.equal(K.difference(5000, K.NO_EXPECTED), null);
  const amount = { mode: 'amount', amount: 120450, float: 0, sales: 0 };
  assert.equal(K.expectedAmount(amount), 120450);
  assert.equal(K.difference(120000, amount), -450);
  const fs = { mode: 'floatSales', amount: 999, float: 20000, sales: 100450 };
  assert.equal(K.expectedAmount(fs), 120450, 'the stray amount is ignored in float + sales');
  assert.equal(K.difference(120650, fs), 200);
  assert.equal(K.difference(120450, fs), 0);
});

test('over or short in plain words', () => {
  assert.equal(K.diffWords(-450, fmt('USD')), 'Short by $4.50');
  assert.equal(K.diffWords(200, fmt('USD')), 'Over by $2.00');
  assert.equal(K.diffWords(0, fmt('USD')), 'Balanced');
  assert.equal(K.diffKind(-1), 'short');
  assert.equal(K.diffKind(1), 'over');
  assert.equal(K.diffWords(-150, (m) => F.formatMoney(m, 'GBP', 'en-GB')), 'Short by £1.50');
});

test('drafts: blank when nothing counted; stored drafts read back safely', () => {
  const d = K.emptyDraft('t1', 'EUR');
  assert.equal(K.isBlank(d), true);
  assert.equal(K.isBlank({ ...d, pieces: { c50: 1 } }), false);
  assert.equal(K.isBlank({ ...d, custom: [{ id: 'x', label: 'Checks', amount: 100 }] }), false);
  const back = K.parseDraft(JSON.stringify({ ...d, pieces: { c50: 3, bad: 2 }, expected: { mode: 'weird' } }));
  assert.deepEqual(back.pieces, { c50: 3 });
  assert.equal(back.expected.mode, 'none');
  assert.equal(K.parseDraft('{bad'), null);
  assert.equal(K.parseDraft(null), null);
});

// ---------- the deposit suggestion ----------

const sumLeft = (p) => p.lines.reduce((a, l) => a + l.leave * l.value, 0);

test('deposit: leaves exactly the float when a mix makes it, banking the largest notes first', () => {
  const pieces = { n10000: 3, n2000: 12, n1000: 8, n500: 10, n100: 42, c25: 40, c10: 50, c5: 40, c1: 50 };
  const p = DP.suggestDeposit('USD', pieces, 20000);
  assert.equal(p.fit, 'exact');
  assert.equal(p.left, 20000);
  assert.equal(sumLeft(p), 20000);
  assert.equal(p.deposit, p.cash - 20000);
  assert.equal(p.lines.find((l) => l.id === 'n10000').bank, 3, 'every hundred goes to the bank');
  assert.equal(p.lines.find((l) => l.id === 'c1').leave, 50, 'pennies stay for change');
});

test('deposit: never suggests more of a note or coin than was counted', () => {
  let seed = 7;
  const rnd = (n) => ((seed = (seed * 1103515245 + 12345) % 2147483648) % n);
  for (const code of C.CURRENCY_CODES) {
    for (let k = 0; k < 40; k++) {
      const pieces = {};
      for (const d of C.CURRENCIES[code].denominations) if (rnd(3)) pieces[d.id] = rnd(30);
      const cash = K.countTotals(code, pieces).cash;
      const float = rnd(Math.max(1, cash + 5000));
      const p = DP.suggestDeposit(code, pieces, float);
      for (const l of p.lines) {
        assert.ok(l.leave >= 0 && l.bank >= 0, `${code} ${l.id}`);
        assert.equal(l.leave + l.bank, pieces[l.id], `${code} ${l.id}: leave + bank is what was counted`);
      }
      assert.equal(p.left + p.deposit, cash);
      if (p.fit === 'exact') assert.equal(p.left, Math.min(float, cash));
      if (p.fit === 'above') assert.ok(p.left > float);
      if (p.fit === 'short') assert.ok(cash < float && p.deposit === 0);
    }
  }
});

test('deposit: finds the exact float where banking largest-first alone would miss it', () => {
  // $50 + three $20s with a $50 float: banking the $50 first would leave $60. The exact answer keeps the $50.
  const p = DP.suggestDeposit('USD', { n5000: 1, n2000: 3 }, 5000);
  assert.equal(p.fit, 'exact');
  assert.equal(p.left, 5000);
  assert.equal(p.lines.find((l) => l.id === 'n2000').bank, 3);
});

test('deposit: when no mix makes the float, leaves the smallest amount above it; with too little cash, keeps it all', () => {
  const above = DP.suggestDeposit('USD', { n2000: 3 }, 5000);
  assert.equal(above.fit, 'above');
  assert.equal(above.left, 6000);
  const short = DP.suggestDeposit('USD', { n2000: 3 }, 9000);
  assert.equal(short.fit, 'short');
  assert.equal(short.deposit, 0);
  const zero = DP.suggestDeposit('EUR', { n2000: 2, c200: 5 }, 0);
  assert.equal(zero.deposit, zero.cash, 'a float of zero banks everything');
  const empty = DP.suggestDeposit('GBP', {}, 10000);
  assert.equal(empty.lines.length, 0);
});

// ---------- rows ----------

test('rows: rare ones start hidden, can be shown or hidden, and a hidden row with pieces still shows', () => {
  const s = R.EMPTY_SETUP;
  const ids = (list) => list.map((d) => d.id);
  assert.ok(!ids(R.visibleDenoms('USD', s)).includes('n200'), 'the $2 note starts hidden');
  const two = R.setShown(s, C.denomination('USD', 'n200'), true);
  assert.ok(ids(R.visibleDenoms('USD', two)).includes('n200'));
  const noPennies = R.setShown(s, C.denomination('USD', 'c1'), false);
  assert.ok(!ids(R.visibleDenoms('USD', noPennies)).includes('c1'));
  assert.ok(ids(R.visibleDenoms('USD', noPennies, { c1: 4 })).includes('c1'), 'pieces keep it on screen');
  assert.deepEqual(R.setShown(two, C.denomination('USD', 'n200'), false).overrides, {}, 'back to the default leaves no override');
  let c = R.addCustomRow(s, 'a', '  Checks  ');
  assert.deepEqual(c.custom, [{ id: 'a', label: 'Checks' }]);
  assert.equal(R.addCustomRow(c, 'b', '   ').custom.length, 1, 'no blank labels');
  c = R.removeCustomRow(c, 'a');
  assert.equal(c.custom.length, 0);
  assert.deepEqual(R.parseRowSetup('USD', '{"overrides":{"n200":true,"zz":true,"c1":"x"},"custom":[{"id":"q","label":"Vouchers"},{"id":3}]}'), { overrides: { n200: true }, custom: [{ id: 'q', label: 'Vouchers' }] });
  assert.deepEqual(R.parseRowSetup('USD', 'nope'), { overrides: {}, custom: [] });
});

// ---------- history ----------

const saved = (id, day, createdAt, extra = {}) => ({ id, tillId: 't', tillName: 'Front register', name: 'Close', note: '', day, currency: 'USD', pieces: { n2000: 1 }, custom: [], expected: K.NO_EXPECTED, total: 2000, diff: null, createdAt, updatedAt: createdAt, ...extra });

test('history: by day, newest first', () => {
  const g = H.groupByDay([saved('a', '2026-11-20', 1), saved('b', '2026-11-22', 2), saved('c', '2026-11-22', 3), saved('d', '2026-11-21', 4)]);
  assert.deepEqual(g.map((x) => x.day), ['2026-11-22', '2026-11-21', '2026-11-20']);
  assert.deepEqual(g[0].counts.map((c) => c.id), ['c', 'b']);
  assert.equal(H.defaultCountName('Bar'), 'Bar close');
});

test('history CSV: one row per count, plain amounts, quoted text, spreadsheet formulas defused', () => {
  const csv = H.historyCsv([
    saved('a', '2026-11-22', 2, { note: 'Refund, $5 "cash"', diff: -450, expected: { mode: 'amount', amount: 2450, float: 0, sales: 0 } }),
    saved('b', '2026-11-21', 1, { tillName: '=SUM(A1)', custom: [{ id: 'x', label: 'Checks', amount: 1050 }], total: 3050 }),
  ]);
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^Date,Till,Name,Currency,Total,Expected,Difference,Result,Note,USD \$100 note,/);
  assert.match(lines[0], /,Checks$/);
  assert.match(lines[1], /^2026-11-21,'=SUM\(A1\),Close,USD,30\.50,,,,/, 'oldest first; a formula gets a quote mark');
  assert.match(lines[1], /,10\.50$/);
  assert.match(lines[2], /^2026-11-22,Front register,Close,USD,20\.00,24\.50,-4\.50,Short,"Refund, \$5 ""cash""",/);
  assert.equal(H.plainAmount(-5), '-0.05');
  assert.equal(H.csvFileName('2026-11-22'), 'Cash counts 2026-11-22.csv');
});

// ---------- formats ----------

test('money in the phone format; input fields without symbols', () => {
  assert.equal(F.formatMoney(125050, 'USD', 'en-US'), '$1,250.50');
  assert.equal(F.formatMoney(125050, 'EUR', 'de-DE').replace(/\s/g, ' '), '1.250,50 €');
  assert.equal(F.formatMoney(125050, 'MXN', 'es-MX'), '$1,250.50');
  assert.equal(F.formatSigned(-450, 'USD', 'en-US'), '-$4.50');
  assert.equal(F.moneyInput(125050, 'de-DE'), '1250,50');
  assert.equal(F.moneyInput(5, 'en-US'), '0.05');
  assert.equal(F.formatQty(1250, 'en-US'), '1,250');
});
