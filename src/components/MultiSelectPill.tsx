// MultiSelectPill — the canonical checkbox popover used everywhere the user
// picks a subset of stores/statuses/types. Follows BS FA convention:
// - Empty selection = "All Xs" (no filter applied)
// - Any non-empty subset renders every selected label, never "N selected"
// - Select all / Clear as the first row inside the popover

import { useMemo, useRef, useState } from 'react';
import { View, Pressable, Text, TextInput, ScrollView, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { font, radius, weight, fontFamily } from '../theme/tokens';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { IconChevronDown, IconChevronUp } from './icons';

export interface MultiOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  label: string;
  selected: string[];
  onChange: (next: string[]) => void;
  options: MultiOption[];
  placeholderAll?: string;   // trigger text when selection is empty
  searchable?: boolean;
  minTriggerWidth?: number;
}

export function MultiSelectPill({
  label, selected, onChange, options,
  placeholderAll, searchable = true, minTriggerWidth = 180,
}: Props) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrapperRef = useRef<any>(null);
  useOutsideClick(wrapperRef, open, () => setOpen(false));
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(needle) ||
      o.sublabel?.toLowerCase().includes(needle),
    );
  }, [q, options]);

  const allChecked = options.length > 0 && selected.length === options.length;
  const selectedLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);

  const triggerLabel =
    selected.length === 0 ? (placeholderAll ?? `All ${label.toLowerCase()}`)
                          : selectedLabels.join(', ');

  return (
    <View ref={wrapperRef} style={{ position: 'relative', zIndex: open ? 40 : 1 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{
          minWidth: minTriggerWidth,
          maxWidth: 360,
          flexDirection: 'row', alignItems: 'center', gap: 8,
          borderWidth: 1, borderColor: c.border,
          backgroundColor: c.card,
          borderRadius: radius.md,
          paddingVertical: 7, paddingHorizontal: 12,
        } as ViewStyle}
        accessibilityLabel={`${label} filter, ${selected.length ? `${selected.length} selected` : 'all'}`}
      >
        <Text style={{ color: c.mut, fontSize: font.body, fontFamily }}>{label}</Text>
        <Text
          numberOfLines={1}
          style={{ color: c.fg, fontSize: font.body, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily, flex: 1 }}
        >{triggerLabel}</Text>
        {open ? <IconChevronUp size={12} color={c.mut} /> : <IconChevronDown size={12} color={c.mut} />}
      </Pressable>

      {open && (
        <View style={{
          position: 'absolute',
          top: 40,                    // trigger height + 6 gap — same as RunDatePill
          left: 0,
          minWidth: 260, maxWidth: 400,
          backgroundColor: c.card,
          borderWidth: 1, borderColor: c.border,
          borderRadius: radius.md,
          padding: 8,
          zIndex: 100, elevation: 8,
          shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 },
        }}>
          {searchable && (
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search"
              placeholderTextColor={c.mut}
              style={{
                borderWidth: 1, borderColor: c.border, backgroundColor: c.bg,
                color: c.fg, borderRadius: radius.sm,
                paddingHorizontal: 10, paddingVertical: 6, fontSize: font.body,
                marginBottom: 6, fontFamily,
              }}
            />
          )}
          <Pressable
            onPress={() => onChange(allChecked ? [] : options.map((o) => o.value))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8,
              borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 4 }}
          >
            <CheckBox on={allChecked} />
            <Text style={{
              color: c.fg, fontSize: font.body,
              fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily, flex: 1,
            }}>{allChecked ? 'Clear all' : 'Select all'}</Text>
            <Text style={{ color: c.mut, fontSize: font.small, fontFamily }}>
              {selected.length}/{options.length}
            </Text>
          </Pressable>
          <ScrollView style={{ maxHeight: 320 }}>
            {filtered.map((o) => {
              const on = selected.includes(o.value);
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value]);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8 }}
                >
                  <CheckBox on={on} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: c.fg, fontSize: font.body, fontFamily }}>{o.label}</Text>
                    {o.sublabel && (
                      <Text style={{ color: c.mut, fontSize: font.caption, fontFamily }}>{o.sublabel}</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
            {filtered.length === 0 && (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ color: c.mut, fontSize: font.small, fontFamily }}>No matches</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function CheckBox({ on }: { on: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{
      width: 16, height: 16, borderRadius: 3,
      borderWidth: 1,
      borderColor: on ? c.redSolid : c.border,
      backgroundColor: on ? c.redSolid : c.bg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      {on && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900', lineHeight: 12 }}>✓</Text>}
    </View>
  );
}
