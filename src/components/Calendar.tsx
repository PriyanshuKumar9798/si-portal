// Calendar — a single-month grid with independent month AND year navigation,
// so users can jump ahead a quarter or back a year without clicking twelve
// times through the arrows. Emits ISO date strings ("YYYY-MM-DD") so it drops
// straight into the existing runDate query state.
//
// Design choices:
//   • Sunday-first grid because the ops team's shift-planning spreadsheets
//     already use that layout.
//   • Two independent picker chips at the top ("July" and "2026") that open
//     compact scroll-lists — no browser <select> dropdown to avoid the RN
//     Web weight-mismatch on styling.
//   • Today outlined in red; selected day filled red — same brand-accent
//     hierarchy the rest of the app uses.
//   • Bottom row: "Today" quick action so the daily-review flow (which is
//     the most common) stays one click.

import { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, weight, fontFamily } from '../theme/tokens';
import { IconChevronLeft, IconChevronRight, IconChevronDown } from './icons';
import { todayIso } from '../utils/format';
import { useOutsideClick } from '../hooks/useOutsideClick';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Return year/month/day (1-indexed month/day) from an ISO 'YYYY-MM-DD'. */
function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  return { y, m, d };
}
function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function daysInMonth(y: number, m: number): number {
  // JS Date: m is 0-indexed and day 0 of next month = last day of THIS month.
  return new Date(y, m, 0).getDate();
}
function firstWeekdayOfMonth(y: number, m: number): number {
  // JS Date weekdays: 0 = Sun … 6 = Sat, matches our Sunday-first grid.
  return new Date(y, m - 1, 1).getDay();
}

