// Complaint / Onboarding Category picker — a drill-down popover with search.
// Mirrors Zoho's UX 1:1 (per Franchisee Support):
//   • Top level shows the parents.
//   • Selecting a parent WITH children navigates one level deeper.
//   • Leaf parents + leaf children are selectable directly.
//   • Search filters across all leaves regardless of depth.
//   • Back arrow / breadcrumb at the top of a nested drill-down.
//
// Used by:
//   • NewTicketPage — the "Complaint Category" / "Onboarding Complaints
//     Category" field (label is per-Department, from LAYOUTS).
//   • PropertiesPanel — the edit-mode category field.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Pressable, TextInput, ScrollView, type ViewStyle, type TextStyle } from 'react-native';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius, weight } from '../theme/tokens';
import {
  IconChevronDown, IconChevronLeft, IconChevronRight,
  IconSearch, IconCheck,
} from '../components/icons';
import type { CategoryNode } from './model';
import { LIVE_STORES_CATEGORIES } from './model';

// Track the trigger's viewport rect so the portaled popover can pin itself
// beneath it. Re-measured on scroll/resize while open.
function useRect<T>(nodeRef: React.MutableRefObject<T | null>, active: boolean) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const update = useCallback(() => {
    const el = nodeRef.current as unknown as HTMLElement | null;
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [nodeRef]);
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [active, update]);
  return rect;
}

