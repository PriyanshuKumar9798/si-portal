// Theme context — wraps the tree in a mode + palette, honours the OS preference
// by default with an override the user can toggle from the shell. Every screen
// pulls its colours from `useTheme().c` so both modes stay 100% in sync.

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { paletteFor, type ThemeMode } from './tokens';

interface ThemeCtx {
  mode: ThemeMode;
  c: ReturnType<typeof paletteFor>;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const sys = useColorScheme();
  const [override, setOverride] = useState<ThemeMode | null>(null);
  const mode: ThemeMode = override ?? (sys === 'dark' ? 'dark' : 'light');
  const value = useMemo<ThemeCtx>(() => ({
    mode,
    c: paletteFor(mode),
    setMode: setOverride,
    toggle: () => setOverride(mode === 'dark' ? 'light' : 'dark'),
  }), [mode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside <ThemeProvider>');
  return v;
}