export function Calendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const { c } = useTheme();
  const parsed = parseIso(value);
  // View month/year is independent of `value` — user can browse without
  // committing. Clicking a day is what commits.
  const [viewYear, setViewYear] = useState(parsed.y);
  const [viewMonth, setViewMonth] = useState(parsed.m);
  const today = parseIso(todayIso());

  const cells = useMemo(() => {
    const leading = firstWeekdayOfMonth(viewYear, viewMonth);
    const days = daysInMonth(viewYear, viewMonth);
    // Padding cells at the head (null) + numbered day cells. Trailing pad is
    // implicit — grid just ends on the last day. Rows compute themselves.
    return [...Array(leading).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <View style={{ padding: 12, gap: 10, minWidth: 280 }}>
      {/* Header: prev-arrow, month chip, year chip, next-arrow.
          zIndex is intentional — the picker popovers below live inside this
          header, and without a stacking context above the grid the day cells
          (later in DOM order) paint over the popover even with the popover's
          own zIndex. Elevating the whole header row past the grid makes the
          popover reliably float on top. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 20 } as ViewStyle}>
        <StepArrow onPress={goPrevMonth} label="Previous month">
          <IconChevronLeft size={14} color={c.mut} />
        </StepArrow>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <PickerChip
            label={MONTH_NAMES[viewMonth - 1]}
            options={MONTH_NAMES.map((n, i) => ({ label: n, value: i + 1 }))}
            value={viewMonth}
            onChange={(v) => setViewMonth(v)}
          />
          <PickerChip
            label={String(viewYear)}
            options={buildYearRange(viewYear).map((y) => ({ label: String(y), value: y }))}
            value={viewYear}
            onChange={(v) => setViewYear(v)}
          />
        </View>
        <StepArrow onPress={goNextMonth} label="Next month">
          <IconChevronRight size={14} color={c.mut} />
        </StepArrow>
      </View>

      {/* Day-of-week header */}
      <View style={{ flexDirection: 'row' }}>
        {DAY_HEADERS.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{
              color: c.mut, fontSize: font.micro,
              fontWeight: weight.semibold as TextStyle['fontWeight'],
              letterSpacing: 0.5, fontFamily,
            }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, idx) => {
          if (day === null) return <View key={`pad-${idx}`} style={{ width: `${100 / 7}%`, height: 34 }} />;
          const iso = toIso(viewYear, viewMonth, day);
          const isSelected = value === iso;
          const isToday = today.y === viewYear && today.m === viewMonth && today.d === day;
          return (
            <View key={iso} style={{ width: `${100 / 7}%`, padding: 2, alignItems: 'center' }}>
              <Pressable
                onPress={() => onChange(iso)}
                accessibilityRole="button"
                accessibilityLabel={iso}
                accessibilityState={{ selected: isSelected }}
                style={({ hovered }) => ({
                  width: 30, height: 30, borderRadius: 999,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isSelected ? c.redSolid : (hovered as boolean) ? c.accent : 'transparent',
                  borderWidth: isSelected ? 0 : (isToday ? 1 : 0),
                  borderColor: c.redSolid,
                })}
              >
                <Text style={{
                  color: isSelected ? '#fff' : isToday ? c.red : c.fg,
                  fontSize: font.body,
                  fontWeight: (isSelected || isToday ? weight.semibold : weight.regular) as TextStyle['fontWeight'],
                  fontFamily, fontVariant: ['tabular-nums'],
                }}>{day}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Quick action — Today */}
      <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8, alignItems: 'flex-end' }}>
        <Pressable
          onPress={() => {
            const t = parseIso(todayIso());
            setViewYear(t.y);
            setViewMonth(t.m);
            onChange(todayIso());
          }}
          style={({ hovered }) => ({
            paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.sm,
            backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
          })}
        >
          <Text style={{ color: c.red, fontSize: font.small, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
            Jump to today
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function StepArrow({ onPress, label, children }: { onPress: () => void; label: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ hovered }) => ({
        width: 28, height: 28, borderRadius: radius.sm,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
      })}
    >
      {children}
    </Pressable>
  );
}

// Compact picker chip — button-shaped, opens a scrollable list of options.
// Used for both the Month and Year toggles at the top of the calendar.
function PickerChip<T extends number | string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<View | null>(null);
  useOutsideClick(wrapRef, open, () => setOpen(false));
  return (
    <View ref={wrapRef} style={{ position: 'relative', zIndex: open ? 20 : 1 } as ViewStyle}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ hovered }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 4,
          paddingVertical: 5, paddingHorizontal: 10,
          borderRadius: radius.sm,
          backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
        })}
      >
        <Text style={{
          color: c.fg, fontSize: font.body,
          fontWeight: weight.semibold as TextStyle['fontWeight'],
          fontFamily,
        }}>{label}</Text>
        <IconChevronDown size={12} color={c.mut} />
      </Pressable>
      {open && (
        <View
          style={{
            position: 'absolute',
            top: 34,
            left: 0,
            width: 120,
            maxHeight: 220,
            overflow: 'scroll' as ViewStyle['overflow'],
            backgroundColor: c.card,
            borderWidth: 1, borderColor: c.border,
            borderRadius: radius.md,
            padding: 4,
            zIndex: 30, elevation: 8,
            shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 },
          }}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={String(o.value)}
                onPress={() => { onChange(o.value); setOpen(false); }}
                style={({ hovered }) => ({
                  paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm,
                  backgroundColor: active ? c.navActiveBg : (hovered as boolean) ? c.accent : 'transparent',
                })}
              >
                <Text style={{
                  color: active ? c.red : c.fg,
                  fontSize: font.body,
                  fontWeight: (active ? weight.semibold : weight.regular) as TextStyle['fontWeight'],
                  fontFamily,
                }}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

// Year picker spans 5 back to 5 ahead of the currently-viewed year so a busy
// operator can jump quarters without walking through months, but the list
// doesn't balloon into hundreds of items nobody scrolls to.
function buildYearRange(pivot: number): number[] {
  return Array.from({ length: 11 }, (_, i) => pivot - 5 + i);
}
