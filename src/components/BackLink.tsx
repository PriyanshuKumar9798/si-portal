// Back-to-list link — the small chevron-prefixed text sitting above the
// PageHeader on every nested route. Every sub-page inside the SI Portal
// (Detail, Generate, Exceptions, Discrepancies) opens from the SI list, so
// the back-target defaults to '/sis'. Pass `href` for anything else.

import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { Body } from './ui';
import { IconChevronRight } from './icons';

export function BackLink({
  href = '/sis',
  label = 'Back to SIs',
  guard,
}: {
  href?: string;
  label?: string;
  /** Wrap the navigate call — useful for confirming unsaved edits. When
   *  provided, `guard` is invoked with the navigation callback; it may run
   *  it synchronously, defer it, or drop it entirely. */
  guard?: (next: () => void) => void;
}) {
  const { c } = useTheme();
  const router = useRouter();
  const nav = () => router.push(href as never);
  return (
    <Pressable
      onPress={() => (guard ? guard(nav) : nav())}
      style={({ hovered }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 4,
        alignSelf: 'flex-start',
        paddingVertical: 4, paddingRight: 8,
        opacity: (hovered as boolean) ? 1 : 0.85,
      })}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={{ transform: [{ rotate: '180deg' }] }}>
        <IconChevronRight size={14} color={c.mut} />
      </View>
      <Body mut size="small">{label}</Body>
    </Pressable>
  );
}
