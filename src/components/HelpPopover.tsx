// Floating Help pill. Fixed bottom-right on web; anchored to safe-area
// bottom on native. One instance per screen, content passed via the
// `sections` prop so each page can explain itself in its own words.
// Copy convention: short sentences, plain English, no em dashes.
//
// Web positioning gotcha: RN Web wraps ScrollView in a transform-containing
// block, which makes `position: fixed` behave as `absolute` and scroll with
// content. We portal the pill into document.body on web so it stays glued to
// the viewport corner. Native uses a normal absolute-positioned View.

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { font, radius, weight, fontFamily } from '../theme/tokens';

export interface HelpSection {
  /** Section heading, one short line. E.g. "What is this page for?" */
  heading: string;
  /** Body copy. Can be a plain string, a bullet list, or a mixed block. */
  body: string | string[];
  /** Set true to render body as a numbered list (used for step-by-step flow hints). */
  numbered?: boolean;
}

interface HelpPopoverProps {
  /** One-line summary shown at the top of the panel. */
  title: string;
  sections: HelpSection[];
  /** Optional label under the ? icon on desktop. Hidden on narrow widths. */
  label?: string;
}

export function HelpPopover({ title, sections, label = 'Help' }: HelpPopoverProps) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<any>(null);
  useOutsideClick(wrapperRef, open, () => setOpen(false));

  const node = (
    <View
      ref={wrapperRef}
      style={{
        // Fixed bottom-right on web so it stays anchored while the user
        // scrolls. Native falls back to absolute (RN doesn't parse 'fixed').
        position: Platform.OS === 'web' ? ('fixed' as ViewStyle['position']) : 'absolute',
        right: 20,
        // Lift the pill above the persistent bottom nav (68 px) + a small
        // gutter so it doesn't overlap the Academy/Alerts tabs.
        bottom: 88,
        zIndex: 90,
      } as ViewStyle}
    >
      {open && (
        <View
          style={{
            position: 'absolute',
            bottom: 56,        // above the pill (44 pill + 12 gap)
            right: 0,
            // On phones the fixed 360px panel would run off-screen. Cap it
            // to the viewport width minus the 20px gutter we sit inside, so
            // the panel hugs the right edge without overflowing.
            width: Platform.OS === 'web' && typeof window !== 'undefined'
              ? Math.min(360, window.innerWidth - 40)
              : 360,
            maxHeight: Platform.OS === 'web' && typeof window !== 'undefined'
              ? Math.min(480, window.innerHeight - 120)
              : 480,
            backgroundColor: c.card,
            borderWidth: 1, borderColor: c.border,
            borderRadius: radius.lg,
            shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 20, shadowOffset: { width: 0, height: 12 },
          } as ViewStyle}
        >
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.fg, fontSize: font.h4, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
                {title}
              </Text>
              <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, marginTop: 2 }}>
                Quick help for this screen
              </Text>
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityLabel="Close help"
              style={{ padding: 4 }}
            >
              <Text style={{ color: c.mut, fontSize: font.h4, fontFamily, lineHeight: 20 }}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
            {sections.map((s, i) => (
              <View key={i} style={{ gap: 6 }}>
                <Text style={{
                  color: c.fg, fontSize: font.body,
                  fontWeight: weight.semibold as TextStyle['fontWeight'],
                  fontFamily,
                }}>
                  {s.heading}
                </Text>
                {Array.isArray(s.body) ? (
                  <View style={{ gap: 6 }}>
                    {s.body.map((line, j) => (
                      <View key={j} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                        <Text style={{ color: c.mut, fontSize: font.body, fontFamily, minWidth: 14, textAlign: 'right' }}>
                          {s.numbered ? `${j + 1}.` : '•'}
                        </Text>
                        <Text style={{ color: c.mut, fontSize: font.body, fontFamily, flex: 1, lineHeight: 20 }}>
                          {line}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: c.mut, fontSize: font.body, fontFamily, lineHeight: 20 }}>
                    {s.body}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityLabel="Open help"
        style={({ hovered }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: c.card,
          borderWidth: 1, borderColor: c.border,
          borderRadius: radius.pill,
          paddingVertical: 8, paddingLeft: 8, paddingRight: 14,
          shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
          opacity: (hovered as boolean) ? 1 : 0.95,
        })}
      >
        <View style={{
          width: 24, height: 24, borderRadius: 999,
          backgroundColor: c.redSolid,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', fontFamily }}>?</Text>
        </View>
        <Text style={{
          color: c.fg, fontSize: font.body,
          fontWeight: weight.medium as TextStyle['fontWeight'],
          fontFamily,
        }}>{label}</Text>
      </Pressable>
    </View>
  );

  // On web, portal into document.body so any ancestor `transform` (RN Web's
  // ScrollView wrapper) can't turn our `position: fixed` into `absolute`.
  // On native, `document` doesn't exist and there's no such containing-block
  // trap — just render inline.
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    // Lazy-require react-dom so native bundles never touch it.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createPortal } = require('react-dom') as { createPortal: (n: ReactNode, c: Element) => ReactNode };
    return createPortal(node, document.body) as any;
  }
  return node;
}
