// CSV helpers — web triggers a real download; native gets the string back so
// the caller can hand it to Share/expo-sharing later. Keeps helpers pure so
// they're testable.

import { Platform } from 'react-native';

/** Escape a cell so commas / quotes / newlines are safe in CSV. */
export function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV blob from column defs + rows. */
export function buildCsv<T>(cols: { header: string; get: (r: T) => unknown }[], rows: T[]): string {
  const header = cols.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((r) => cols.map((c) => escapeCell(c.get(r))).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

/** Trigger a download on web; return the string on native for the caller to
 *  hand off to expo-sharing. */
export async function downloadCsv(filename: string, csv: string): Promise<void> {
  if (Platform.OS !== 'web') {
    // Native flow needs `expo-sharing` (not installed in this scaffold to
    // keep the dep list minimal). Log for now — the caller can Share later.
    console.log(`[csv] would share ${filename}`, csv.slice(0, 200));
    return;
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
