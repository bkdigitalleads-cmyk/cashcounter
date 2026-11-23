// Unit checks for the data layer and the rules around it: the migrations
// and every read and write on a real SQLite (Node's built-in node:sqlite
// runs the same SQL as expo-sqlite), the free versus Pro gates, History
// limits on the free plan, and the rating and onboarding rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

const SC = await import('../src/db/schema.ts');
const R = await import('../src/db/repo.ts');
const K = await import('../src/count.ts');
const G = await import('../src/gates.ts');
const U = await import('../src/rules.ts');
const S = await import('../src/sample.ts');

function nodeDb() {
  const sq = new DatabaseSync(':memory:');
  const norm = (p) => p.map((v) => (v === undefined ? null : v));
  return {
    sq,
    db: {
      exec: async (sql) => sq.exec(sql),
      run: async (sql, p = []) => {
        sq.prepare(sql).run(...norm(p));
      },
      all: async (sql, p = []) => sq.prepare(sql).all(...norm(p)).map((r) => ({ ...r })),
      get: async (sql, p = []) => {
        const r = sq.prepare(sql).get(...norm(p));
        return r ? { ...r } : null;
      },
      tx: async (fn) => {
        sq.exec('BEGIN');
        try {
          await fn();
          sq.exec('COMMIT');
        } catch (e) {
          sq.exec('ROLLBACK');
          throw e;
        }
      },
    },
  };
}

async function freshDb() {
  const { db, sq } = nodeDb();
  await SC.migrate(db);
  return { db, sq };
}

const till = (id, name, extra = {}) => ({ id, name, currency: 'USD', float: 20000, position: 0, createdAt: 1, updatedAt: 1, ...extra });

// ---------- migrations ----------

test('migrations: run once, count in user_version, refuse a database from a newer app', async () => {
  const { db, sq } = nodeDb();
  assert.equal(await SC.migrate(db), SC.MIGRATIONS.length);
  assert.equal(await SC.migrate(db), SC.MIGRATIONS.length, 'running again changes nothing');
  sq.exec(`PRAGMA user_version = ${SC.MIGRATIONS.length + 1}`);
  await assert.rejects(SC.migrate(db), /newer version/);
});

// ---------- tills ----------

test('tills: saved, listed in order, renamed, removed; a blank name becomes Till', async () => {
  const { db } = await freshDb();
  await R.saveTill(db, till('a', 'Front register'));
  await R.saveTill(db, till('b', '  ', { position: 1, currency: 'EUR' }));
  let list = await R.listTills(db);
  assert.deepEqual(list.map((t) => [t.name, t.currency, t.float]), [['Front register', 'USD', 20000], ['Till', 'EUR', 20000]]);
  await R.saveTill(db, { ...list[0], name: 'Bar', float: 15050 });
  list = await R.listTills(db);
  assert.equal(list[0].name, 'Bar');
  assert.equal(list[0].float, 15050);
  await R.deleteTill(db, 'b');
  assert.equal((await R.listTills(db)).length, 1);
});

// ---------- saved counts ----------

test('saving a count: total and difference are worked out from the pieces, and it reads back the same', async () => {
  const { db } = await freshDb();
  const draft = { ...K.emptyDraft('a', 'USD'), pieces: { n2000: 10, c25: 40, c1: 7 }, custom: [{ id: 'x', label: 'Checks', amount: 5000 }, { id: 'y', label: 'Empty', amount: 0 }], expected: { mode: 'floatSales', amount: 0, float: 20000, sales: 6000 } };
  const s = await R.saveCount(db, draft, { id: 'c1', tillName: 'Front register', name: 'Close', note: 'Fine', day: '2026-11-22', now: 1000 });
  assert.equal(s.total, 20000 + 1000 + 7 + 5000);
  assert.equal(s.diff, s.total - 26000);
  assert.deepEqual(s.custom.map((c) => c.label), ['Checks'], 'empty custom rows are not kept');
  const back = await R.getCount(db, 'c1');
  assert.deepEqual(back, s);
  assert.equal(await R.countSaved(db), 1);
});

