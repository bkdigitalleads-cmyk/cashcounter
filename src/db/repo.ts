/**
 * Reading and writing the database through the Db interface. No native
 * imports: the app passes expo-sqlite, the tests pass node:sqlite, and the
 * same SQL runs on both.
 */
import type { Db } from './schema.ts';
import type { CurrencyCode } from '../currencies.ts';
import { isCurrencyCode } from '../currencies.ts';
import type { Draft } from '../count.ts';
import { cleanCustom, cleanExpected, cleanPieces, countTotals, difference } from '../count.ts';
import type { SavedCount } from '../history.ts';
import { cleanAmount } from '../money.ts';

// ---------- key/value ----------

export async function kvGet(db: Db, key: string): Promise<string | null> {
  const r = await db.get<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  return r ? r.value : null;
}

export async function kvSet(db: Db, key: string, value: string): Promise<void> {
  await db.run('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

export async function kvDelete(db: Db, key: string): Promise<void> {
  await db.run('DELETE FROM kv WHERE key = ?', [key]);
}

// ---------- tills ----------

export interface Till {
  id: string;
  name: string;
  currency: CurrencyCode;
  /** The float usually left in it, minor units (the deposit helper and "float plus sales" start from it). */
  float: number;
  position: number;
  createdAt: number;
  updatedAt: number;
}

type TillRow = { id: string; name: string; currency: string; float: number; position: number; created_at: number; updated_at: number };

const toTill = (r: TillRow): Till => ({
  id: r.id,
  name: r.name,
  currency: isCurrencyCode(r.currency) ? r.currency : 'USD',
  float: cleanAmount(r.float),
  position: r.position,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function listTills(db: Db): Promise<Till[]> {
  return (await db.all<TillRow>('SELECT * FROM tills ORDER BY position, created_at')).map(toTill);
}

export async function saveTill(db: Db, t: Till): Promise<void> {
  await db.run(
    `INSERT INTO tills (id, name, currency, float, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, currency = excluded.currency, float = excluded.float, position = excluded.position, updated_at = excluded.updated_at`,
    [t.id, t.name.trim().slice(0, 40) || 'Till', t.currency, cleanAmount(t.float), t.position, t.createdAt, t.updatedAt]
  );
}

/** Removes a till. Its saved counts stay in History under the name they were saved with. */
export async function deleteTill(db: Db, id: string): Promise<void> {
  await db.run('DELETE FROM tills WHERE id = ?', [id]);
}

// ---------- saved counts ----------

type CountRow = {
  id: string;
  till_id: string;
  till_name: string;
  name: string;
  note: string;
  day: string;
  currency: string;
  pieces: string;
  custom: string;
  expected: string;
  total: number;
  diff: number | null;
  created_at: number;
  updated_at: number;
};

function json(s: string, fallback: unknown): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

/** A row read back; damaged JSON reads as empty rather than failing History. */
export function toCount(r: CountRow): SavedCount {
  const currency: CurrencyCode = isCurrencyCode(r.currency) ? r.currency : 'USD';
  return {
    id: r.id,
    tillId: r.till_id,
    tillName: r.till_name,
    name: r.name,
    note: r.note,
    day: r.day,
    currency,
    pieces: cleanPieces(currency, json(r.pieces, {})),
    custom: cleanCustom(json(r.custom, [])),
    expected: cleanExpected(json(r.expected, {})),
    total: r.total,
    diff: r.diff,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listCounts(db: Db): Promise<SavedCount[]> {
  return (await db.all<CountRow>('SELECT * FROM counts ORDER BY day DESC, created_at DESC')).map(toCount);
}

export async function getCount(db: Db, id: string): Promise<SavedCount | null> {
  const r = await db.get<CountRow>('SELECT * FROM counts WHERE id = ?', [id]);
  return r ? toCount(r) : null;
}

export async function countSaved(db: Db): Promise<number> {
  const r = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM counts');
  return Number(r?.n ?? 0);
}

/**
 * Saves the draft as a count (a new one, or over the saved one it reopened).
 * The total and the difference are worked out here from the pieces, so the
 * list can never disagree with the count.
 */
export async function saveCount(db: Db, draft: Draft, meta: { id: string; tillName: string; name: string; note: string; day: string; now: number }): Promise<SavedCount> {
  const pieces = cleanPieces(draft.currency, draft.pieces);
  const custom = cleanCustom(draft.custom).filter((c) => c.amount > 0);
  const expected = cleanExpected(draft.expected);
  const t = countTotals(draft.currency, pieces, custom);
  const diff = difference(t.total, expected);
  const existing = draft.savedId ? await getCount(db, draft.savedId) : null;
  const saved: SavedCount = {
    id: existing ? existing.id : meta.id,
    tillId: draft.tillId,
    tillName: meta.tillName,
    name: meta.name.trim().slice(0, 60),
    note: meta.note.trim().slice(0, 500),
    day: meta.day,
    currency: draft.currency,
    pieces,
    custom,
    expected,
    total: t.total,
    diff,
    createdAt: existing ? existing.createdAt : meta.now,
    updatedAt: meta.now,
  };
  await db.run(
    `INSERT INTO counts (id, till_id, till_name, name, note, day, currency, pieces, custom, expected, total, diff, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET till_id = excluded.till_id, till_name = excluded.till_name, name = excluded.name, note = excluded.note, day = excluded.day,
       currency = excluded.currency, pieces = excluded.pieces, custom = excluded.custom, expected = excluded.expected, total = excluded.total, diff = excluded.diff, updated_at = excluded.updated_at`,
    [saved.id, saved.tillId, saved.tillName, saved.name, saved.note, saved.day, saved.currency, JSON.stringify(pieces), JSON.stringify(custom), JSON.stringify(expected), saved.total, saved.diff, saved.createdAt, saved.updatedAt]
  );
  return saved;
}

export async function deleteCount(db: Db, id: string): Promise<void> {
  await db.run('DELETE FROM counts WHERE id = ?', [id]);
}

/** A saved count as a draft on the count screen: to edit it (keeps its id) or to start a new one from it (duplicate). */
export function draftFrom(c: SavedCount, mode: 'edit' | 'duplicate'): Draft {
  return {
    savedId: mode === 'edit' ? c.id : null,
    tillId: c.tillId,
    currency: c.currency,
    pieces: { ...c.pieces },
    custom: c.custom.map((x) => ({ ...x })),
    expected: { ...c.expected },
    name: mode === 'edit' ? c.name : '',
    note: mode === 'edit' ? c.note : '',
    day: mode === 'edit' ? c.day : null,
  };
}
