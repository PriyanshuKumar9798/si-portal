// REST client → NestJS backend. Reads the base URL from EXPO_PUBLIC_API_URL
// (see .env.example). Never hardcodes a host so the same build works locally
// against `pnpm dev:server` and against a staging URL.
//
// Auth: pulls the JWT from AuthContext via a lazily-registered getter so we
// don't pull React state through here. AuthContext registers the getter on
// sign-in / sign-out.

import type {
  SiSummary, SiDetail, SiException, Discrepancy,
  ListSiFilter, GenerateSiRequest, GenerateSiResult,
  SaveLinesRequest, AuthLoginRequest, AuthLoginResponse, ApiError,
} from './types';
import { MOCK_ENABLED, mockApi } from './mock';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ||
  'http://localhost:3001';

let tokenGetter: (() => string | null) = () => null;
export function configureAuth(getter: () => string | null) {
  tokenGetter = getter;
}

async function req<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = tokenGetter();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const contentType = res.headers.get('content-type') || '';
  const raw = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      message:
        typeof raw === 'string'
          ? raw || `Request failed (${res.status})`
          : raw?.message || `Request failed (${res.status})`,
      code: typeof raw === 'object' ? raw?.code : undefined,
    };
    throw err;
  }
  return raw as T;
}

function qs(filter: ListSiFilter): string {
  const p = new URLSearchParams();
  if (filter.runDate) p.set('runDate', filter.runDate);
  if (filter.storeIds?.length) p.set('storeIds', filter.storeIds.join(','));
  if (filter.status && filter.status !== 'all') p.set('status', filter.status);
  const s = p.toString();
  return s ? `?${s}` : '';
}

// Every endpoint below routes through the mock when MOCK_ENABLED is true,
// otherwise hits the real Nest backend. The mock is a full in-memory server
// (see ./mock.ts) — Save all, Lock, Delete, Generate all persist for the
// session, so every screen can be exercised end-to-end without a running API.
const realApi = {
  login: (body: AuthLoginRequest) =>
    req<AuthLoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  listSis: (filter: ListSiFilter) =>
    req<SiSummary[]>(`/sis${qs(filter)}`, { method: 'GET' }),
  getSi: (id: string) =>
    req<SiDetail>(`/sis/${encodeURIComponent(id)}`, { method: 'GET' }),
  saveLines: (id: string, body: SaveLinesRequest) =>
    req<SiDetail>(`/sis/${encodeURIComponent(id)}/lines`, {
      method: 'PATCH', body: JSON.stringify(body),
    }),
  lockSi: (id: string) =>
    req<SiDetail>(`/sis/${encodeURIComponent(id)}/lock`, { method: 'POST' }),
  deleteSi: (id: string) =>
    req<{ ok: true }>(`/sis/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  generate: (body: GenerateSiRequest) =>
    req<GenerateSiResult>('/sis/generate', { method: 'POST', body: JSON.stringify(body) }),
  listStores: () =>
    req<{ id: string; code: string; name: string; warehouse: string }[]>(
      '/stores', { method: 'GET' },
    ),
  listExceptions: (params: { runDate?: string; types?: string[] } = {}) => {
    const p = new URLSearchParams();
    if (params.runDate) p.set('runDate', params.runDate);
    if (params.types?.length) p.set('types', params.types.join(','));
    const s = p.toString();
    return req<SiException[]>(`/exceptions${s ? `?${s}` : ''}`, { method: 'GET' });
  },
  listDiscrepancies: (params: { runDate?: string; storeIds?: string[]; types?: string[] } = {}) => {
    const p = new URLSearchParams();
    if (params.runDate) p.set('runDate', params.runDate);
    if (params.storeIds?.length) p.set('storeIds', params.storeIds.join(','));
    if (params.types?.length) p.set('types', params.types.join(','));
    const s = p.toString();
    return req<Discrepancy[]>(`/discrepancies${s ? `?${s}` : ''}`, { method: 'GET' });
  },
};

export const api = MOCK_ENABLED ? mockApi : realApi;

export type Api = typeof api;
