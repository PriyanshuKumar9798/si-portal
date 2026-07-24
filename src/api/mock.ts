// Mock backend — a fully-stateful in-memory implementation of every endpoint
// in `client.ts`. Enabled by default (see MOCK_ENABLED below) so the app is
// usable end-to-end without a running Nest server. Set
// `EXPO_PUBLIC_USE_MOCK=false` (or wire the real API URL) to route through
// the real fetch pipeline.
//
// Design goals:
//   1. Deterministic — same generator inputs → same SIs, so screenshots are
//      stable across reloads and the flags on the design match.
//   2. Stateful — Save all, Lock, Delete, Generate all mutate the in-memory
//      store and every reader observes the new state.
//   3. Realistic — every screen the design covers has enough seed rows to
//      look "in production", including drafts + locked + exceptions.

import type {
  SiSummary, SiDetail, SiLine, SiException, Discrepancy,
  StoreLite, ExceptionType, SiOrigin, SiTrigger,
  ListSiFilter, GenerateSiRequest, GenerateSiResult, SaveLinesRequest,
  AuthLoginRequest, AuthLoginResponse, ApiError,
} from './types';

// ─── Toggle ────────────────────────────────────────────────────────────────
export const MOCK_ENABLED = (() => {
  // Env override wins.
  const flag = process.env.EXPO_PUBLIC_USE_MOCK;
  if (flag === 'false' || flag === '0') return false;
  if (flag === 'true'  || flag === '1') return true;
  // Default: mock ON when the base URL still points at localhost (no real
  // deploy configured yet). Flip explicitly the day production lands.
  return true;
})();

// ─── Seed data ─────────────────────────────────────────────────────────────

const stores: StoreLite[] = [
  { id: 's-cp',   code: 'BS-1042', name: 'Connaught Place',        warehouse: 'Delhi DC' },
  { id: 's-ind',  code: 'BS-2210', name: 'Indiranagar',            warehouse: 'Bengaluru DC' },
  { id: 's-kor',  code: 'BS-2188', name: 'Koramangala 5th Block',  warehouse: 'Bengaluru DC' },
  { id: 's-cyb',  code: 'BS-1177', name: 'Cyber Hub, Gurugram',    warehouse: 'Delhi DC' },
  { id: 's-pow',  code: 'BS-3301', name: 'Powai',                  warehouse: 'Mumbai DC' },
  { id: 's-hsr',  code: 'BS-2245', name: 'HSR Layout',             warehouse: 'Bengaluru DC' },
  { id: 's-noi',  code: 'BS-1120', name: 'Sector 18, Noida',       warehouse: 'Delhi DC' },
  { id: 's-and',  code: 'BS-3318', name: 'Andheri West',           warehouse: 'Mumbai DC' },
];

// Item catalogue used to seed line items. Deterministic — same store gets the
// same lines so the design mock always reads the same numbers.
const CATALOG: { sku: string; itemName: string; category: string; base: number; bun?: boolean; trimmed?: boolean }[] = [
  { sku: 'BUN-CLS-6IN', itemName: 'Classic Bun 6-inch',        category: 'Buns',      base: 24, bun: true },
  { sku: 'BUN-SES-6IN', itemName: 'Sesame Bun 6-inch',         category: 'Buns',      base: 16, bun: true },
  { sku: 'PAT-VEG-90G', itemName: 'Veg Patty 90 g',            category: 'Patties',   base: 40 },
  { sku: 'PAT-CHK-100G',itemName: 'Chicken Patty 100 g',       category: 'Patties',   base: 32 },
  { sku: 'PAT-MTN-110G',itemName: 'Mutton Patty 110 g',        category: 'Patties',   base: 12 },
  { sku: 'FRY-STK-1KG', itemName: 'Frozen French Fries 1 kg',  category: 'Frozen',    base: 60 },
  { sku: 'LET-ICE-CRT', itemName: 'Iceberg Lettuce (crate)',   category: 'Produce',   base: 20, trimmed: true },
  { sku: 'TOM-RED-CRT', itemName: 'Tomato (crate)',            category: 'Produce',   base: 18 },
  { sku: 'ONI-RED-CRT', itemName: 'Red Onion (crate)',         category: 'Produce',   base: 22, trimmed: true },
  { sku: 'CHE-CHD-1KG', itemName: 'Cheddar Slices 1 kg',       category: 'Dairy',     base: 24 },
  { sku: 'SAU-MAY-5L',  itemName: 'Mayonnaise 5 L',            category: 'Sauces',    base: 8 },
  { sku: 'SAU-KET-5L',  itemName: 'Ketchup 5 L',               category: 'Sauces',    base: 6 },
  { sku: 'PKG-BOX-LG',  itemName: 'Large Burger Box',          category: 'Packaging', base: 500 },
  { sku: 'PKG-BAG-MD',  itemName: 'Medium Carry Bag',          category: 'Packaging', base: 400 },
  { sku: 'BEV-COL-24',  itemName: 'Cola 250ml × 24',           category: 'Beverages', base: 10 },
];

