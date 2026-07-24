// Floating bar for unsaved edits — a persistent "you have N unsaved edits"
// affordance pinned to the bottom of the viewport while the user scrolls a
// long form (e.g. the SI Detail order-lines table). Replaces the inline
// yellow Banner that used to sit at the top of the page and disappeared as
// soon as the user scrolled past it.
//
// Two actions:
//   1. Save all  → persists staged edits (primary).
//   2. Undo      → clears staged edits without touching the server.
// The bar removes itself the moment the count returns to zero.
//
// Visual language: matches the app's SectionCard — c.card background,
// standard border, standard `radius.lg` corners, soft shadow. The yellow
// pressure lives ONLY in the small icon tile (identical treatment to the
// "Awaiting your review" metric card) so the bar reads as part of the app,
// not as a neon warning slapped on top. Spans edge-to-edge inside the
// Screen's content gutter so it feels docked, not floating out of context.
//
// Web: portals to document.body so nothing above it (ScrollView's transform
// wrapper, cards with overflow:hidden) can clip or drag it with the scroll.
// Native: renders inline, absolute-positioned to the bottom of the screen.

import { useEffect, type ReactNode } from 'react';
import { View, Text, Platform, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, weight, fontFamily } from '../theme/tokens';
import { Button, useBreakpoint } from './ui';
import { IconSave, IconRefresh, IconAlertTriangle } from './icons';

export function UnsavedChangesBar({
  count, onSave, onUndo, saving,
}: {
  count: number;
  onSave: () => void;
  onUndo: () => void;
  /** Disable both buttons while a save is in flight so double-taps are safe. */
  saving?: boolean;
}) {
  const { c, mode } = useTheme();
  const { isPhone } = useBreakpoint();

  // Zero edits → nothing to render. Keeping the branch inside the component
  // (instead of at every call site) means the caller can just mount the bar
  // unconditionally.
  if (count <= 0) return null;

  const label = `${count} unsaved edit${count === 1 ? '' : 's'}`;
  const hint = 'Locking is disabled until you save.';

  // Bar surface must clearly stand ABOVE both the page bg AND the SectionCard
  // above it so it never merges with the last table row. `c.card` alone was
  // too close to the page in dark mode; the elevated slate `#334155` felt
  // like a foreign grey slab. The values below are one step brighter than a
  // card in each theme, with a stronger border — reads as an elevated card,
  // not a coloured banner or a wash.
  const surface = mode === 'dark' ? '#293548' : '#f8fafc';
  const border  = mode === 'dark' ? '#475569' : '#cbd5e1';

  const bar: ReactNode = (
    <View
      pointerEvents="box-none"
      style={{
        // Full-viewport wrapper, centered. Bar SIZING happens on the inner
        // container below so it can match the Screen's exact content edges
        // (maxWidth 1400, paddingHorizontal 32/16). Without this two-layer
        // trick the bar would sit inside its own left/right pins rather
        // than mirroring the SectionCards above it.
        position: Platform.OS === 'web' ? ('fixed' as ViewStyle['position']) : 'absolute',
        left: 0, right: 0, bottom: isPhone ? 12 : 20,
        zIndex: 150,
        alignItems: 'center',
      } as ViewStyle}
    >
      <View style={{
        // Mirror the Screen container's layout so the bar's card edges line
        // up perfectly with every SectionCard above it — no 20-px offset,
        // no misalignment past the content gutter.
        width: '100%',
        maxWidth: 1400,
        paddingHorizontal: isPhone ? 16 : 32,
      } as ViewStyle}>
        <View style={{
          flexDirection: isPhone ? 'column' : 'row',
          alignItems: isPhone ? 'stretch' : 'center',
          gap: isPhone ? 12 : 16,
          backgroundColor: surface,
          borderWidth: 1, borderColor: border,
          borderRadius: radius.lg,
          paddingVertical: isPhone ? 12 : 14,
          paddingHorizontal: isPhone ? 14 : 18,
          // Symmetrical shadow — bar reads as elevated on all sides. Stronger
          // than an ambient card shadow so the elevation is unambiguous even
          // when the bar's surface is subtle.
          shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 },
        } as ViewStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          {/* Icon tile — same yellow-tinted-square pattern the "Awaiting
              your review" metric card uses. All the accent colour lives here
              so the rest of the bar can stay in the app's neutral card style. */}
          <View style={{
            width: 36, height: 36, borderRadius: radius.md,
            backgroundColor: c.yBg,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <IconAlertTriangle size={18} color={c.yTx} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{
              color: c.fg,
              fontSize: font.body,
              fontWeight: weight.semibold as TextStyle['fontWeight'],
              fontFamily,
            }} numberOfLines={1}>{label}</Text>
            <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, marginTop: 2 }} numberOfLines={1}>
              {hint}
            </Text>
          </View>
        </View>
        <View style={{
          flexDirection: 'row',
          gap: 8,
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
        }}>
          <Button
            label="Undo changes"
            variant="secondary"
            leading={<IconRefresh size={16} color={c.fg} />}
            tooltip="Discard every pending edit and revert to the last saved state."
            onPress={onUndo}
            disabled={saving}
          />
          <Button
            label={saving ? 'Saving…' : 'Save all'}
            variant="primary"
            leading={<IconSave size={16} color="#ffffff" />}
            tooltip={`Save your ${count} pending edit${count === 1 ? '' : 's'} to the server.`}
            onPress={onSave}
            loading={saving}
          />
        </View>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createPortal } = require('react-dom') as { createPortal: (n: any, c: Element) => any };
    return createPortal(bar, document.body);
  }
  return bar;
}

// Keep the extra padding on the Detail screen so the floating bar never sits
// on top of the last table row. Consumers add this to the bottom of their
// scroll content when the bar might be visible.
export const UNSAVED_BAR_FOOTER_PAD = 108;

// A blank Effect-only hook that could be used to prewarm the bar's portal
// container. Left as a stub so I can add one later without changing call
// sites. Currently a no-op.
export function useUnsavedBarPortalPrewarm() {
  useEffect(() => {}, []);
}