test('reopening a saved count edits it in place; duplicating starts a new one', async () => {
  const { db } = await freshDb();
  const s = await R.saveCount(db, { ...K.emptyDraft('a', 'USD'), pieces: { n500: 3 } }, { id: 'c1', tillName: 'Bar', name: 'Close', note: '', day: '2026-11-21', now: 1000 });
  const edit = R.draftFrom(s, 'edit');
  assert.equal(edit.savedId, 'c1');
  assert.equal(edit.day, '2026-11-21');
  const again = await R.saveCount(db, { ...edit, pieces: { n500: 4 } }, { id: 'ignored', tillName: 'Bar', name: 'Close', note: 'Recounted', day: '2026-11-21', now: 2000 });
  assert.equal(again.id, 'c1');
  assert.equal(again.createdAt, 1000, 'created time kept');
  assert.equal(again.total, 2000);
  assert.equal(await R.countSaved(db), 1);
  const dup = R.draftFrom(again, 'duplicate');
  assert.equal(dup.savedId, null);
  assert.equal(dup.name, '');
  await R.saveCount(db, dup, { id: 'c2', tillName: 'Bar', name: 'Copy', note: '', day: '2026-11-22', now: 3000 });
  assert.deepEqual((await R.listCounts(db)).map((c) => c.id), ['c2', 'c1'], 'newest day first');
  await R.deleteCount(db, 'c1');
  assert.equal(await R.countSaved(db), 1);
});

test('a removed till keeps its saved counts, under the name they were saved with', async () => {
  const { db } = await freshDb();
  await R.saveTill(db, till('a', 'Safe'));
  await R.saveCount(db, { ...K.emptyDraft('a', 'USD'), pieces: { n10000: 2 } }, { id: 'c1', tillName: 'Safe', name: 'Weekly', note: '', day: '2026-11-22', now: 1 });
  await R.deleteTill(db, 'a');
  const c = await R.getCount(db, 'c1');
  assert.equal(c.tillName, 'Safe');
});

test('a damaged row reads as empty instead of breaking History', async () => {
  const { db, sq } = await freshDb();
  sq.exec(`INSERT INTO counts (id, till_id, till_name, name, note, day, currency, pieces, custom, expected, total, diff, created_at, updated_at)
    VALUES ('z', 't', 'T', 'N', '', '2026-11-22', 'XYZ', '{bad', 'nope', '[]', 0, NULL, 1, 1)`);
  const c = await R.getCount(db, 'z');
  assert.equal(c.currency, 'USD');
  assert.deepEqual(c.pieces, {});
  assert.deepEqual(c.custom, []);
  assert.equal(c.expected.mode, 'none');
});

test('key/value settings', async () => {
  const { db } = await freshDb();
  assert.equal(await R.kvGet(db, 'k'), null);
  await R.kvSet(db, 'k', '1');
  await R.kvSet(db, 'k', '2');
  assert.equal(await R.kvGet(db, 'k'), '2');
  await R.kvDelete(db, 'k');
  assert.equal(await R.kvGet(db, 'k'), null);
});

// ---------- free versus Pro ----------

test('saving: always saved; the paywall opens first on the free fourth save and after, never on an edit or with Pro', () => {
  assert.equal(G.FREE_HISTORY, 3);
  assert.equal(G.saveAsksPro(false, 0, false), false);
  assert.equal(G.saveAsksPro(false, 2, false), false, 'the third save is free');
  assert.equal(G.saveAsksPro(false, 3, false), true, 'the fourth save asks');
  assert.equal(G.saveAsksPro(false, 9, false), true);
  assert.equal(G.saveAsksPro(false, 9, true), false, 'editing a saved count never asks');
  assert.equal(G.saveAsksPro(true, 9, false), false);
});

test('history limits: the free plan shows the last three saved counts and keeps the rest out of sight; Pro shows all', () => {
  const counts = [1, 5, 3, 2, 4].map((n) => ({ id: `c${n}`, createdAt: n }));
  const free = G.visibleHistory(false, counts);
  assert.deepEqual(free.shown.map((c) => c.id), ['c5', 'c4', 'c3']);
  assert.equal(free.hidden, 2);
  const pro = G.visibleHistory(true, counts);
  assert.equal(pro.shown.length, 5);
  assert.equal(pro.hidden, 0);
  assert.deepEqual(G.visibleHistory(false, counts.slice(0, 2)).hidden, 0);
  assert.equal(G.historyLimit(false), 3);
  assert.equal(G.historyLimit(true), null);
});

