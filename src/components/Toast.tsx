// Toast — light, ephemeral confirmation messages for after-action feedback
// (e.g. "Saved 2 edits", "SI locked", "Draft deleted"). Portals into
// document.body on web so nothing above it (ScrollView transforms, cards
// with `overflow: hidden`) can trap it inside a scrolled region.
//
// Design choices:
//   • One provider at the app root, `useToast()` anywhere in the tree.
//   • Multiple toasts stack top-down at top-right. First-out is the oldest.
//   • Auto-dismiss after 3.5s (tuneable per call).
//   • Native: falls back to inline positioning inside a full-screen View —
//     an operator on a phone still sees the confirmation, just anchored to
//     the current screen instead of the OS.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View, Text, Pressable, Platform, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, weight, fontFamily } from '../theme/tokens';
import { IconCheck, IconAlertTriangle, IconInfo, IconClose } from './icons';

type Tone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  tone: Tone;
  duration: number;
}

interface ToastCtx {
  show: (message: string, opts?: { tone?: Tone; duration?: number }) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fail soft — if a screen renders outside the provider (unit tests,
    // storybook), a no-op keeps the call site simple.
    return { show: () => {} };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, opts?: { tone?: Tone; duration?: number }) => {
    const id = ++idRef.current;
    // Default duration bumped to 6s — 3.5s is a hair too fast when a user
    // is mid-scroll or mid-tab-switch and misses the confirmation entirely.
    // Errors get a longer default so they don't vanish before the user
    // notices there's a problem.
    const defaultDuration = (opts?.tone ?? 'success') === 'error' ? 8000 : 6000;
    const t: Toast = { id, message, tone: opts?.tone ?? 'success', duration: opts?.duration ?? defaultDuration };
    setToasts((cur) => [...cur, t]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastPortal toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

function ToastPortal({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const node = (
    <View
      pointerEvents="box-none"
      style={{
        position: Platform.OS === 'web' ? ('fixed' as ViewStyle['position']) : 'absolute',
        top: 72,        // clears the 56-px top bar with a comfortable gap
        right: 20,
        gap: 8,
        zIndex: 300,
        maxWidth: 380,
      } as ViewStyle}
    >
      {toasts.map((t) => (
        <ToastRow key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </View>
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined' && toasts.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createPortal } = require('react-dom') as { createPortal: (n: any, c: Element) => any };
    return createPortal(node, document.body);
  }
  return toasts.length > 0 ? node : null;
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { c, mode } = useTheme();
  useEffect(() => {
    if (toast.duration <= 0) return;
    const t = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, onDismiss]);

  const iconBg =
    toast.tone === 'success' ? c.gBg :
    toast.tone === 'error'   ? c.rBg :
                               c.sBg;
  const iconColor =
    toast.tone === 'success' ? c.gTx :
    toast.tone === 'error'   ? c.rTx :
                               c.sTx;
  const Icon =
    toast.tone === 'success' ? IconCheck :
    toast.tone === 'error'   ? IconAlertTriangle :
                               IconInfo;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      minWidth: 280, maxWidth: 380,
      // Toast bg needs to stand above the page bg but stay inside the app's
      // card family. In dark mode the plain card colour matches the page too
      // closely — nudge one shade brighter for contrast. Light mode stays
      // pure white against the grey page and reads fine as-is.
      backgroundColor: mode === 'dark' ? '#334155' : c.card,
      borderWidth: 1,
      borderColor: mode === 'dark' ? '#475569' : c.border,
      borderRadius: radius.lg,
      paddingVertical: 12, paddingLeft: 12, paddingRight: 14,
      // Soft ambient shadow — same weight as the SectionCard drop, no glow.
      shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 },
    }}>
      {/* Icon tile matches the MetricCard / UnsavedChangesBar treatment:
          36-square, radius.md, tone-tinted bg. Keeps the accent contained
          so the rest of the toast can stay neutral card colour. */}
      <View style={{
        width: 36, height: 36, borderRadius: radius.md,
        backgroundColor: iconBg,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={iconColor} />
      </View>
      <Text style={{
        flex: 1,
        color: c.fg,
        fontSize: font.body,
        fontWeight: weight.medium as TextStyle['fontWeight'],
        fontFamily,
        lineHeight: 20,
      }}>{toast.message}</Text>
      <Pressable
        onPress={() => onDismiss(toast.id)}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        style={({ hovered }) => ({
          width: 26, height: 26, borderRadius: 999,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
        })}
      >
        <IconClose size={14} color={c.mut} />
      </Pressable>
    </View>
  );
}
