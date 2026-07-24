// ConfirmDialog — the app's shared confirmation modal. Portals to
// document.body on web (escapes ScrollView transform clipping the same way
// HelpPopover does), backdrop-click and Esc dismiss it.
//
// Used for: Lock SI, Delete draft, and the "Leave without saving?" nav
// guard. Same visual language across every yes/no interruption.

import { useEffect } from 'react';
import { View, Pressable, Platform, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Body, Button } from './ui';

export function ConfirmDialog({
  title, body, confirmLabel, onConfirm, onCancel, loading, tone = 'danger',
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  tone?: 'danger' | 'primary';
}) {
  const { c } = useTheme();
  const overlayStyle: ViewStyle = {
    position: Platform.OS === 'web' ? ('fixed' as ViewStyle['position']) : 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', zIndex: 200,
    padding: 24,
  };
  const backdropStyle: ViewStyle = {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  };
  // Esc-to-cancel on web — a keyboard user's expected escape hatch. Native
  // has no equivalent; the hardware back button already dismisses the modal
  // via router semantics.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const node = (
    <View style={overlayStyle}>
      {/* Clicking the backdrop cancels — a mouse user expects this. */}
      <Pressable
        onPress={onCancel}
        style={backdropStyle}
        accessibilityLabel="Close dialog"
      />
      <View style={{
        width: '100%', maxWidth: 420,
        backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
        borderRadius: radius.lg, padding: 20,
        zIndex: 1,                          // sits above the click-catcher backdrop
        shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
      }}>
        <Body size="h3" wt="semibold">{title}</Body>
        <Body mut style={{ marginTop: 8 }}>{body}</Body>
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button label="Cancel" variant="secondary" onPress={onCancel} />
          <Button
            label={loading ? 'Working…' : confirmLabel}
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onPress={onConfirm}
            loading={loading}
          />
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createPortal } = require('react-dom') as { createPortal: (n: any, c: Element) => any };
    return createPortal(node, document.body);
  }
  return node;
}
