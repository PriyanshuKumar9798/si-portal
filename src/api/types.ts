// API type contract — mirrors the NestJS backend at `EXPO_PUBLIC_API_URL`.
// Field names are frozen; enum values are lowercase; dates travel as ISO
// strings on the wire.

export type SiStatus = 'draft' | 'locked';
export type SiOrigin = 'auto' | 'manual';
export type SiTrigger = 'daily_cron' | 'catch_up' | 'manual' | 'admin_backfill';

export interface StoreLite {
  id: string;
  code: string;                 // e.g. "BS-1042"
  name: string;                 // e.g. "Connaught Place"
  warehouse: string;            // DC that serves this store, e.g. "Delhi DC"
}

export interface SiSummary {
  id: string;
  store: StoreLite;
  runDate: string;              // ISO YYYY-MM-DD
  origin: SiOrigin;
  trigger: SiTrigger;
  status: SiStatus;
  exceptionCount: number;
  leadTimeDays: number;
  bufferDays: number;
  deliveryDate: string;         // ISO YYYY-MM-DD
  createdAt: string;            // ISO datetime
  lockedAt: string | null;
}

export interface SiLine {
  id: string;
  sku: string;
  itemName: string;
  category: string;
  suggestedQty: number;         // cases
  editedQty: number | null;     // cases, null = untouched
  finalQty: number;             // cases (= editedQty ?? suggestedQty)
  flags: {
    bun: boolean;
    trimmed: boolean;
  };
}

export type ExceptionType =
  | 'NEEDS_ADC'
  | 'UNMAPPED'
  | 'ADC_ZERO'
  | 'FREEZER_OVERCAP'
  | 'MISSING_CONVERSION';

export interface SiException {
  id: string;
  siId: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  runDate: string;
  type: ExceptionType;
  sku: string;
  itemName: string;
  category: string;
  reason: string;
}

/** SI detail = summary + lines + exceptions attached to this SI. */
export interface SiDetail extends SiSummary {
  lines: SiLine[];
  exceptions: SiException[];
}

/** Cross-store discrepancy feed row (subset of ExceptionType). */
export interface Discrepancy {
  id: string;
  type: Extract<ExceptionType, 'UNMAPPED' | 'MISSING_CONVERSION'>;
  storeId: string;
  storeName: string;
  storeCode: string;
  sku: string;
  itemName: string;
  category: string;
  runDate: string;
  reason: string;
}

// ─── Requests ───────────────────────────────────────────────────────────────

export interface ListSiFilter {
  runDate?: string;             // ISO YYYY-MM-DD
  storeIds?: string[];
  status?: SiStatus | 'all';
}

export interface GenerateSiRequest {
  storeIds: string[];
  runDate: string;              // ISO YYYY-MM-DD
  bufferDays: number;
  leadTimeOverrideDays?: number | null;
}

export interface GenerateSiResult {
  succeeded: { storeId: string; siId: string }[];
  failed:    { storeId: string; storeName: string; reason: string }[];
}

export interface SaveLinesRequest {
  edits: { lineId: string; editedQty: number | null }[];
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}
export interface AuthLoginResponse {
  token: string;                // JWT
  user: {
    id: string;
    email: string;
    name: string;
    role: 'store' | 'cluster' | 'central' | 'admin';
    storeIds: string[];         // scoping — never trust the client, backend re-checks
  };
}

// ─── Error shape (matches Nest's default ExceptionFilter shape) ─────────────
export interface ApiError {
  status: number;
  message: string;
  code?: string;
}
