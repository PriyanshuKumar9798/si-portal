// Design tokens — the SINGLE source of truth for every colour, spacing, and
// font-size on the platform. Values are extracted 1:1 from the approved
// design reference output (SiListFrame.dc.html) so what ships matches the
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

// ─── Palettes ────────────────────────────────────────────────────────────
// Ported 1:1 from BS FA (`Burger Singh Operations Platform 2/src/styles/
// theme.css`) so the SI Portal reads as a peer of the franchisee app. Both
// palettes share keys; both modes are first-class (the earlier attempt was
// dark-only which broke `useColorScheme` = 'light' users). The traffic-light
// chip triple (Green / Yellow / Red / Slate) is the same canon on both
// platforms — every intent maps to the same colour everywhere, forever.

export const light: Palette = {
  bg: '#ffffff',                    // page background
  card: '#ffffff',                  // cards, header, sticky cells
  fg: '#0f172a',                    // primary text (near-black slate-950)
  mut: '#475569',                   // labels / captions (slate-600, AAA)
  muted: '#ececf0',                 // progress tracks, empty tiles
  accent: '#e9ebef',                // row hover, active-legend tints
  border: 'rgba(0,0,0,0.1)',        // every border
  red: '#dc2626',                   // brand red text
  redSolid: '#dc2626',              // CTA fill
  navActiveBg: '#fef2f2',           // red-50 tint for active tab
  footerBg: '#fafafa',              // insight-footer subtle fill
  chipRedBorder: 'rgba(220,38,38,0.35)',
  yTx: '#ca8a04',                   // yellow-600 (AAA on light bg)
  yBg: '#fefce8',                   // yellow-50 chip
  yDot: '#eab308',
  gTx: '#059669',                   // emerald-600
  gBg: '#ecfdf5',                   // emerald-50 chip
  gDot: '#10b981',
  rTx: '#dc2626',                   // red-600
  rBg: '#fef2f2',                   // red-50 chip
  rDot: '#ef4444',
  sTx: '#64748b',                   // slate-500 for neutral metadata
  sBg: '#f1f5f9',                   // slate-100 chip
};

export const dark: Palette = {
  bg: '#0f172a',                    // slate-900 — page bg
  card: '#1e293b',                  // slate-800 — card / header / nav
  fg: '#f1f5f9',                    // slate-100
  mut: '#cbd5e1',                   // slate-300 (~11:1 on card, AAA)
  muted: '#1e293b',                 // slate-800 track
  accent: '#334155',                // slate-700 — row hover, legend tint
  border: 'rgba(255,255,255,0.1)',
  red: '#f87171',                   // red-400 for dark surfaces
  redSolid: '#dc2626',              // CTA fill stays saturated across modes
  navActiveBg: 'rgba(220,38,38,0.15)',
  footerBg: 'rgba(255,255,255,0.02)',
  chipRedBorder: 'rgba(248,113,113,0.4)',
  yTx: '#facc15',                   // yellow-400
  yBg: 'rgba(66,32,6,0.6)',
  yDot: '#eab308',
  gTx: '#34d399',                   // emerald-400
  gBg: 'rgba(2,44,34,0.6)',
  gDot: '#10b981',
  rTx: '#f87171',                   // red-400
  rBg: 'rgba(69,10,10,0.6)',
  rDot: '#ef4444',
  sTx: '#94a3b8',                   // slate-400
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
// Ramp bumped +1pt from the initial design reference port (10/11/13 → 11/12/14)
// after live tests read as too tight — modern ops tools (Linear, Vercel,
// GitHub, Retool) sit at 14 body / 12 caption / 11 micro. Header ramp
// (h1-h3) stayed put because those already tested fine.
export const font = {
  micro: 11,
  caption: 12,
  small: 13,
  body: 14,
  bodyLg: 15,
  h4: 16,
  h3: 18,
  h2: 22,
  h1: 26,
  hero: 32,
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