test('count sheets: the first is free, the same one can go out again, the second count needs Pro', () => {
  assert.deepEqual(G.sheetDecision(false, [], 'a'), { allowed: true, usesFree: true });
  assert.deepEqual(G.sheetDecision(false, ['a'], 'a'), { allowed: true, usesFree: false }, 'never locked out of one that went out');
  assert.deepEqual(G.sheetDecision(false, ['a'], 'b'), { allowed: false, usesFree: false }, 'the second count sheet opens the paywall');
  assert.deepEqual(G.sheetDecision(true, ['a'], 'b'), { allowed: true, usesFree: false });
  assert.deepEqual(G.recordFree(['a'], 'a'), ['a']);
  assert.deepEqual(G.parseIdList('["a","a",3]'), ['a']);
  assert.deepEqual(G.parseIdList('{bad'), []);
});

test('CSV: the first export is free, then Pro', () => {
  assert.deepEqual(G.csvDecision(false, 0), { allowed: true, usesFree: true });
  assert.deepEqual(G.csvDecision(false, 1), { allowed: false, usesFree: false });
  assert.deepEqual(G.csvDecision(true, 5), { allowed: true, usesFree: false });
});

test('tills, deposit helper, custom rows and currencies', () => {
  assert.equal(G.canAddTill(false, 0), true);
  assert.equal(G.canAddTill(false, 1), false, 'a second till opens the paywall');
  assert.equal(G.canAddTill(true, 4), true);
  assert.equal(G.canUseDeposit(false), false);
  assert.equal(G.canUseDeposit(true), true);
  assert.equal(G.canAddCustomRow(false), false);
  assert.equal(G.canAddCustomRow(true), true);
  assert.equal(G.canChangeCurrency(false, 0), true, 'a phone on the wrong region is not stuck before the first save');
  assert.equal(G.canChangeCurrency(false, 1), false);
  assert.equal(G.canChangeCurrency(true, 9), true);
  assert.equal(G.canCount(false), true, 'counting is never gated');
});

// ---------- rating and onboarding ----------

test('rating: after a save on a later day than install, never mid-count, once per launch, once ever, only when StoreKit can', () => {
  assert.equal(U.savedOnLaterDay('2026-11-22', '2026-11-22'), false, 'install day: no');
  assert.equal(U.savedOnLaterDay('2026-11-22', '2026-11-23'), true);
  assert.equal(U.savedOnLaterDay(null, '2026-11-23'), false);
  const ok = { counting: false, askedThisLaunch: false, triggerUsed: false, storeCanAsk: true };
  assert.equal(U.shouldAsk(ok), true);
  assert.equal(U.shouldAsk({ ...ok, counting: true }), false);
  assert.equal(U.shouldAsk({ ...ok, askedThisLaunch: true }), false);
  assert.equal(U.shouldAsk({ ...ok, triggerUsed: true }), false);
  assert.equal(U.shouldAsk({ ...ok, storeCanAsk: false }), false);
  assert.equal(U.afterOnboardingPaywall(false), 'claim');
  assert.equal(U.afterOnboardingPaywall(true), 'app');
  assert.match(U.dayKey(Date.now()), /^\d{4}-\d{2}-\d{2}$/);
});

test('"What are you counting?" only names the first till', () => {
  assert.deepEqual(U.COUNTING_FOR.map((c) => c.label), ['A shop till', 'Tips', 'A collection', 'Savings at home']);
  assert.equal(U.tillNameFor('shop'), 'Front register');
  assert.equal(U.tillNameFor('tips'), 'Tip jar');
  assert.equal(U.tillNameFor(null), 'Till');
});

test('the onboarding sample count is short by a little, in each currency', () => {
  for (const cur of ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'MXN']) {
    const s = S.sampleCount(cur, '2026-11-22', 1);
    assert.ok(s.total > 0 && s.diff < 0, cur);
    assert.equal(s.total, K.countTotals(cur, s.pieces).total);
  }
});
