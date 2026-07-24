// A labelled calendar-driven date field.
//
// The calendar popover is PORTALED to document.body on web and positioned
// with `position: fixed` at the trigger's viewport rect. Rendering inline
// (as an absolute-positioned child of the trigger) had the calendar bleeding
// behind sibling form rows in the same card — the trigger's parent
// established a stacking context that trapped the popover no matter how
// high its z-index was. Portaling escapes that trap the same way
// ConfirmDialog and HelpPopover do.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Platform, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, weight, fontFamily } from '../theme/tokens';
import { shortDayYear } from '../utils/format';
import { Calendar } from './Calendar';
import { MicroLabel } from './ui';
import { IconCalendar, IconChevronDown, IconChevronUp } from './icons';

interface Rect { x: number; y: number; width: number; height: number }

export function DatePickerField({
  label, value, onChange, ariaLabel,
}: {
  label: string;
  value: string;                  // ISO YYYY-MM-DD
  onChange: (iso: string) => void;
  ariaLabel?: string;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const triggerRef = useRef<View | null>(null);

  // Measure the trigger's viewport rect whenever the popover opens, so the
  // portaled calendar can pin `position: fixed` right below it. Re-measure
  // on scroll/resize so the popover follows the trigger. RN Web forwards
  // View refs to the underlying DOM node.
  const measure = useCallback(() => {
    const el = triggerRef.current as unknown as HTMLElement | null;
    if (!el || typeof window === 'undefined') return;
    const r = el.getBoundingClientRect();
    setRect({ x: r.x, y: r.y, width: r.width, height: r.height });
  }, []);

  useLayoutEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  // Outside-click closes the popover. We check against the portaled node too
  // (via a ref on the popover container) so clicks inside the calendar do
  // NOT close it.
  const popoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      const trigger = triggerRef.current as unknown as HTMLElement | null;
      if (target && trigger?.contains(target)) return;
      if (target && popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  return (
    <View style={{ gap: 6 } as ViewStyle}>
      <MicroLabel>{label}</MicroLabel>
      <Pressable
        ref={triggerRef as any}
        onPress={() => setOpen((v) => !v)}
        accessibilityLabel={ariaLabel ?? `${label}, ${shortDayYear(value)}`}
        accessibilityRole="button"
        style={{
          flexDirection: 'row', alignItems: 'center',
          borderWidth: 1, borderColor: c.border, backgroundColor: c.bg,
          borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconCalendar size={14} color={c.mut} />
          <Text style={{ color: c.fg, fontSize: font.bodyLg, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
            {shortDayYear(value)}
          </Text>
        </View>
        {open ? <IconChevronUp size={12} color={c.mut} /> : <IconChevronDown size={12} color={c.mut} />}
      </Pressable>
      {open && rect && Platform.OS === 'web' && typeof document !== 'undefined' && (
        <CalendarPortal
          rect={rect}
          popoverRef={popoverRef}
          value={value}
          onChange={(iso) => { onChange(iso); setOpen(false); }}
        />
      )}
    </View>
  );
}

function CalendarPortal({
  rect, popoverRef, value, onChange,
}: {
  rect: Rect;
  popoverRef: React.MutableRefObject<HTMLDivElement | null>;
  value: string;
  onChange: (iso: string) => void;
}) {
  const { c } = useTheme();
  // Flip above the trigger if there isn't room below. Calendar is ~320 px
  // tall so we need ~340 px of clearance to open downward.
  const gap = 6;
  const CAL_HEIGHT_ESTIMATE = 340;
  const openUp =
    typeof window !== 'undefined' &&
    rect.y + rect.height + CAL_HEIGHT_ESTIMATE > window.innerHeight &&
    rect.y > CAL_HEIGHT_ESTIMATE;
  const top = openUp ? undefined : rect.y + rect.height + gap;
  const bottom = openUp && typeof window !== 'undefined' ? window.innerHeight - rect.y + gap : undefined;
  const node = (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        left: rect.x,
        ...(top !== undefined ? { top } : {}),
        ...(bottom !== undefined ? { bottom } : {}),
        zIndex: 200,
        // No explicit width — let Calendar's minWidth of 280 drive size.
      }}
    >
      <View style={{
        backgroundColor: c.card,
        borderWidth: 1, borderColor: c.border,
        borderRadius: radius.md,
        shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
      } as ViewStyle}>
        <Calendar value={value} onChange={onChange} />
      </View>
    </div>
  );
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createPortal } = require('react-dom') as { createPortal: (n: any, c: Element) => any };
  return createPortal(node, document.body);
}
