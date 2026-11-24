/**
 * Everything the screens read and write, over the SQLite database: the
 * tills, the saved counts, the count in progress (kept as you go, so
 * closing the app mid-count loses nothing), the rows each currency shows,
 * and a few settings. Screens call these actions; nothing else touches the
 * database.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getDb } from './db/native';
import * as repo from './db/repo';
import type { Till } from './db/repo';
import type { CurrencyCode } from './currencies';
import { currencyForRegion, paperForRegion } from './currencies';
import type { CustomAmount, Draft, Expected } from './count';
import { addPack, emptyDraft, isBlank, newId, NO_EXPECTED, parseDraft, stepQty } from './count';
import { cleanQty } from './money';
import type { SavedCount } from './history';
import { nameForTill } from './history';
import type { RowSetup } from './rows';
import { parseRowSetup } from './rows';
import type { Paper } from './pdf/layout';
import { isoDay } from './dates';
import { CURRENCIES } from './currencies';
import { phoneLocale, PhoneLocale } from './locale';

const K = {
  draft: 'count.draft',
  installDay: 'install.day',
  /** Set once the person has added a roll, bag or strap; the count screen's hint then goes away. */
  packHint: 'hint.packAdded',
  rows: (c: CurrencyCode) => `rows.${c}`,
};

interface Data {
  loaded: boolean;
  failed: string | null;
  locale: PhoneLocale;
  paper: Paper;
  installDay: string | null;
  /** True once the hold sheet has been opened (or a roll, bag or strap added); until then the count screen shows how. */
  packHintDone: boolean;
  /** Retires the hint for good: the hold sheet was opened. */
  retirePackHint: () => void;
  tills: Till[];
  /** The till the count on screen is for. */
  till: Till;
  counts: SavedCount[];
  draft: Draft;
  rowSetup: (c: CurrencyCode) => RowSetup;
  setQty: (id: string, qty: number) => void;
  bump: (id: string, delta: number) => void;
  addPackTo: (id: string) => void;
  setCustom: (row: CustomAmount) => void;
  setExpected: (e: Expected) => void;
  clearDraft: () => void;
  /** Puts a saved count on the count screen, to edit it or to start a new count from it. */
  openDraft: (c: SavedCount, mode: 'edit' | 'duplicate') => void;
  switchTill: (id: string) => void;
  saveDraft: (meta: { name: string; note: string; day: string; tillId: string }) => Promise<SavedCount>;
  removeCount: (id: string) => Promise<void>;
  saveTill: (t: Till) => Promise<void>;
  addTill: (name: string, currency: CurrencyCode) => Promise<Till>;
  removeTill: (id: string) => Promise<void>;
  setTillCurrency: (id: string, currency: CurrencyCode) => Promise<void>;
  saveRowSetup: (c: CurrencyCode, s: RowSetup) => Promise<void>;
}

const Ctx = createContext<Data | null>(null);

const FALLBACK_TILL: Till = { id: 'pending', name: 'Till', currency: 'USD', float: 0, position: 0, createdAt: 0, updatedAt: 0 };

