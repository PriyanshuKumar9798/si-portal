// Tooltip — hover-delayed floating hint, primarily for web where a cursor
// exists. On native we degrade to a no-op wrapper (touch users don't get
// hover; they'll rely on inline labels + the HelpPopover for guidance).
//
// Positioning is absolute inside the trigger's Pressable so the hint hugs
// the target. Delay defaults to 450 ms — long enough that intentional hovers
// surface it but incidental cursor sweeps don't flicker.

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { View, Text, Platform, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, weight, fontFamily } from '../theme/tokens';

type Placement = 'top' | 'bottom';
type Align = 'center' | 'left' | 'right';

export function Tooltip({
  label,
  placement = 'top',
  delay = 450,
  children,
  disabled,
}: {
  label: string;
  placement?: Placement;
  delay?: number;
  children: ReactNode;
  disabled?: boolean;
}) {
  const { mode } = useTheme();
  const [open, setOpen] = useState(false);
  // Which edge of the bubble aligns to the trigger. Default is `center`; we
  // flip to `right` (bubble's right edge pinned to trigger's right edge) when
  // the trigger is close enough to the viewport's right edge that a centered
  // tooltip would overflow — and to `left` symmetrically near the left edge.
  // Recomputed every time the tooltip opens so it survives layout changes.
  const [align, setAlign] = useState<Align>('center');
  const triggerRef = useRef<View | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (Platform.OS !== 'web' || disabled || !label) return <>{children}</>;

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // 260 = maxWidth; half of that = the worst-case half-bubble that a
      // centered tooltip would consume on each side. If either side of the
      // trigger has less clearance than that (plus a small gutter), flip.
      const el = triggerRef.current as unknown as HTMLElement | null;
      if (el && typeof window !== 'undefined') {
        const r = el.getBoundingClientRect();
        const centreX = r.left + r.width / 2;
        const halfBubble = 130;
        const gutter = 8;
        if (window.innerWidth - centreX < halfBubble + gutter) setAlign('right');
        else if (centreX < halfBubble + gutter) setAlign('left');
        else setAlign('center');
      }
      setOpen(true);
    }, delay);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  };

  // Web: `width: 'max-content'` breaks the bubble free of the trigger's width
  // so long tooltip copy renders on one/two lines instead of wrapping into a
  // narrow vertical stack. RN's ViewStyle types don't include it, so we cast.
  const alignStyle =
    align === 'center' ? { left: '50%', transform: [{ translateX: '-50%' as unknown as number }] } :
    align === 'right'  ? { right: 0 } :
                         { left: 0 };

  const bubbleStyle = {
    position: 'absolute',
    ...alignStyle,
    ...(placement === 'top' ? { bottom: '100%', marginBottom: 6 } : { top: '100%', marginTop: 6 }),
    backgroundColor: mode === 'dark' ? '#1f2937' : '#111827',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 200,
    width: 'max-content',
    maxWidth: 260,
  } as unknown as ViewStyle;

  return (
    <View
      ref={triggerRef}
      // These prop names are RN Web-specific and no-op on native — perfect
      // for us since we early-return on non-web above.
      // @ts-ignore
      onMouseEnter={show}
      // @ts-ignore
      onMouseLeave={hide}
      style={{ position: 'relative' }}
    >
      {children}
      {open && (
        <View style={bubbleStyle} pointerEvents="none">
          <Text
            style={{
              color: '#ffffff',
              fontSize: font.caption,
              fontWeight: weight.medium as any,
              fontFamily,
              lineHeight: 16,
              textAlign: 'center',
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}
