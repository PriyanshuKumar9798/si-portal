// Theme context — wraps the tree in a mode + palette, honours the OS
// preference by default with an override the user can toggle from the shell.
// The manual override PERSISTS across reloads (previously the theme flipped
// back to system-default on refresh, undoing the user's choice). Storage:
//   - Web: localStorage, read synchronously in the useState initializer so
//     there is no flash of the wrong theme on cold start.
//   - Native: AsyncStorage, hydrated in a useEffect. There's a one-frame
//     race until then; acceptable because native RN also honours the OS
//     preference during that frame, which typically matches the persisted
//     choice.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { paletteFor, type ThemeMode } from './tokens';

interface ThemeCtx {
  mode: ThemeMode;
  c: ReturnType<typeof paletteFor>;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_KEY = 'bs-theme-mode';

// Read the persisted override synchronously on web so the first paint uses
// the correct palette. On native, this always returns null and the useEffect
// hydration takes over.
function readPersistedSync(): ThemeMode | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'dark' || raw === 'light') return raw;
  } catch { /* localStorage may throw in privacy mode — ignore */ }
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const sys = useColorScheme();
  const [override, setOverride] = useState<ThemeMode | null>(() => readPersistedSync());

  // Native hydration — fires once after mount.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw === 'dark' || raw === 'light') setOverride(raw);
      } catch {
        // Storage errors are non-fatal — fall through to the system preference.
      }
    })();
  }, []);

  const mode: ThemeMode = override ?? (sys === 'dark' ? 'dark' : 'light');

  const persist = (next: ThemeMode | null) => {
    setOverride(next);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (next) window.localStorage.setItem(STORAGE_KEY, next);
        else window.localStorage.removeItem(STORAGE_KEY);
      } else {
        // AsyncStorage returns a promise but we don't await — the write is
        // fire-and-forget so the toggle stays snappy. Errors are ignored.
        if (next) AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
        else      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      }
    } catch {
      // Same reasoning as the readPersisted try/catch — swallow storage errors.
    }
  };

  const value = useMemo<ThemeCtx>(() => ({
    mode,
    c: paletteFor(mode),
    setMode: persist,
    toggle: () => persist(mode === 'dark' ? 'light' : 'dark'),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [mode]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside <ThemeProvider>');
  return v;
}

/**
 * Scope override — wraps children in a fixed light-mode context, ignoring
 * whatever the user has persisted globally. Used by the sign-in page so
 * the brand hero + form always read as "welcome, please sign in" regardless
 * of the account theme underneath. `setMode` / `toggle` become no-ops
 * within the scope so a stray click can't leak dark mode back in.
 */
export function LightScopeProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ThemeCtx>(() => ({
    mode: 'light',
    c: paletteFor('light'),
    setMode: () => {},
    toggle: () => {},
  }), []);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