export function DataProvider({ children }: { children: React.ReactNode }) {
  const locale = useMemo(phoneLocale, []);
  const paper = useMemo(() => paperForRegion(locale.region), [locale]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [installDay, setInstallDay] = useState<string | null>(null);
  const [packHintDone, setPackHintDone] = useState(true);
  const [tills, setTills] = useState<Till[]>([]);
  const [counts, setCounts] = useState<SavedCount[]>([]);
  const [draft, setDraftState] = useState<Draft>(() => emptyDraft(FALLBACK_TILL.id, currencyForRegion(locale.region, locale.currency)));
  const [setups, setSetups] = useState<Partial<Record<CurrencyCode, RowSetup>>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const reloadCounts = useCallback(async () => setCounts(await repo.listCounts(await getDb())), []);
  const reloadTills = useCallback(async () => {
    const list = await repo.listTills(await getDb());
    setTills(list);
    return list;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        let day = await repo.kvGet(db, K.installDay);
        if (!day) {
          day = isoDay(Date.now());
          await repo.kvSet(db, K.installDay, day);
        }
        setInstallDay(day);
        setPackHintDone((await repo.kvGet(db, K.packHint)) === '1');
        let list = await repo.listTills(db);
        if (list.length === 0) {
          // The first till: named on the last onboarding screen, in the region's currency.
          const now = Date.now();
          await repo.saveTill(db, { id: newId(), name: 'Till', currency: currencyForRegion(locale.region, locale.currency), float: 0, position: 0, createdAt: now, updatedAt: now });
          list = await repo.listTills(db);
        }
        setTills(list);
        const s: Partial<Record<CurrencyCode, RowSetup>> = {};
        for (const c of Object.keys(CURRENCIES) as CurrencyCode[]) s[c] = parseRowSetup(c, await repo.kvGet(db, K.rows(c)));
        setSetups(s);
        const stored = parseDraft(await repo.kvGet(db, K.draft));
        const till = list.find((t) => t.id === stored?.tillId) ?? list[0];
        setDraftState(stored && list.some((t) => t.id === stored.tillId) ? stored : emptyDraft(till.id, till.currency));
        await reloadCounts();
        setLoaded(true);
      } catch (e: any) {
        setFailed(e?.message ?? 'The database did not open.');
        setLoaded(true);
      }
    })();
  }, [locale, reloadCounts]);

  /** Every change to the count is kept, 300 ms after the last tap. */
  const setDraft = useCallback((fn: (d: Draft) => Draft) => {
    setDraftState((d) => {
      const next = fn(d);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        getDb()
          .then((db) => repo.kvSet(db, K.draft, JSON.stringify(next)))
          .catch(() => {});
      }, 300);
      return next;
    });
  }, []);

  const till = tills.find((t) => t.id === draft.tillId) ?? tills[0] ?? FALLBACK_TILL;
  const tillRef = useRef(till);
  tillRef.current = till;

  const rowSetup = useCallback((c: CurrencyCode) => setups[c] ?? { overrides: {}, custom: [] }, [setups]);

  const setQty = useCallback((id: string, qty: number) => setDraft((d) => ({ ...d, pieces: { ...d.pieces, [id]: cleanQty(qty) } })), [setDraft]);
  const bump = useCallback((id: string, delta: number) => setDraft((d) => ({ ...d, pieces: { ...d.pieces, [id]: stepQty(d.pieces[id] ?? 0, delta) } })), [setDraft]);
  /** The hold sheet opened, or a roll, bag or strap was added: the hint has done its job, now and after a restart. */
  const retirePackHint = useCallback(() => {
    setPackHintDone(true);
    getDb()
      .then((db) => repo.kvSet(db, K.packHint, '1'))
      .catch(() => {});
  }, []);

  const addPackTo = useCallback(
    (id: string) => {
      const den = CURRENCIES[draftRef.current.currency].denominations.find((x) => x.id === id);
      if (den?.pack) retirePackHint();
      setDraft((d) => {
        const dd = CURRENCIES[d.currency].denominations.find((x) => x.id === id);
        return dd ? { ...d, pieces: { ...d.pieces, [id]: addPack(d.pieces[id] ?? 0, dd) } } : d;
      });
    },
    [setDraft, retirePackHint]
  );
  const setCustom = useCallback(
    (row: CustomAmount) =>
      setDraft((d) => {
        const has = d.custom.some((c) => c.id === row.id);
        return { ...d, custom: has ? d.custom.map((c) => (c.id === row.id ? row : c)) : [...d.custom, row] };
      }),
    [setDraft]
  );
  const setExpected = useCallback((e: Expected) => setDraft((d) => ({ ...d, expected: e })), [setDraft]);

  /** A fresh count for the same till; the way the expected amount was entered stays, with the till's float. */
  const freshFor = (t: Till, prev?: Expected): Draft => emptyDraft(t.id, t.currency, prev && prev.mode !== 'none' ? { ...NO_EXPECTED, mode: prev.mode, float: t.float } : NO_EXPECTED);

  const clearDraft = useCallback(() => setDraft((d) => freshFor(tillRef.current, d.expected)), [setDraft]);

  const openDraft = useCallback((c: SavedCount, mode: 'edit' | 'duplicate') => setDraft(() => repo.draftFrom(c, mode)), [setDraft]);

  const switchTill = useCallback(
    (id: string) => {
      const t = tills.find((x) => x.id === id);
      if (!t) return;
      // A count in progress moves with its pieces; a default name follows the new till, a typed one stays.
      setDraft((d) => {
        if (isBlank(d) || d.currency !== t.currency) return freshFor(t, d.expected);
        const from = tills.find((x) => x.id === d.tillId)?.name ?? '';
        return { ...d, tillId: t.id, name: nameForTill(d.name, from) };
      });
    },
    [tills, setDraft]
  );

  const saveDraft = useCallback(
    async (meta: { name: string; note: string; day: string; tillId: string }) => {
      const db = await getDb();
      const d = draftRef.current;
      const t = tills.find((x) => x.id === meta.tillId) ?? tillRef.current;
      const saved = await repo.saveCount(db, { ...d, tillId: t.id }, { id: newId(), tillName: t.name, name: meta.name, note: meta.note, day: meta.day, now: Date.now() });
      await reloadCounts();
      // The count is in History now; the screen starts the next one.
      const next = freshFor(t, d.expected);
      setDraftState(next);
      await repo.kvSet(db, K.draft, JSON.stringify(next));
      return saved;
    },
    [tills, reloadCounts]
  );

  const removeCount = useCallback(
    async (id: string) => {
      await repo.deleteCount(await getDb(), id);
      setDraft((d) => (d.savedId === id ? { ...d, savedId: null } : d));
      await reloadCounts();
    },
    [reloadCounts, setDraft]
  );

  const saveTill = useCallback(
    async (t: Till) => {
      await repo.saveTill(await getDb(), { ...t, updatedAt: Date.now() });
      await reloadTills();
    },
    [reloadTills]
  );

  const addTill = useCallback(
    async (name: string, currency: CurrencyCode) => {
      const now = Date.now();
      const t: Till = { id: newId(), name: name.trim() || 'Till', currency, float: 0, position: tills.length, createdAt: now, updatedAt: now };
      await repo.saveTill(await getDb(), t);
      await reloadTills();
      return t;
    },
    [tills.length, reloadTills]
  );

  const removeTill = useCallback(
    async (id: string) => {
      if (tills.length <= 1) return;
      await repo.deleteTill(await getDb(), id);
      const list = await reloadTills();
      if (draftRef.current.tillId === id && list[0]) setDraft((d) => (isBlank(d) || d.currency !== list[0].currency ? freshFor(list[0], d.expected) : { ...d, tillId: list[0].id }));
    },
    [tills.length, reloadTills, setDraft]
  );

  const setTillCurrency = useCallback(
    async (id: string, currency: CurrencyCode) => {
      const t = tills.find((x) => x.id === id);
      if (!t || t.currency === currency) return;
      const next = { ...t, currency, updatedAt: Date.now() };
      await repo.saveTill(await getDb(), next);
      await reloadTills();
      // The count on screen follows its till into the new currency (pieces of the old one do not carry over).
      if (draftRef.current.tillId === id) setDraft((d) => freshFor(next, d.expected));
    },
    [tills, reloadTills, setDraft]
  );

  const saveRowSetup = useCallback(async (c: CurrencyCode, s: RowSetup) => {
    setSetups((all) => ({ ...all, [c]: s }));
    await repo.kvSet(await getDb(), K.rows(c), JSON.stringify(s));
  }, []);

  const value = useMemo<Data>(
    () => ({
      loaded,
      failed,
      locale,
      paper,
      installDay,
      packHintDone,
      retirePackHint,
      tills,
      till,
      counts,
      draft,
      rowSetup,
      setQty,
      bump,
      addPackTo,
      setCustom,
      setExpected,
      clearDraft,
      openDraft,
      switchTill,
      saveDraft,
      removeCount,
      saveTill,
      addTill,
      removeTill,
      setTillCurrency,
      saveRowSetup,
    }),
    [loaded, failed, locale, paper, installDay, packHintDone, retirePackHint, tills, till, counts, draft, rowSetup, setQty, bump, addPackTo, setCustom, setExpected, clearDraft, openDraft, switchTill, saveDraft, removeCount, saveTill, addTill, removeTill, setTillCurrency, saveRowSetup]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): Data {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