export function CategoryPicker({
  value, onChange, tree,
}: {
  value: string;
  onChange: (v: string) => void;
  tree?: CategoryNode[];
}) {
  const { c } = useTheme();
  const categoryTree = tree ?? LIVE_STORES_CATEGORIES;
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<CategoryNode[]>([]);
  const [q, setQ] = useState('');
  const ref = useRef<View | null>(null);
  const triggerRef = useRef<View | null>(null);
  const popoverRef = useRef<View | null>(null);
  const rect = useRect(triggerRef, open);

  // Outside click → close (web). Now that the popover is portaled, "outside"
  // is anything outside BOTH the trigger AND the popover.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const handler = (e: MouseEvent) => {
      const t = triggerRef.current as unknown as HTMLElement | null;
      const p = popoverRef.current as unknown as HTMLElement | null;
      const target = e.target as Node;
      if ((t && t.contains(target)) || (p && p.contains(target))) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reset drill-down whenever the tree flips (Department change).
  useEffect(() => { setPath([]); setQ(''); }, [categoryTree]);

  const current = path.length === 0 ? categoryTree : (path[path.length - 1]!.children ?? []);

  const matches = useMemo(() => {
    if (!q.trim()) return [];
    const out: { label: string; path: string }[] = [];
    const walk = (nodes: CategoryNode[], trail: string[]) => {
      for (const n of nodes) {
        const here = [...trail, n.name];
        out.push({ label: n.name, path: here.join(' > ') });
        if (n.children) walk(n.children, here);
      }
    };
    walk(categoryTree, []);
    return out.filter((r) => r.label.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  }, [q, categoryTree]);

  const pick = (node: CategoryNode, trail: CategoryNode[]) => {
    if (node.children && node.children.length > 0) {
      setPath([...trail, node]);
    } else {
      const built = [...trail.map((p) => p.name), node.name].join(' > ');
      onChange(built);
      setOpen(false);
      setPath([]); setQ('');
    }
  };

  const popover = open && rect && (
    <View
      ref={popoverRef}
      // @ts-ignore RN Web position:fixed
      style={{
        position: 'fixed', top: rect.top + rect.height + 4, left: rect.left,
        width: rect.width,
        zIndex: 1000, maxHeight: 360,
        backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
        overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
      } as unknown as ViewStyle}
    >
          {/* Search */}
          <View style={{ padding: 8, borderBottomColor: c.border, borderBottomWidth: 1 }}>
            <View style={{ position: 'relative' }}>
              <View style={{ position: 'absolute', left: 8, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 } as ViewStyle}>
                <IconSearch size={12} color={c.mut} />
              </View>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search"
                placeholderTextColor={c.mut}
                style={{
                  paddingVertical: 6, paddingLeft: 24, paddingRight: 8,
                  color: c.fg, fontSize: 12, fontFamily,
                  backgroundColor: c.bg,
                  borderColor: c.border, borderWidth: 1, borderRadius: radius.sm,
                } as any}
              />
            </View>
          </View>

          {q.trim() ? (
            <ScrollView style={{ maxHeight: 300 }}>
              {matches.length === 0 && (
                <Text style={{
                  color: c.mut, fontSize: 12, fontFamily,
                  textAlign: 'center', paddingVertical: 16, paddingHorizontal: 12,
                }}>
                  No category matched "{q}"
                </Text>
              )}
              {matches.map((m) => (
                <Pressable
                  key={m.path}
                  onPress={() => { onChange(m.path); setOpen(false); setQ(''); setPath([]); }}
                  style={({ hovered }) => ({
                    paddingHorizontal: 12, paddingVertical: 6,
                    backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
                  } as ViewStyle)}
                >
                  <Text style={{ color: c.fg, fontSize: 12, fontFamily }}>{m.label}</Text>
                  <Text style={{ color: c.mut, fontSize: 11, fontFamily, marginTop: 1 }}>{m.path}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <ScrollView style={{ maxHeight: 300 }}>
              {path.length > 0 && (
                <Pressable
                  onPress={() => setPath(path.slice(0, -1))}
                  accessibilityLabel="Back"
                  style={({ hovered }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    paddingHorizontal: 12, paddingVertical: 8,
                    backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
                    borderBottomColor: c.border, borderBottomWidth: 1,
                  } as ViewStyle)}
                >
                  <IconChevronLeft size={12} color={c.fg} />
                  <Text style={{ color: c.fg, fontSize: 12, fontFamily, fontWeight: weight.medium as TextStyle['fontWeight'] }}>
                    {path.map((p) => p.name).join(' > ')}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => { onChange(''); setOpen(false); setPath([]); }}
                style={({ hovered }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 12, paddingVertical: 6,
                  backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
                } as ViewStyle)}
              >
                <Text style={{ color: c.mut, fontSize: 12, fontStyle: 'italic', fontFamily, flex: 1 }}>-None-</Text>
                {!value && <IconCheck size={12} color={c.gTx} />}
              </Pressable>
              {current.map((node) => {
                const trailNames = path.map((p) => p.name).concat(node.name).join(' > ');
                const hasChildren = !!node.children && node.children.length > 0;
                const selected = value === trailNames;
                return (
                  <Pressable
                    key={node.name}
                    onPress={() => pick(node, path)}
                    style={({ hovered }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      paddingHorizontal: 12, paddingVertical: 6,
                      backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
                    } as ViewStyle)}
                  >
                    <Text style={{
                      color: selected ? c.red : c.fg,
                      fontSize: 12,
                      fontWeight: (selected ? weight.semibold : weight.regular) as TextStyle['fontWeight'],
                      fontFamily,
                      flex: 1, minWidth: 0,
                    }} numberOfLines={1}>
                      {node.name}
                    </Text>
                    {hasChildren ? <IconChevronRight size={12} color={c.mut} /> : selected ? <IconCheck size={12} color={c.gTx} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
    </View>
  );

  return (
    <View ref={ref}>
      <View ref={triggerRef}>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={value || 'Pick a category'}
          accessibilityState={{ expanded: open }}
          style={({ hovered }) => ({
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 12, paddingVertical: 10,
            borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
            backgroundColor: (hovered as boolean) ? c.accent : c.card,
          } as ViewStyle)}
        >
          <Text
            style={{
              color: value ? c.fg : c.mut,
              fontSize: 14, fontFamily,
              flex: 1, minWidth: 0,
            }}
            numberOfLines={1}
          >
            {value || '-None-'}
          </Text>
          <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
            <IconChevronDown size={14} color={c.mut} />
          </View>
        </Pressable>
      </View>
      {popover && portalIt(popover)}
    </View>
  );
}

function portalIt(node: React.ReactNode): React.ReactNode {
  if (typeof document === 'undefined' || !document.body) return node;
  const { createPortal } = require('react-dom') as { createPortal: (n: any, c: Element) => any };
  return createPortal(node, document.body);
}
