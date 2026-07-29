// Tooltip — hover-delayed floating hint, primarily for web where a cursor
// exists. On native we degrade to a no-op wrapper (touch users don't get
// hover; they'll rely on inline labels + the HelpPopover for guidance).
//
// The bubble is rendered via a body portal + `position: fixed` at coordinates
// derived from the trigger's viewport rect. That way it always paints above
// every card, sidebar, and column-clip in the tree — the earlier absolute-
// inside-trigger implementation was getting sliced by `overflow: hidden` /
// `borderRadius` clipping on ancestor SectionCards, KanbanColumns, etc.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, Text, Platform, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, weight, fontFamily } from '../theme/tokens';

// Touch-primary devices never fire a "hover" naturally; the browser emulates
// one on tap which fights the actual button press and leaves the bubble stuck
// on screen. Skip rendering the tooltip entirely on `(hover: none)` — the
// button's own label / aria-label / inline caption is the fallback there.
function useCanHover(): boolean {
  const [canHover, setCanHover] = useState(true);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(hover: hover) and (pointer: fine)');
    const apply = () => setCanHover(mql.matches);
    apply();
    // Handle input-mode changes (external mouse plugged in, DevTools toggle).
    if (mql.addEventListener) mql.addEventListener('change', apply);
    else mql.addListener(apply);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', apply);
      else mql.removeListener(apply);
    };
  }, []);
  return canHover;
}

type Placement = 'top' | 'bottom';

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
  const canHover = useCanHover();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<View | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Track scroll + resize while open so the bubble stays glued to the trigger.
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const update = () => {
      const el = triggerRef.current as unknown as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  if (Platform.OS !== 'web' || disabled || !label || !canHover) return <>{children}</>;

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const el = triggerRef.current as unknown as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
      setOpen(true);
    }, delay);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  };

  // Bubble is a fixed-position node in the body. Compute (top, left) from the
  // trigger's rect + chosen placement. Clamp horizontally so long labels don't
  // clip off the viewport edges — 8-px gutter on each side.
  const BUBBLE_MAX = 260;
  const GUTTER     = 8;
  const OFFSET     = 6; // gap between trigger and bubble

  let bubble: React.ReactNode = null;
  if (open && rect && typeof window !== 'undefined') {
    const centreX = rect.left + rect.width / 2;
    let left = Math.round(centreX - BUBBLE_MAX / 2);
    left = Math.max(GUTTER, Math.min(left, window.innerWidth - BUBBLE_MAX - GUTTER));
    const top =
      placement === 'top'
        ? rect.top - OFFSET
        : rect.bottom + OFFSET;
    const bubbleStyle = {
      position: 'fixed',
      top,
      left,
      // The translate flips the bubble ABOVE the trigger when placement='top',
      // BELOW when placement='bottom'. Fixed-width + max-content lets short
      // labels stay short; long ones wrap up to the maxWidth.
      transform: [{ translateY: placement === 'top' ? ('-100%' as unknown as number) : 0 }],
      backgroundColor: mode === 'dark' ? '#1f2937' : '#111827',
      borderRadius: radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
      zIndex: 10000,
      width: 'max-content',
      maxWidth: BUBBLE_MAX,
      shadowColor: '#000',
      shadowOpacity: 0.24,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    } as unknown as ViewStyle;

    const node = (
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
    );
    if (typeof document !== 'undefined' && document.body) {
      const { createPortal } = require('react-dom') as { createPortal: (n: any, c: Element) => any };
      bubble = createPortal(node, document.body);
    } else {
      bubble = node;
    }
  }

  return (
    <View
      ref={triggerRef}
      // @ts-ignore RN Web-specific hover props
      onMouseEnter={show}
      // @ts-ignore
      onMouseLeave={hide}
      style={{ position: 'relative' }}
    >
      {children}
      {bubble}
    </View>
  );
}
