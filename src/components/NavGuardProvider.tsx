// NavGuardProvider — bridges the module-level `guardNav` from
// useUnsavedChangesGuard into the app's own ConfirmDialog, so leaving a
// dirty screen prompts with a styled modal instead of the ugly native
// `window.confirm`.
//
// The provider registers itself as the confirm handler on mount. When
// `guardNav(next)` is called anywhere in the app while a screen is dirty,
// this provider pops the dialog and only invokes `next` on user confirm.
// Cancel drops the pending nav silently — same semantics as before, better
// visuals.

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { registerConfirmHandler } from '../hooks/useUnsavedChangesGuard';

interface Pending {
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function NavGuardProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    // Register our modal as the confirm handler. On unmount, restore null
    // so `guardNav` falls back to native `window.confirm` — that keeps the
    // guardrail alive during hot reloads or provider swaps.
    registerConfirmHandler((message, onConfirm, onCancel) => {
      setPending({ message, onConfirm, onCancel });
    });
    return () => registerConfirmHandler(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!pending) return;
    // Snapshot the callback before clearing state — running it after
    // setPending(null) means the dialog is already dismissed by the time
    // the caller's navigation kicks in, which feels snappier than the
    // "confirm → freeze → nav" flow you get on native window.confirm.
    const next = pending.onConfirm;
    setPending(null);
    next();
  }, [pending]);

  const handleCancel = useCallback(() => {
    if (!pending) return;
    const cancel = pending.onCancel;
    setPending(null);
    cancel?.();
  }, [pending]);

  return (
    <>
      {children}
      {pending && (
        <ConfirmDialog
          title="Leave without saving?"
          body={pending.message}
          confirmLabel="Leave"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          tone="danger"
        />
      )}
    </>
  );
}
