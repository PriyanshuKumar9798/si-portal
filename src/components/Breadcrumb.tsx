// Breadcrumb — the "← Parent > Current" strip that sits above the PageHeader
// on every non-root screen. Two independently clickable controls, not one:
//
//   ← (arrow)  → true browser Back: pops history. If there's nothing to pop
//                 (deep link, refresh, or first visit), falls through to the
//                 same target as the label. This preserves the mental model
//                 of the browser's native Back button.
//   Parent label → always jumps to the section landing. Deterministic — the
//                  user always ends up in the same place regardless of history.
//
// Current label at the end is inert.

import { useCallback } from 'react';
import { View, Pressable, Text, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, weight } from '../theme/tokens';
import { IconArrowLeft, IconChevronRight } from './icons';
import { guardNav } from '../hooks/useUnsavedChangesGuard';

interface Crumb {
  label: string;
  /** Section landing route. Used both by the label (always) and by the back
   *  arrow as a fallback when there's no history to pop. */
  href?: string;
  /** Alternative to href when the parent lives inside the SAME route and
   *  we just flip local state (e.g. Support ticket detail → Support list).
   *  If provided, wins over href for both the arrow and the label. */
  onPress?: () => void;
}

export function Breadcrumb({ parent, current }: { parent: Crumb; current: string }) {
  const { c } = useTheme();
  const router = useRouter();

  // Back arrow — try history first, fall back to a direct push (or the
  // provided onPress) so the user is never stranded on refresh / deep link.
  const goBack = useCallback(() => {
    guardNav(() => {
      const canBack =
        (typeof (router as any).canGoBack === 'function' && (router as any).canGoBack()) ||
        (Platform.OS === 'web' && typeof window !== 'undefined' && window.history.length > 1);
      if (canBack) {
        router.back();
        return;
      }
      if (parent.onPress) { parent.onPress(); return; }
      if (parent.href)    { router.push(parent.href as never); return; }
    });
  }, [router, parent.href, parent.onPress]);

  const goToParent = useCallback(() => {
    guardNav(() => {
      if (parent.onPress) { parent.onPress(); return; }
      if (parent.href)    { router.push(parent.href as never); return; }
    });
  }, [router, parent.href, parent.onPress]);

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap',
    } as ViewStyle}>
      {/* Back arrow */}
      <Pressable
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ hovered }) => ({
          width: 28, height: 28,
          alignItems: 'center', justifyContent: 'center',
          borderRadius: 8,
          backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
          marginLeft: -6, // optical nudge so the arrow lines up with the page title below
        } as ViewStyle)}
      >
        <IconArrowLeft size={16} color={c.mut} />
      </Pressable>

      {/* Parent link — deterministic jump to the section landing */}
      <Pressable
        onPress={goToParent}
        accessibilityRole="link"
        accessibilityLabel={`Go to ${parent.label}`}
        style={({ hovered }) => ({
          paddingVertical: 2, paddingHorizontal: 2,
          opacity: (hovered as boolean) ? 0.75 : 1,
        } as ViewStyle)}
      >
        <Text style={{
          color: c.mut, fontSize: 14, fontFamily,
          fontWeight: weight.medium as TextStyle['fontWeight'],
        }}>
          {parent.label}
        </Text>
      </Pressable>

      <IconChevronRight size={12} color={c.mut} />

      <Text
        style={{
          color: c.fg, fontSize: 14, fontFamily,
          fontWeight: weight.semibold as TextStyle['fontWeight'],
        }}
        numberOfLines={1}
      >
        {current}
      </Text>
    </View>
  );
}
