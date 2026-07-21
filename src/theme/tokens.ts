// Design tokens — the SINGLE source of truth for every colour, spacing, and
// font-size on the platform. Values are extracted 1:1 from the approved
// Claude Design output (SiListFrame.dc.html) so what ships matches the
// design pixel-for-pixel. Never inline a hex in a component; import from here.

export type ThemeMode = 'light' | 'dark';

// ─── Palette ────────────────────────────────────────────────────────────────
// Both palettes share keys so a single `useTheme()` hook can swap without any
// component knowing which mode is active.

interface Palette {
  bg: string;              // page background
  card: string;            // card, header, sticky cell
  fg: string;              // primary text, values
  mut: string;             // muted labels, sub-values, captions
  muted: string;           // progress tracks, disabled fills, empty tiles
  accent: string;          // row hover, active-legend tints
  border: string;          // every border

  red: string;             // brand red text
  redSolid: string;        // primary CTA fill (constant across modes)
  navActiveBg: string;     // active-tab background tint
  footerBg: string;        // insight-footer subtle fill
  chipRedBorder: string;   // filter-chip border in "active filter" strip

  // Traffic-light scale — always available in both modes, always paired dark/light
  yTx: string;             // yellow text
  yBg: string;             // yellow chip bg
  yDot: string;            // yellow status dot
  gTx: string;             // green text
  gBg: string;             // green chip bg
  gDot: string;            // green status dot
  rTx: string;             // red text
  rBg: string;             // red chip bg
  rDot: string;            // red status dot
  sTx: string;             // slate text
  sBg: string;             // slate chip bg
}

export const light: Palette = {
  bg: '#ffffff',
  card: '#ffffff',
  fg: '#0f172a',
  mut: '#475569',
  muted: '#ececf0',
  accent: '#e9ebef',
  border: 'rgba(0,0,0,0.1)',
  red: '#dc2626',
  redSolid: '#dc2626',
  navActiveBg: '#fef2f2',
  footerBg: '#fafafa',
  chipRedBorder: 'rgba(220,38,38,0.35)',
  yTx: '#ca8a04',
  yBg: '#fefce8',
  yDot: '#eab308',
  gTx: '#059669',
  gBg: '#ecfdf5',
  gDot: '#10b981',
  rTx: '#dc2626',
  rBg: '#fef2f2',
  rDot: '#ef4444',
  sTx: '#64748b',
  sBg: '#f1f5f9',
};

export const dark: Palette = {
  bg: '#0f172a',
  card: '#1e293b',
  fg: '#f1f5f9',
  mut: '#cbd5e1',
  muted: '#334155',
  accent: '#334155',
  border: 'rgba(255,255,255,0.1)',
  red: '#f87171',
  redSolid: '#dc2626',   // CTA fill stays saturated across modes
  navActiveBg: 'rgba(220,38,38,0.15)',
  footerBg: 'rgba(255,255,255,0.02)',
  chipRedBorder: 'rgba(248,113,113,0.4)',
  yTx: '#facc15',
  yBg: 'rgba(66,32,6,0.6)',
  yDot: '#eab308',
  gTx: '#34d399',
  gBg: 'rgba(2,44,34,0.6)',
  gDot: '#10b981',
  rTx: '#f87171',
  rBg: 'rgba(69,10,10,0.6)',
  rDot: '#ef4444',
  sTx: '#94a3b8',
  sBg: 'rgba(51,65,85,0.7)',
};

export const paletteFor = (mode: ThemeMode): Palette => (mode === 'dark' ? dark : light);

// ─── Spacing rhythm ────────────────────────────────────────────────────────
// Multiples of 4 · 8 grid. `gap-3 = 12`, `space-y-6 = 24` etc.
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
} as const;

// ─── Radius ─────────────────────────────────────────────────────────────────
// Cards 10px (DESIGN_LANGUAGE canon); pills/inputs 8px; chips 999px.
export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  pill: 999,
} as const;

// ─── Font sizing ────────────────────────────────────────────────────────────
// Kept as a small numeric map — RN needs numbers, not Tailwind classes.
export const font = {
  micro: 10,
  caption: 11,
  small: 12,
  body: 13,
  bodyLg: 14,
  h4: 15,
  h3: 16,
  h2: 20,
  h1: 24,
  hero: 30,
} as const;

// ─── Weights ────────────────────────────────────────────────────────────────
export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// ─── Font family ────────────────────────────────────────────────────────────
// Inter is loaded via expo-google-fonts or the web `<link>` (index.html on
// web). Fallback stack matches BS FA. Do NOT swap for Plus Jakarta / Geist.
export const fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
