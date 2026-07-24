// Global dirty-state registry — one place any screen can report "I have
// unsaved edits" and any nav callsite can consult before letting the user
// leave. Deliberately module-level (not context) so `guardNav` can be
// imported into small handlers like BackLink or a NavList item without
// dragging a provider through the tree.
//
// Coverage:
//   1. Browser exit (tab close, refresh, address-bar nav) — a `beforeunload`
//      listener is installed while any screen has dirty > 0. The browser's
//      native "unsaved changes" prompt fires; the exact copy is browser-
//      controlled, so we only signal intent.
//   2. In-app navigation — every nav handler (BackLink, top nav, logo click)
//      wraps its onPress with `guardNav(next)`. When dirty, we show a
//      synchronous `window.confirm`; on cancel, `next` is dropped and the
//      user stays put.
//
// The registry is a WeakMap-free single global because there is only ever
// one dirty owner in this app at a time — the SI Detail screen. If we ever
// stack dirty owners, migrate to a Map keyed by owner id and check any > 0.

import { useEffect } from 'react';
import { Platform } from 'react-native';

interface DirtyState {
  count: number;
  message: string;
}

// Module-level. Reads via `guardNav`, writes via `useSetDirty`.
let state: DirtyState = { count: 0, message: 'You have unsaved edits. Leave without saving?' };

// A single beforeunload listener is installed on first dirty, removed on
// last clean. Keeping it always-on would work but pollutes navigation events
// for pages that never dirty anything.
let beforeUnloadInstalled = false;
function ensureBeforeUnload() {
  if (Platform.OS !== 'web' || beforeUnloadInstalled) return;
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
    if (state.count <= 0) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });
  beforeUnloadInstalled = true;
}

/**
 * Report the current dirty state of a screen. Auto-clears on unmount so a
 * screen navigating away never leaves stale dirty flags behind — the very
 * bug that made the floating bar leak across routes.
 */
export function useSetDirty(dirty: boolean, message?: string) {
  useEffect(() => {
    ensureBeforeUnload();
    const prev = state;
    state = { count: dirty ? 1 : 0, message: message ?? prev.message };
    return () => {
      // Always drop the flag on unmount, even mid-transition. Prevents the
      // "screen unmounted but dirty state persisted" class of bug.
      state = { count: 0, message: state.message };
    };
  }, [dirty, message]);
}

// A React provider registers itself here so `guardNav` can bridge from a
// plain module-level function into the app's own confirmation modal. Kept
// as a mutable module ref rather than a context so callsites like NavList
// and BackLink can import `guardNav` without dragging a hook through.
type ShowConfirmFn = (message: string, onConfirm: () => void, onCancel?: () => void) => void;
let registeredShowConfirm: ShowConfirmFn | null = null;
export function registerConfirmHandler(fn: ShowConfirmFn | null) {
  registeredShowConfirm = fn;
}

/**
 * Wrap any navigation callback. If a screen has reported dirty, show the
 * app's own confirm dialog before running `next`. Falls back to native
 * `window.confirm` on web only if the provider hasn't mounted yet
 * (shouldn't happen after boot). On native, no synchronous confirm exists —
 * the floating bar already communicates the risk visually, so we fall
 * through to `next`.
 */
export function guardNav(next: () => void) {
  if (state.count <= 0) { next(); return; }
  if (registeredShowConfirm) {
    registeredShowConfirm(state.message, next);
    return;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(state.message)) next();
    return;
  }
  next();
}

/**
 * Back-compat shim. The old `useUnsavedChangesGuard` hook returned a guard
 * callback that consumers passed into BackLink. We keep that signature so
 * existing calls don't need to move, but the returned guard now delegates
 * to the module-level `guardNav`.
 */
export function useUnsavedChangesGuard(dirty: boolean, message?: string) {
  useSetDirty(dirty, message);
  return guardNav;
}