// Deterministic pseudo-random — same (store, sku, day) always yields the same
// number so the mock is stable across reloads. Simple LCG-ish.
function seed(...parts: (string | number)[]): number {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

function todayIsoLocal(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Store — the in-memory database ─────────────────────────────────────────

interface SiRecord extends SiDetail {}
const store: { sis: SiRecord[] } = { sis: [] };

function makeLines(storeId: string, runDate: string): SiLine[] {
  return CATALOG.map((item, i) => {
    const r = seed(storeId, item.sku, runDate);
    // Suggested qty around `base` with ± 30% variance.
    const suggested = Math.max(2, Math.round(item.base * (0.7 + r * 0.6)));
    return {
      id: `${storeId}-${runDate}-${i}`,
      sku: item.sku,
      itemName: item.itemName,
      category: item.category,
      suggestedQty: suggested,
      editedQty: null,
      finalQty: suggested,
      flags: {
        bun: !!item.bun,
        trimmed: !!item.trimmed,
      },
    };
  });
}

// Predefined exception patterns so certain seed stores light up with issues.
const SEED_EXCEPTION_MAP: Record<string, { sku: string; type: ExceptionType; reason: string }[]> = {
  's-cp': [
    { sku: 'PAT-MTN-110G', type: 'NEEDS_ADC',        reason: 'No ADC in the last 21 days. Patty is new or not selling. Confirm active menu.' },
    { sku: 'SAU-MAY-5L',   type: 'FREEZER_OVERCAP',  reason: 'Suggested qty exceeds Delhi DC freezer allocation for this SKU (cap 6, suggested 8).' },
  ],
  's-ind': [
    { sku: 'CHE-CHD-1KG',  type: 'MISSING_CONVERSION', reason: 'No case ⇄ kg conversion factor in the product master. Cannot express suggested qty in cases.' },
  ],
};

function makeExceptions(storeId: string, siId: string, runDate: string): SiException[] {
  const store = stores.find((s) => s.id === storeId);
  if (!store) return [];
  const pattern = SEED_EXCEPTION_MAP[storeId] ?? [];
  return pattern.map((e, i) => {
    const item = CATALOG.find((c) => c.sku === e.sku);
    return {
      id: `${siId}-exc-${i}`,
      siId,
      storeId,
      storeName: store.name,
      storeCode: store.code,
      runDate,
      type: e.type,
      sku: e.sku,
      itemName: item?.itemName ?? e.sku,
      category: item?.category ?? '–',
      reason: e.reason,
    };
  });
}

function makeSi(
  s: StoreLite,
  runDate: string,
  overrides: Partial<Pick<SiSummary, 'origin' | 'trigger' | 'status' | 'leadTimeDays' | 'bufferDays'>> = {},
  createdAtIso?: string,
): SiRecord {
  const id = `si-${s.id}-${runDate}`;
  const origin: SiOrigin = overrides.origin ?? 'auto';
  const trigger: SiTrigger = overrides.trigger ?? 'daily_cron';
  const status = overrides.status ?? 'draft';
  const leadTimeDays = overrides.leadTimeDays ?? (s.warehouse === 'Bengaluru DC' ? 2 : s.warehouse === 'Delhi DC' ? 3 : 4);
  const bufferDays = overrides.bufferDays ?? 2;
  const lines = makeLines(s.id, runDate);
  const exceptions = makeExceptions(s.id, id, runDate);
  const deliveryDate = todayIsoLocal(leadTimeDays);
  // Default createdAt = the nightly cron time (6:15 AM on the runDate).
  // The generate() call passes `now` so manually-created SIs get a real
  // recent timestamp — which is what the SI list's freshness highlight
  // (< 90s = "Just now") reads against.
  const createdAt = createdAtIso ?? new Date(`${runDate}T06:15:00`).toISOString();
  return {
    id, store: s, runDate, origin, trigger, status,
    exceptionCount: exceptions.length,
    leadTimeDays, bufferDays, deliveryDate,
    createdAt,
    lockedAt: status === 'locked' ? new Date(`${runDate}T09:20:00`).toISOString() : null,
    lines, exceptions,
  };
}

// Seed today's SIs the moment the mock loads (mirrors the design's example rows).
(function seedInitial() {
  const t = todayIsoLocal();
  const yesterday = todayIsoLocal(-1);
  const seeds: [string, Partial<Pick<SiSummary, 'origin' | 'trigger' | 'status'>>][] = [
    ['s-cp',  { origin: 'manual', trigger: 'catch_up',   status: 'draft'  }],
    ['s-ind', { origin: 'auto',   trigger: 'daily_cron', status: 'draft'  }],
    ['s-kor', { origin: 'auto',   trigger: 'daily_cron', status: 'draft'  }],
    ['s-cyb', { origin: 'auto',   trigger: 'daily_cron', status: 'draft'  }],
    ['s-pow', { origin: 'manual', trigger: 'catch_up',   status: 'draft'  }],
    ['s-hsr', { origin: 'auto',   trigger: 'daily_cron', status: 'locked' }],
    ['s-noi', { origin: 'auto',   trigger: 'daily_cron', status: 'locked' }],
    ['s-and', { origin: 'auto',   trigger: 'daily_cron', status: 'locked' }],
  ];
  for (const [sid, over] of seeds) {
    const s = stores.find((x) => x.id === sid)!;
    store.sis.push(makeSi(s, t, over));
  }
  // A handful of yesterday's already-locked SIs so the "Yesterday" preset shows history.
  for (const sid of ['s-cp', 's-ind', 's-kor', 's-hsr']) {
    const s = stores.find((x) => x.id === sid)!;
    store.sis.push(makeSi(s, yesterday, { status: 'locked', origin: 'auto', trigger: 'daily_cron' }));
  }
})();

// ─── Latency simulator ──────────────────────────────────────────────────────
// Small random delay so loading states are visible; too slow feels broken.
const wait = (min = 120, max = 320) =>
  new Promise<void>((r) => setTimeout(r, min + Math.floor(Math.random() * (max - min))));

function fail(status: number, message: string, code?: string): never {
  const e: ApiError = { status, message, ...(code && { code }) };
  throw e;
}

// ─── Public API (identical shape to `client.ts`) ────────────────────────────

function toSummary(r: SiRecord): SiSummary {
  const { lines: _l, exceptions: _e, ...rest } = r;
  return rest;
}

export const mockApi = {
  async login(body: AuthLoginRequest): Promise<AuthLoginResponse> {
    await wait();
    // Accept any credentials in the mock.
    const email = body.email?.trim() || 'demo@burgersinghonline.com';
    return {
      token: 'mock-token-' + Math.random().toString(36).slice(2, 10),
      user: {
        id: 'mock-user-1', email,
        name: email.split('@')[0] || 'Demo Owner',
        role: 'store',
        storeIds: stores.map((s) => s.id),
      },
    };
  },

  async listStores(): Promise<StoreLite[]> {
    await wait();
    return stores.slice();
  },

  async listSis(filter: ListSiFilter): Promise<SiSummary[]> {
    await wait();
    let rows = store.sis.slice();
    if (filter.runDate) rows = rows.filter((r) => r.runDate === filter.runDate);
    if (filter.storeIds?.length) {
      const set = new Set(filter.storeIds);
      rows = rows.filter((r) => set.has(r.store.id));
    }
    if (filter.status && filter.status !== 'all') rows = rows.filter((r) => r.status === filter.status);
    // Drafts on top; within each status group, newest createdAt first so a
    // just-generated SI appears at row 1 and pairs with the list's
    // "Just now" freshness highlight (< 90s → yellow tint + pill).
    rows.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'draft' ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return rows.map(toSummary);
  },

  async getSi(id: string): Promise<SiDetail> {
    await wait();
    const r = store.sis.find((x) => x.id === id);
    if (!r) fail(404, 'SI not found', 'NOT_FOUND');
    return JSON.parse(JSON.stringify(r)) as SiDetail;
  },

  async saveLines(id: string, body: SaveLinesRequest): Promise<SiDetail> {
    await wait();
    const r = store.sis.find((x) => x.id === id);
    if (!r) fail(404, 'SI not found');
    if (r.status === 'locked') fail(409, 'This SI is locked and cannot be edited.', 'LOCKED');
    for (const edit of body.edits) {
      const line = r.lines.find((l) => l.id === edit.lineId);
      if (!line) continue;
      line.editedQty = edit.editedQty;
      line.finalQty = edit.editedQty ?? line.suggestedQty;
    }
    return JSON.parse(JSON.stringify(r));
  },

  async lockSi(id: string): Promise<SiDetail> {
    await wait();
    const r = store.sis.find((x) => x.id === id);
    if (!r) fail(404, 'SI not found');
    if (r.status === 'locked') return JSON.parse(JSON.stringify(r));
    r.status = 'locked';
    r.lockedAt = new Date().toISOString();
    return JSON.parse(JSON.stringify(r));
  },

  async deleteSi(id: string): Promise<{ ok: true }> {
    await wait();
    const idx = store.sis.findIndex((x) => x.id === id);
    if (idx === -1) fail(404, 'SI not found');
    if (store.sis[idx].status === 'locked') fail(409, "Locked SIs can't be deleted.", 'LOCKED');
    store.sis.splice(idx, 1);
    return { ok: true };
  },

  async generate(body: GenerateSiRequest): Promise<GenerateSiResult> {
    await wait(400, 900);
    const result: GenerateSiResult = { succeeded: [], failed: [] };
    for (const sid of body.storeIds) {
      const s = stores.find((x) => x.id === sid);
      if (!s) {
        result.failed.push({ storeId: sid, storeName: sid, reason: 'Unknown store id' });
        continue;
      }
      // Rare, non-deterministic failure (~5%) so the partial-failure UX has
      // real exposure without feeling broken. Retries naturally succeed
      // most of the time because the roll is fresh per call.
      if (Math.random() < 0.05) {
        result.failed.push({
          storeId: sid, storeName: s.name,
          reason: 'Rista sync timed out fetching last 21 days of consumption. Retry in a few minutes.',
        });
        continue;
      }
      // Overwrite any existing SI for this store+date. Stamp createdAt as
      // `now` so the SI list's freshness highlight ("Just now" pill + yellow
      // row tint, < 90s window) picks it up as newly-created.
      const existing = store.sis.findIndex((x) => x.store.id === sid && x.runDate === body.runDate);
      const fresh = makeSi(s, body.runDate, {
        origin: 'manual', trigger: 'catch_up', status: 'draft',
        leadTimeDays: body.leadTimeOverrideDays ?? undefined,
        bufferDays: body.bufferDays,
      }, new Date().toISOString());
      if (existing >= 0) store.sis[existing] = fresh;
      else store.sis.push(fresh);
      result.succeeded.push({ storeId: sid, siId: fresh.id });
    }
    return result;
  },

  async listExceptions(params: { runDate?: string; types?: string[] } = {}): Promise<SiException[]> {
    await wait();
    const flat: SiException[] = [];
    for (const r of store.sis) flat.push(...r.exceptions);
    let rows = flat;
    if (params.runDate) rows = rows.filter((x) => x.runDate === params.runDate);
    if (params.types?.length) {
      const set = new Set(params.types);
      rows = rows.filter((x) => set.has(x.type));
    }
    return rows;
  },

  async listDiscrepancies(params: { runDate?: string; storeIds?: string[]; types?: string[] } = {}): Promise<Discrepancy[]> {
    await wait();
    // Discrepancies = exceptions of type UNMAPPED or MISSING_CONVERSION.
    // Seed also injects a few pure discrepancies unattached to today's SIs.
    const fromSis: Discrepancy[] = [];
    for (const r of store.sis) {
      for (const e of r.exceptions) {
        if (e.type === 'UNMAPPED' || e.type === 'MISSING_CONVERSION') {
          fromSis.push({
            id: e.id,
            type: e.type,
            storeId: e.storeId, storeName: e.storeName, storeCode: e.storeCode,
            sku: e.sku, itemName: e.itemName, category: e.category,
            runDate: e.runDate, reason: e.reason,
          });
        }
      }
    }
    // Extra seed rows — long-tail data-cleanup issues that aren't tied to a
    // specific SI (typical of newly onboarded stores that haven't imported
    // their master yet).
    const t = todayIsoLocal();
    const extras: Discrepancy[] = [
      { id: 'disc-1', type: 'UNMAPPED', storeId: 's-and', storeName: 'Andheri West', storeCode: 'BS-3318',
        sku: 'BUN-BRC-6IN', itemName: 'Brioche Bun 6-inch', category: 'Buns', runDate: t,
        reason: 'SKU exists in Rista but not in the product master. Add it before the next SI run.' },
      { id: 'disc-2', type: 'MISSING_CONVERSION', storeId: 's-pow', storeName: 'Powai', storeCode: 'BS-3301',
        sku: 'FRY-CRK-800G', itemName: 'Crinkle Fries 800 g', category: 'Frozen', runDate: t,
        reason: 'Pack size is grams; case unit is pieces. Add a g ⇄ case conversion factor.' },
      { id: 'disc-3', type: 'UNMAPPED', storeId: 's-noi', storeName: 'Sector 18, Noida', storeCode: 'BS-1120',
        sku: 'DIP-CHZ-500G', itemName: 'Cheese Dip 500 g', category: 'Sauces', runDate: t,
        reason: 'Item appeared on the latest DC catalogue but has no store mapping.' },
    ];
    let rows = [...fromSis, ...extras];
    if (params.runDate) rows = rows.filter((r) => r.runDate === params.runDate);
    if (params.types?.length) {
      const set = new Set(params.types);
      rows = rows.filter((r) => set.has(r.type));
    }
    if (params.storeIds?.length) {
      const set = new Set(params.storeIds);
      rows = rows.filter((r) => set.has(r.storeId));
    }
    return rows;
  },
};

export type MockApi = typeof mockApi;
