// My Area — the Support landing list. Two-column layout on desktop
// (left: search + KPIs + toolbar + filters + list, right: 10-view sidebar).
// Ports `MyArea` from the Franchisee-app Support 1:1 into RN Web + our
// theme tokens.
//
// This file is intentionally a single component so the layout math (grid gaps,
// sticky sidebar, gutter behaviour on phones) stays local. Sub-features
// (KPIs, toolbar, kanban, pagination) mount from this component and are
// implemented in siblings under `src/support/`.

import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, TextInput, ScrollView, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius, weight, font, space } from '../theme/tokens';
import { Body, Button, Screen, PageHeader, SectionCard, useBreakpoint } from '../components/ui';
import { Breadcrumb } from '../components/Breadcrumb';
import { HelpPopover } from '../components/HelpPopover';
import {
  IconSearch, IconClose, IconPlus, IconFileText, IconCheck,
  IconClock, IconMessageSquare, IconBriefcase, IconUsers, IconInbox,
  IconChevronDown, IconChevronLeft, IconChevronRight,
  IconArrowUpDown, IconDownload, IconMore,
  IconList, IconLayoutGrid,
} from '../components/icons';
import {
  VIEWS, DEPARTMENTS, CHANNELS, ME, SORT_LABELS, channelIcon, relTime, matchesView, isOverdueOf,
} from './model';
import type {
  UserTicket, ViewKey, ViewDef, Channel, Department, SortKey,
} from './model';

// ─── Types local to this file ───────────────────────────────────────────

interface MyAreaProps {
  tickets: UserTicket[];
  onOpen: (id: string) => void;
  onNew: () => void;
  /** Kanban drag-and-drop → status change. Fires when a card lands in a new
   *  column. The parent applies the patch and toasts. */
  onMove?: (id: string, next: UserTicket['status']) => void;
}

// ─── Root ───────────────────────────────────────────────────────────────

export function MyArea({ tickets, onOpen, onNew, onMove }: MyAreaProps) {
  const { c } = useTheme();
  const router = useRouter();
  const { width, isPhone } = useBreakpoint();
  const [activeView, setActiveView] = useState<ViewKey>('myTickets');
  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | Department>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | Channel>('all');
  const [sortBy, setSortBy] = useState<SortKey>('recentThread');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [pageNum, setPageNum] = useState(1);
  const PAGE_SIZE = 10;

  const counts: Record<ViewKey, number> = useMemo(() => {
    const out = {} as Record<ViewKey, number>;
    VIEWS.forEach((v) => { out[v.key] = tickets.filter((t) => matchesView(t, v.key)).length; });
    return out;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = tickets.filter((t) => matchesView(t, activeView));
    if (departmentFilter !== 'all') rows = rows.filter((t) => t.department === departmentFilter);
    if (channelFilter    !== 'all') rows = rows.filter((t) => t.channel === channelFilter);
    if (q) rows = rows.filter((t) =>
      t.subject.toLowerCase().includes(q) ||
      t.id.includes(q) ||
      t.complaintCategoryPath.toLowerCase().includes(q)
    );
    rows.sort((a, b) => sortBy === 'recentThread'
      ? b.lastThreadAt - a.lastThreadAt
      : b.createdAt - a.createdAt);
    return rows;
  }, [tickets, activeView, departmentFilter, channelFilter, sortBy, query]);

  const clearFilters = () => {
    setQuery(''); setDepartmentFilter('all'); setChannelFilter('all'); setSortBy('recentThread');
  };
  const anyFilterActive =
    !!query || departmentFilter !== 'all' || channelFilter !== 'all' || sortBy !== 'recentThread';

  // Reset to page 1 whenever the underlying list changes (Zoho canon).
  useEffect(() => { setPageNum(1); }, [activeView, departmentFilter, channelFilter, sortBy, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);

  const activeViewLabel = VIEWS.find((v) => v.key === activeView)?.label ?? 'My Tickets';
  const twoCol = width >= 960;

  return (
    <Screen>
      <Breadcrumb parent={{ label: 'Home', href: '/' }} current="Support" />
      <PageHeader
        title="Support · My Area"
        subtitle="Search, raise and track tickets with corporate."
        action={
          !isPhone ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: c.mut, fontSize: font.caption, fontFamily }}>{ME.name}</Text>
              <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, opacity: 0.5 }}>·</Text>
              <Text style={{ color: c.mut, fontSize: font.caption, fontFamily }}>{ME.email}</Text>
            </View>
          ) : undefined
        }
      />

      {/* Search — prominent, above the split */}
      <View
        style={{
          position: 'relative',
          backgroundColor: c.card,
          borderColor: c.border, borderWidth: 1,
          borderRadius: radius.md,
        }}
      >
        <View style={{ position: 'absolute', left: 12, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 } as ViewStyle}>
          <IconSearch size={16} color={c.mut} />
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search tickets"
          placeholderTextColor={c.mut}
          style={{
            paddingVertical: 10,
            paddingLeft: 36, paddingRight: query ? 36 : 12,
            color: c.fg, fontSize: 14, fontFamily,
            backgroundColor: 'transparent',
          } as any}
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery('')}
            accessibilityLabel="Clear search"
            style={{ position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 6 } as ViewStyle}
          >
            <IconClose size={14} color={c.mut} />
          </Pressable>
        )}
      </View>

      {/* At-a-glance — three franchisee-actionable KPIs above the list */}
      <AtAGlanceCard tickets={tickets} onJump={setActiveView} />

      {/* Two-column split ─ left: list, right: view sidebar */}
      <View style={{ flexDirection: twoCol ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        {/* Left column */}
        <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
          {/* Toolbar */}
          <MyAreaToolbar
            departmentFilter={departmentFilter} onDepartment={setDepartmentFilter}
            channelFilter={channelFilter}       onChannel={setChannelFilter}
            sortBy={sortBy}                     onSort={setSortBy}
          />

          {/* Applied filter chips */}
          <AppliedFilters
            query={query}                      onClearQuery={() => setQuery('')}
            department={departmentFilter}      onClearDepartment={() => setDepartmentFilter('all')}
            channel={channelFilter}            onClearChannel={() => setChannelFilter('all')}
            sortBy={sortBy}                    onResetSort={() => setSortBy('recentThread')}
            onClearAll={clearFilters}
          />

          {/* Active view header + ticket count + List/Kanban toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4, gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: c.fg, fontSize: font.h4, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>{activeViewLabel}</Text>
              <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, marginTop: 2 }}>
                {filtered.length} ticket{filtered.length === 1 ? '' : 's'}
              </Text>
            </View>
            <ViewToggle view={viewMode} onView={setViewMode} />
          </View>

          {/* List / Kanban / Empty */}
          {filtered.length === 0 ? (
            <EmptyState onRaise={onNew} filtered={anyFilterActive} onClearFilters={clearFilters} />
          ) : viewMode === 'list' ? (
            <View style={{ gap: 6 }}>
              {paginated.map((t) => (
                <TicketRow key={t.id} t={t} onOpen={() => onOpen(t.id)} />
              ))}
              {filtered.length > PAGE_SIZE && (
                <Pagination
                  pageNum={pageNum} totalPages={totalPages}
                  pageSize={PAGE_SIZE} total={filtered.length}
                  onPrev={() => setPageNum((n) => Math.max(1, n - 1))}
                  onNext={() => setPageNum((n) => Math.min(totalPages, n + 1))}
                />
              )}
            </View>
          ) : (
            <KanbanView rows={filtered} onOpen={(id) => onOpen(id)} onMove={onMove} />
          )}
        </View>

        {/* Right column — Views sidebar */}
        <View style={{ width: twoCol ? 240 : ('100%' as unknown as number), gap: 12 }}>
          <Button
            label="Add ticket"
            variant="primary"
            leading={<IconPlus size={14} color="#fff" />}
            onPress={onNew}
            fullWidth
          />
          <ViewsSidebar
            activeView={activeView}
            counts={counts}
            onPick={setActiveView}
          />
        </View>
      </View>

      {/* Pre-footer banner — Zoho verbatim copy */}
      <View style={{
        flexDirection: width < 640 ? 'column' : 'row',
        alignItems: width < 640 ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: c.card,
        borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
      }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: c.fg, fontSize: font.body, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
            Still can&#39;t find an answer?
          </Text>
          <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, marginTop: 2 }}>
            Send us a ticket and we will get back to you.
          </Text>
        </View>
        <Button label="Submit a ticket" variant="primary" onPress={onNew} />
      </View>

      <HelpPopover
        title="Support · My Area"
        sections={[
          {
            heading: 'What is this page for?',
            body: 'Track every ticket you have raised with HQ and reply to open threads. HQ Support is the corporate helpdesk — routing, replies, and resolution live here.',
          },
          {
            heading: 'The Views sidebar',
            body: [
              'My Tickets — everything you raised.',
              'My Open / On Hold / Closed / Overdue — narrow by status.',
              "CC'd Tickets — threads where you're a secondary contact.",
              'Numbers next to each view show the current count.',
            ],
          },
          {
            heading: 'List vs Kanban',
            body: 'List is the classic table. Kanban shows three status columns (Open · On Hold · Closed) — drag a card between columns to change its status.',
          },
          {
            heading: 'Filters + Search',
            body: 'Toolbar filters by Department and Channel. Sort by recent thread or created time. Applied filters appear as chips — click × on a chip to clear one, "Clear all" to reset.',
          },
          {
            heading: 'Raise a ticket',
            body: 'Click "Add ticket" (right sidebar) or "Submit a ticket" at the bottom to open the form. Pick a department, category, subject, and a description — HQ replies inside the same thread.',
          },
        ]}
      />
    </Screen>
  );
}

// ─── At-a-Glance — 3 franchisee-actionable KPIs + takeaway ─────────────
// Three counts the franchisee can act on right now:
//   1. Open tickets     — how many are in flight.
//   2. Awaiting your reply — the count where the franchisee is the bottleneck.
//   3. Overdue          — corporate hasn't replied within target window.
// Each tile jumps to its matching Views-sidebar filter. Below, a takeaway
// sentence explains the most-important state in plain English.

function AtAGlanceCard({
  tickets, onJump,
}: {
  tickets: UserTicket[];
  onJump: (v: ViewKey) => void;
}) {
  const { c } = useTheme();
  const { width, isPhone } = useBreakpoint();
  const mine = tickets.filter((t) => t.raisedByMe);
  const openOnly = mine.filter((t) => t.status === 'open');
  const onHold   = mine.filter((t) => t.status === 'on-hold');
  const closed   = mine.filter((t) => t.status === 'closed');
  const active   = mine.filter((t) => t.status !== 'closed');
  const awaitingYou = active.filter((t) => {
    const last = t.replies[t.replies.length - 1];
    return t.status === 'open' && last && last.from === 'Corporate';
  });
  const overdue = active.filter(isOverdueOf);

  // Takeaway line — one plain sentence, priority: awaiting > overdue > none > all-quiet.
  const takeaway = (() => {
    if (awaitingYou.length > 0) {
      const n = awaitingYou.length;
      return (
        <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, lineHeight: 18 }}>
          <Text style={{ color: c.red, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
            {n} ticket{n === 1 ? '' : 's'}
          </Text>
          {' '}{n === 1 ? 'is' : 'are'} waiting on your reply. Open {n === 1 ? 'it' : 'them'} from the list and respond so corporate can keep moving.
        </Text>
      );
    }
    if (overdue.length > 0) {
      const n = overdue.length;
      return (
        <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, lineHeight: 18 }}>
          <Text style={{ color: c.red, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
            {n} ticket{n === 1 ? '' : 's'} overdue
          </Text>
          {' '}with corporate. Open {n === 1 ? 'it' : 'them'} and send a nudge if it&#39;s blocking your store.
        </Text>
      );
    }
    if (active.length === 0) {
      return (
        <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, lineHeight: 18 }}>
          No active tickets right now. Use{' '}
          <Text style={{ color: c.fg, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>Add ticket</Text>
          {' '}on the right if you need to raise something with corporate.
        </Text>
      );
    }
    return (
      <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, lineHeight: 18 }}>
        All{' '}
        <Text style={{ color: c.fg, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>{active.length}</Text>
        {' '}active ticket{active.length === 1 ? '' : 's'} {active.length === 1 ? 'is' : 'are'} in flight with corporate. Nothing pending from your side.
      </Text>
    );
  })();

  // Layout: three columns on wide, single column stack on narrow.
  const stack = width < 640;

  return (
    <SectionCard title="At a glance" subtitle="Snapshot of your tickets with corporate.">
      <View style={{ padding: isPhone ? 14 : 16 }}>
        <View style={{ flexDirection: stack ? 'column' : 'row', gap: stack ? 12 : 0 }}>
          <KpiTile
            label="Open tickets"
            value={openOnly.length}
            sub={`${onHold.length} on hold · ${closed.length} closed`}
            tone="neutral"
            onPress={() => onJump('myOpen')}
          />
          <KpiTile
            label="Awaiting your reply"
            value={awaitingYou.length}
            sub={awaitingYou.length > 0 ? 'Corporate replied — you owe a response' : 'No replies pending from you'}
            tone={awaitingYou.length > 0 ? 'bad' : 'good'}
            divider={!stack}
            onPress={() => onJump('myOpen')}
          />
          <KpiTile
            label="Overdue"
            value={overdue.length}
            sub={overdue.length > 0 ? "Corporate hasn't replied in target window" : 'All within target window'}
            tone={overdue.length > 0 ? 'bad' : 'good'}
            divider={!stack}
            onPress={() => onJump('myOverdue')}
          />
        </View>
        <View style={{ marginTop: 16, paddingTop: 12, borderTopColor: c.border, borderTopWidth: 1 }}>
          {takeaway}
        </View>
      </View>
    </SectionCard>
  );
}

function KpiTile({
  label, value, sub, tone, divider, onPress,
}: {
  label: string;
  value: number;
  sub: string;
  tone: 'good' | 'watch' | 'bad' | 'neutral';
  divider?: boolean;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const valueTone =
    tone === 'bad'   ? c.rTx :
    tone === 'watch' ? c.yTx :
                       c.fg;
  const subTone =
    tone === 'good'  ? c.gTx :
    tone === 'bad'   ? c.rTx :
    tone === 'watch' ? c.yTx :
                       c.mut;
  const inner = (
    <>
      <Text style={{
        color: c.mut, fontSize: 11,
        fontWeight: weight.semibold as TextStyle['fontWeight'],
        letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
      }}>{label}</Text>
      <Text style={{
        color: valueTone, fontSize: 32, fontWeight: weight.bold as TextStyle['fontWeight'],
        fontFamily, marginTop: 6, fontVariant: ['tabular-nums'], lineHeight: 34,
      }}>{value}</Text>
      <Text style={{ color: subTone, fontSize: font.caption, fontFamily, marginTop: 4, lineHeight: 16 }}>
        {sub}
      </Text>
    </>
  );
  const wrapStyle: ViewStyle = {
    flex: 1, minWidth: 0,
    paddingHorizontal: divider ? 16 : 0,
    paddingRight: divider ? undefined : 16,
    borderLeftWidth: 0, // canon: no one-sided edge accents anywhere
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ hovered }) => ([
          wrapStyle,
          {
            paddingVertical: 6,
            borderRadius: radius.sm,
            backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
          } as ViewStyle,
        ])}
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={wrapStyle}>{inner}</View>;
}

// ─── MyAreaToolbar — Department · Channel · Sort · Export · More ───────
// Left cluster: Department + Channel dropdowns. Right cluster: Sort button
// (with red dot when non-default), Export CSV, three-dot menu with
// "Export History". Dropdowns close on outside click.

function MyAreaToolbar({
  departmentFilter, onDepartment,
  channelFilter,    onChannel,
  sortBy,           onSort,
}: {
  departmentFilter: 'all' | Department;
  onDepartment: (d: 'all' | Department) => void;
  channelFilter: 'all' | Channel;
  onChannel: (c: 'all' | Channel) => void;
  sortBy: SortKey;
  onSort: (s: SortKey) => void;
}) {
  const { c } = useTheme();
  const [openMenu, setOpenMenu] = useState<'dept' | 'chan' | 'sort' | 'more' | null>(null);
  const wrapRef = useRef<View | null>(null);
  useEffect(() => {
    if (!openMenu) return;
    // Web only — RN native has no document. Best-effort outside-click close.
    if (typeof document === 'undefined') return;
    const handler = (e: MouseEvent) => {
      const el = wrapRef.current as unknown as HTMLElement | null;
      if (el && !el.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

  return (
    <View
      ref={wrapRef as any}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, position: 'relative', zIndex: 20 }}
    >
      {/* Department */}
      <DropdownButton
        label={departmentFilter === 'all' ? 'All Department' : departmentFilter}
        active={departmentFilter !== 'all'}
        open={openMenu === 'dept'}
        onToggle={() => setOpenMenu(openMenu === 'dept' ? null : 'dept')}
      >
        <DropdownItem active={departmentFilter === 'all'} onPress={() => { onDepartment('all'); setOpenMenu(null); }}>All Department</DropdownItem>
        {DEPARTMENTS.map((d) => (
          <DropdownItem key={d} active={departmentFilter === d} onPress={() => { onDepartment(d); setOpenMenu(null); }}>{d}</DropdownItem>
        ))}
      </DropdownButton>

      {/* Channel */}
      <DropdownButton
        label={channelFilter === 'all' ? 'All Channel' : channelFilter}
        active={channelFilter !== 'all'}
        open={openMenu === 'chan'}
        onToggle={() => setOpenMenu(openMenu === 'chan' ? null : 'chan')}
      >
        <DropdownItem active={channelFilter === 'all'} onPress={() => { onChannel('all'); setOpenMenu(null); }}>All Channel</DropdownItem>
        {CHANNELS.map((cn) => {
          const Icon = cn.icon;
          return (
            <DropdownItem key={cn.name} active={channelFilter === cn.name} onPress={() => { onChannel(cn.name); setOpenMenu(null); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon size={12} color={c.mut} />
                <Text style={{ color: c.fg, fontSize: 12, fontFamily }}>{cn.name}</Text>
              </View>
            </DropdownItem>
          );
        })}
      </DropdownButton>

      {/* Right cluster */}
      <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {/* Sort */}
        <View style={{ position: 'relative' }}>
          <Pressable
            onPress={() => setOpenMenu(openMenu === 'sort' ? null : 'sort')}
            accessibilityLabel={`Sort by · currently ${SORT_LABELS[sortBy]}`}
            style={({ hovered }) => ({
              width: 36, height: 36, borderRadius: radius.sm,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
            } as ViewStyle)}
          >
            <IconArrowUpDown size={16} color={sortBy !== 'recentThread' ? c.red : c.mut} />
            {sortBy !== 'recentThread' && (
              <View style={{
                position: 'absolute', top: 8, right: 8,
                width: 6, height: 6, borderRadius: 999, backgroundColor: c.redSolid,
              }} />
            )}
          </Pressable>
          {openMenu === 'sort' && (
            <View style={{
              position: 'absolute', right: 0, top: 40, zIndex: 40, minWidth: 160,
              backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
              paddingVertical: 4,
              shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
            }}>
              <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderBottomColor: c.border, borderBottomWidth: 1 }}>
                <Text style={{ color: c.mut, fontSize: 10, fontFamily, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: weight.semibold as TextStyle['fontWeight'] }}>
                  Sort By
                </Text>
              </View>
              {(['recentThread', 'createdTime'] as SortKey[]).map((s) => (
                <DropdownItem key={s} active={sortBy === s} onPress={() => { onSort(s); setOpenMenu(null); }}>
                  <Text style={{ color: c.fg, fontSize: 12, fontFamily }}>{SORT_LABELS[s]}</Text>
                </DropdownItem>
              ))}
            </View>
          )}
        </View>

        {/* Export CSV (stub — surfaces a toast in a future task) */}
        <Pressable
          onPress={() => {/* export CSV — no-op for now */}}
          accessibilityLabel="Export as CSV"
          style={({ hovered }) => ({
            width: 36, height: 36, borderRadius: radius.sm,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
          } as ViewStyle)}
        >
          <IconDownload size={16} color={c.mut} />
        </Pressable>

        {/* Three-dot menu */}
        <View style={{ position: 'relative' }}>
          <Pressable
            onPress={() => setOpenMenu(openMenu === 'more' ? null : 'more')}
            accessibilityLabel="More options"
            style={({ hovered }) => ({
              width: 36, height: 36, borderRadius: radius.sm,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
            } as ViewStyle)}
          >
            <IconMore size={16} color={c.mut} />
          </Pressable>
          {openMenu === 'more' && (
            <View style={{
              position: 'absolute', right: 0, top: 40, zIndex: 40, minWidth: 180,
              backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
              paddingVertical: 4,
              shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
            }}>
              <DropdownItem onPress={() => setOpenMenu(null)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <IconDownload size={12} color={c.mut} />
                  <Text style={{ color: c.fg, fontSize: 12, fontFamily }}>Export History</Text>
                </View>
              </DropdownItem>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// A stubby "Zoho-style" dropdown button. Label + chevron.
function DropdownButton({
  label, active, open, onToggle, children,
}: {
  label: string; active?: boolean; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        style={({ hovered }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 4,
          paddingHorizontal: 10, paddingVertical: 6,
          borderRadius: radius.sm,
          backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
        } as ViewStyle)}
      >
        <Text
          numberOfLines={1}
          style={{
            color: active ? c.red : c.fg,
            fontSize: 12,
            fontWeight: (active ? weight.medium : weight.regular) as TextStyle['fontWeight'],
            fontFamily,
            maxWidth: 260,
          }}
        >
          {label}
        </Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <IconChevronDown size={12} color={c.mut} />
        </View>
      </Pressable>
      {open && (
        <View style={{
          position: 'absolute', left: 0, top: 34, zIndex: 40, minWidth: 220, maxHeight: 260,
          backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
          paddingVertical: 4,
          shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
        }}>
          <ScrollView style={{ maxHeight: 260 }}>
            {children}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function DropdownItem({
  active, onPress, children,
}: {
  active?: boolean; onPress: () => void; children: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityState={{ selected: active }}
      style={({ hovered }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
      } as ViewStyle)}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof children === 'string' ? (
          <Text style={{
            color: active ? c.red : c.fg,
            fontSize: 12,
            fontWeight: (active ? weight.semibold : weight.regular) as TextStyle['fontWeight'],
            fontFamily,
          }}>
            {children}
          </Text>
        ) : children}
      </View>
      {active && <IconCheck size={12} color={c.gTx} />}
    </Pressable>
  );
}

// ─── Applied-filter chip strip ─────────────────────────────────────────
// Renders one chip per non-default filter. Each chip has its own X;
// "Clear all" clears every filter in one tap. Hidden entirely when
// nothing is filtering.

function AppliedFilters({
  query, onClearQuery,
  department, onClearDepartment,
  channel, onClearChannel,
  sortBy, onResetSort,
  onClearAll,
}: {
  query: string; onClearQuery: () => void;
  department: 'all' | Department; onClearDepartment: () => void;
  channel: 'all' | Channel; onClearChannel: () => void;
  sortBy: SortKey; onResetSort: () => void;
  onClearAll: () => void;
}) {
  const { c } = useTheme();
  const chips: { key: string; label: string; onClear: () => void }[] = [];
  if (query) chips.push({ key: 'q', label: `Search: "${query}"`, onClear: onClearQuery });
  if (department !== 'all') chips.push({ key: 'd', label: `Department: ${department}`, onClear: onClearDepartment });
  if (channel !== 'all')    chips.push({ key: 'c', label: `Channel: ${channel}`, onClear: onClearChannel });
  if (sortBy !== 'recentThread') chips.push({ key: 's', label: `Sort: ${SORT_LABELS[sortBy]}`, onClear: onResetSort });
  if (chips.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
      <Text style={{
        color: c.mut, fontSize: 10,
        fontWeight: weight.semibold as TextStyle['fontWeight'],
        letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
        marginRight: 2,
      }}>
        Filters
      </Text>
      {chips.map((chip) => (
        <View key={chip.key} style={{
          flexDirection: 'row', alignItems: 'center', gap: 4,
          paddingLeft: 10, paddingRight: 4, paddingVertical: 2,
          borderRadius: 999,
          backgroundColor: c.muted, borderColor: c.border, borderWidth: 1,
        }}>
          <Text style={{ color: c.fg, fontSize: 12, fontFamily }} numberOfLines={1}>{chip.label}</Text>
          <Pressable
            onPress={chip.onClear}
            accessibilityLabel={`Remove filter: ${chip.label}`}
            style={{ padding: 2, borderRadius: 999 }}
          >
            <IconClose size={10} color={c.mut} />
          </Pressable>
        </View>
      ))}
      <Pressable onPress={onClearAll} accessibilityLabel="Clear all filters" style={{ marginLeft: 4 }}>
        <Text style={{ color: c.mut, fontSize: 12, fontFamily, textDecorationLine: 'underline' }}>
          Clear all
        </Text>
      </Pressable>
    </View>
  );
}

// ─── TicketRow — 5-tier meta strip, closed-row de-emphasis ─────────────

function TicketRow({ t, onOpen }: { t: UserTicket; onOpen: () => void }) {
  const { c } = useTheme();
  const ChannelIcon = channelIcon(t.channel);
  const overdue = isOverdueOf(t);
  const lastReply = t.replies[t.replies.length - 1];
  const awaitingYou = t.status === 'open' && lastReply && lastReply.from === 'Corporate';
  // Plain-language cue — additive polish above subject. Priority:
  // Overdue > Awaiting your reply > Closed > On-hold > Open.
  const cue =
    overdue ? { text: 'Overdue · needs attention', tone: c.rTx } :
    awaitingYou ? { text: 'Corporate replied · your turn', tone: c.rTx } :
    t.status === 'closed' ? { text: 'Done. Reply below if it happened again.', tone: c.mut } :
    t.status === 'on-hold' ? { text: 'Paused · corporate is waiting on something', tone: c.yTx } :
    { text: "We're on it · corporate will reach out soon", tone: c.gTx };
  const isClosed = t.status === 'closed';
  const initials = t.assignedTo === 'unassigned'
    ? ''
    : t.assignedTo.split(/[\s()]+/).filter(Boolean).map((p) => p[0]!.toUpperCase()).slice(0, 2).join('');
  const statusChip = statusChipFor(t.status, c);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open ticket ${t.id}: ${t.subject}`}
      style={({ hovered }) => ({
        backgroundColor: isClosed ? mixBg(c.card, c.muted, 0.35) : c.card,
        borderColor: c.border, borderWidth: 1,
        borderRadius: radius.md,
        padding: 12,
        opacity: (hovered as boolean) ? 0.96 : 1,
      } as ViewStyle)}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Plain-language cue */}
          <Text style={{ color: cue.tone, fontSize: font.caption, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
            {cue.text}
          </Text>
          {/* Subject */}
          <Text
            numberOfLines={2}
            style={{
              color: isClosed ? mixText(c.fg, c.mut, 0.25) : c.fg,
              fontSize: font.body, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily,
              marginTop: 4, lineHeight: 20,
            }}
          >
            {t.subject}
          </Text>
          {/* 5-tier meta strip */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }}>
            {/* Tier 1 — id anchor */}
            <View style={{
              paddingHorizontal: 6, paddingVertical: 2,
              backgroundColor: c.muted, borderColor: c.border, borderWidth: 1,
              borderRadius: 4,
            }}>
              <Text style={{ color: c.fg, fontSize: 11, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily, fontVariant: ['tabular-nums'] }}>
                #{t.id}
              </Text>
            </View>
            {/* Tier 2 — channel (blue chip) */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 6, paddingVertical: 2,
              backgroundColor: c.bBg,
              borderRadius: 4,
            }}>
              <ChannelIcon size={12} color={c.bTx} />
              <Text style={{ color: c.bTx, fontSize: 12, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
                {t.channel}
              </Text>
            </View>
            {/* Tier 3 — department */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <IconBriefcase size={12} color={c.mut} />
              <Text style={{ color: c.fg, fontSize: 12, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
                {t.department}
              </Text>
            </View>
            {/* Tier 4 — time */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <IconClock size={12} color={c.mut} />
              <Text style={{ color: c.mut, fontSize: 12, fontFamily }}>{relTime(t.createdAt)}</Text>
            </View>
            {/* Tier 4 — replies */}
            {t.replies.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <IconMessageSquare size={12} color={c.mut} />
                <Text style={{ color: c.mut, fontSize: 12, fontFamily, fontVariant: ['tabular-nums'] }}>{t.replies.length}</Text>
              </View>
            )}
            {/* Tier 5 — overdue */}
            {overdue && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 6, paddingVertical: 2,
                backgroundColor: c.rBg, borderRadius: 4,
              }}>
                <IconClock size={12} color={c.rTx} />
                <Text style={{ color: c.rTx, fontSize: 11, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>Overdue</Text>
              </View>
            )}
          </View>
        </View>
        {/* Assignee avatar + status pill */}
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {t.assignedTo === 'unassigned' ? (
            <View style={{
              width: 28, height: 28, borderRadius: 999,
              backgroundColor: c.muted, borderColor: c.border, borderWidth: 1,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <IconUsers size={12} color={c.mut} />
            </View>
          ) : (
            <View style={{
              width: 28, height: 28, borderRadius: 999,
              backgroundColor: avatarBgHash(t.assignedTo),
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: weight.bold as TextStyle['fontWeight'], fontFamily }}>
                {initials || 'U'}
              </Text>
            </View>
          )}
          <View style={{
            paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
            backgroundColor: statusChip.bg, borderColor: statusChip.border, borderWidth: 1,
          }}>
            <Text style={{ color: statusChip.tx, fontSize: 11, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
              {statusChip.label}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── List/Kanban toggle ───────────────────────────────────────────────

function ViewToggle({ view, onView }: { view: 'list' | 'kanban'; onView: (v: 'list' | 'kanban') => void }) {
  const { c } = useTheme();
  const Btn = ({ mode, label, Icon }: { mode: 'list' | 'kanban'; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }) => {
    const active = view === mode;
    return (
      <Pressable
        onPress={() => onView(mode)}
        accessibilityLabel={`${label} view`}
        accessibilityState={{ selected: active }}
        style={({ hovered }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm,
          backgroundColor: active ? c.accent : (hovered as boolean) ? c.accent : 'transparent',
        } as ViewStyle)}
      >
        <Icon size={13} color={active ? c.fg : c.mut} />
        <Text style={{
          color: active ? c.fg : c.mut, fontSize: 12,
          fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily,
        }}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={{
      flexDirection: 'row', gap: 2, padding: 2,
      borderColor: c.border, borderWidth: 1, borderRadius: radius.sm,
      backgroundColor: c.card,
    }}>
      <Btn mode="list" label="List" Icon={IconList} />
      <Btn mode="kanban" label="Kanban" Icon={IconLayoutGrid} />
    </View>
  );
}

// ─── Kanban (read-only 3-column board) ────────────────────────────────
// The franchisee can't move ticket status themselves — only corporate's
// reply can. So no drag-and-drop; each card just clicks through to
// detail.

function KanbanView({ rows, onOpen, onMove }: {
  rows: UserTicket[];
  onOpen: (id: string) => void;
  onMove?: (id: string, next: UserTicket['status']) => void;
}) {
  const { c } = useTheme();
  const { width } = useBreakpoint();
  const cols: { key: UserTicket['status']; label: string; tone: string }[] = [
    { key: 'open',    label: 'Open',    tone: c.bTx },
    { key: 'on-hold', label: 'On Hold', tone: c.yTx },
    { key: 'closed',  label: 'Closed',  tone: c.gTx },
  ];
  const grouped = cols.reduce((acc, cur) => {
    acc[cur.key] = rows.filter((r) => r.status === cur.key);
    return acc;
  }, {} as Record<UserTicket['status'], UserTicket[]>);
  const stack = width < 768;
  // Which column is currently being dragged OVER — highlights the drop target.
  const [dropTarget, setDropTarget] = useState<UserTicket['status'] | null>(null);
  return (
    <View style={{ flexDirection: stack ? 'column' : 'row', gap: 12 }}>
      {onMove && (
        <View style={{ position: 'absolute', top: -22, right: 0 }}>
          <Text style={{ color: c.mut, fontSize: 11, fontFamily }}>
            Drag a card between columns to change its status
          </Text>
        </View>
      )}
      {cols.map((col) => (
        <KanbanColumn
          key={col.key}
          col={col}
          count={grouped[col.key].length}
          isDropOver={dropTarget === col.key}
          onDrop={(ticketId) => {
            setDropTarget(null);
            if (onMove) onMove(ticketId, col.key);
          }}
          onDragOver={() => setDropTarget(col.key)}
          onDragLeave={() => setDropTarget((cur) => (cur === col.key ? null : cur))}
        >
          {grouped[col.key].length === 0 ? (
            <Text style={{
              textAlign: 'center', color: c.mut, fontSize: 11, fontFamily,
              paddingVertical: 30, paddingHorizontal: 8,
            }}>
              No {col.label.toLowerCase()} tickets
            </Text>
          ) : (
            grouped[col.key].map((t) => (
              <KanbanCard
                key={t.id}
                t={t}
                onOpen={() => onOpen(t.id)}
                draggable={!!onMove}
              />
            ))
          )}
        </KanbanColumn>
      ))}
    </View>
  );
}

// A single column. Renders as a plain <div> on web so HTML5 drag-and-drop
// events fire; on native this falls back to a View. When the current drag
// hovers, the border pulses to signal the drop target.
function KanbanColumn({
  col, count, children,
  isDropOver, onDrop, onDragOver, onDragLeave,
}: {
  col: { key: UserTicket['status']; label: string; tone: string };
  count: number;
  children: React.ReactNode;
  isDropOver: boolean;
  onDrop: (ticketId: string) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
}) {
  const { c } = useTheme();
  const body = (
    <>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, paddingVertical: 8,
        borderBottomColor: c.border, borderBottomWidth: 1,
        backgroundColor: c.footerBg,
      }}>
        <Text style={{ color: col.tone, fontSize: 11, fontWeight: weight.semibold as TextStyle['fontWeight'], letterSpacing: 0.6, textTransform: 'uppercase', fontFamily }}>
          {col.label}
        </Text>
        <View style={{
          paddingHorizontal: 6, paddingVertical: 1,
          borderRadius: 4, borderColor: c.border, borderWidth: 1,
          backgroundColor: c.card,
        }}>
          <Text style={{ color: c.mut, fontSize: 11, fontVariant: ['tabular-nums'], fontFamily }}>
            {count}
          </Text>
        </View>
      </View>
      <View style={{ padding: 8, gap: 8, minHeight: 200 }}>
        {children}
      </View>
    </>
  );

  if (Platform.OS !== 'web') {
    return (
      <View
        style={{
          flex: 1, minWidth: 0, minHeight: 280,
          backgroundColor: c.card,
          borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
        }}
      >
        {body}
      </View>
    );
  }

  // Web — enable HTML5 drop target on the column wrapper.
  return createElement(
    'div',
    {
      onDragOver: (e: any) => { e.preventDefault(); onDragOver(); },
      onDragEnter: (e: any) => { e.preventDefault(); onDragOver(); },
      onDragLeave: (e: any) => {
        // Only clear when leaving the column entirely, not its inner cards.
        const rel = e.relatedTarget as Node | null;
        if (!rel || !e.currentTarget.contains(rel)) onDragLeave();
      },
      onDrop: (e: any) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (id) onDrop(id);
      },
      style: {
        flex: 1, minWidth: 0, minHeight: 280,
        backgroundColor: c.card,
        borderColor: isDropOver ? c.redSolid : c.border,
        borderWidth: 1, borderRadius: radius.md,
        // Web-only: a soft shadow when the column is the active drop target
        // so the user knows exactly where the card will land.
        boxShadow: isDropOver ? `0 0 0 3px ${withAlpha(c.redSolid, 0.15)}` : 'none',
        transition: 'border-color 120ms, box-shadow 120ms',
        overflow: 'hidden',
      },
    },
    body as any,
  );
}

function KanbanCard({ t, onOpen, draggable }: { t: UserTicket; onOpen: () => void; draggable?: boolean }) {
  const { c } = useTheme();
  const ChIcon = channelIcon(t.channel);
  const overdue = isOverdueOf(t);
  const lastReply = t.replies[t.replies.length - 1];
  const awaitingYou = t.status === 'open' && lastReply && lastReply.from === 'Corporate';
  const cue =
    overdue ? { text: 'Overdue · needs attention', tone: c.rTx } :
    awaitingYou ? { text: 'Corporate replied · your turn', tone: c.rTx } :
    t.status === 'closed' ? { text: 'Done · reply if it happened again', tone: c.mut } :
    t.status === 'on-hold' ? { text: 'Paused · waiting on corporate', tone: c.yTx } :
    { text: "We're on it", tone: c.gTx };
  const [isDragging, setIsDragging] = useState(false);
  const inner = (
    <Pressable
      onPress={onOpen}
      accessibilityLabel={`Open ticket ${t.id}: ${t.subject}`}
      style={({ hovered }) => ({
        padding: 10, gap: 6,
        backgroundColor: (hovered as boolean) ? c.accent : c.card,
        borderColor: c.border, borderWidth: 1,
        borderRadius: radius.sm,
        opacity: t.status === 'closed' ? 0.85 : isDragging ? 0.4 : 1,
        // Web-only grabby cursor when the card is draggable.
        // @ts-ignore RN Web cursor
        cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : undefined,
      } as ViewStyle)}
    >
      <Text style={{ color: cue.tone, fontSize: 11, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
        {cue.text}
      </Text>
      <Text
        numberOfLines={2}
        style={{ color: c.fg, fontSize: font.body, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily, lineHeight: 18 }}
      >
        {t.subject}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <View style={{
          paddingHorizontal: 5, paddingVertical: 1,
          backgroundColor: c.muted, borderColor: c.border, borderWidth: 1, borderRadius: 4,
        }}>
          <Text style={{ color: c.fg, fontSize: 10, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily, fontVariant: ['tabular-nums'] }}>
            #{t.id}
          </Text>
        </View>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 3,
          paddingHorizontal: 5, paddingVertical: 1,
          backgroundColor: c.bBg, borderRadius: 4,
        }}>
          <ChIcon size={11} color={c.bTx} />
          <Text style={{ color: c.bTx, fontSize: 11, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
            {t.channel}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <IconClock size={11} color={c.mut} />
          <Text style={{ color: c.mut, fontSize: 11, fontFamily }}>{relTime(t.createdAt)}</Text>
        </View>
        {overdue && (
          <View style={{
            marginLeft: 'auto',
            flexDirection: 'row', alignItems: 'center', gap: 3,
            paddingHorizontal: 5, paddingVertical: 1,
            backgroundColor: c.rBg, borderRadius: 4,
          }}>
            <IconClock size={10} color={c.rTx} />
            <Text style={{ color: c.rTx, fontSize: 10, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
              Overdue
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  if (!draggable || Platform.OS !== 'web') return inner;

  // Web + draggable: wrap in a native <div> so HTML5 DnD events fire.
  return createElement(
    'div',
    {
      draggable: true,
      onDragStart: (e: any) => {
        setIsDragging(true);
        e.dataTransfer.setData('text/plain', t.id);
        e.dataTransfer.effectAllowed = 'move';
      },
      onDragEnd: () => setIsDragging(false),
    },
    inner as any,
  );
}

// ─── Pagination — "Showing X–Y of Z tickets" (Zoho canon) ───────────────

function Pagination({
  pageNum, totalPages, pageSize, total, onPrev, onNext,
}: {
  pageNum: number; totalPages: number; pageSize: number; total: number;
  onPrev: () => void; onNext: () => void;
}) {
  const { c } = useTheme();
  const from = (pageNum - 1) * pageSize + 1;
  const to   = Math.min(pageNum * pageSize, total);
  const prevDisabled = pageNum === 1;
  const nextDisabled = pageNum === totalPages;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 12, paddingTop: 12,
      borderTopColor: c.border, borderTopWidth: 1,
    }}>
      <PageBtn label="Previous" leading={<IconChevronLeft size={12} color={c.mut} />} onPress={onPrev} disabled={prevDisabled} />
      <Text style={{ color: c.mut, fontSize: 12, fontFamily, fontVariant: ['tabular-nums'] }}>
        Showing{' '}
        <Text style={{ color: c.fg, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
          {from}–{to}
        </Text>
        {' '}of{' '}
        <Text style={{ color: c.fg, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>{total}</Text>
        {' '}ticket{total === 1 ? '' : 's'}
      </Text>
      <PageBtn label="Next" trailing={<IconChevronRight size={12} color={c.mut} />} onPress={onNext} disabled={nextDisabled} />
    </View>
  );
}

function PageBtn({
  label, leading, trailing, onPress, disabled,
}: {
  label: string; leading?: React.ReactNode; trailing?: React.ReactNode; onPress: () => void; disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ hovered }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingVertical: 6, paddingHorizontal: 12,
        borderColor: c.border, borderWidth: 1, borderRadius: radius.sm,
        opacity: disabled ? 0.4 : 1,
        backgroundColor: !disabled && (hovered as boolean) ? c.accent : 'transparent',
      } as ViewStyle)}
    >
      {leading}
      <Text style={{ color: c.mut, fontSize: 12, fontFamily }}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

// ─── EmptyState — two flavours (no tickets vs filters exclude everything) ─

function EmptyState({ onRaise, filtered, onClearFilters }: {
  onRaise: () => void;
  filtered?: boolean;
  onClearFilters?: () => void;
}) {
  const { c } = useTheme();
  if (filtered) {
    return (
      <View style={{ backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md, padding: 40, alignItems: 'center', gap: 8 }}>
        <View style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: c.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
          <IconSearch size={22} color={c.mut} />
        </View>
        <Text style={{ color: c.fg, fontSize: font.body, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
          No tickets match your filters
        </Text>
        <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, textAlign: 'center', maxWidth: 340 }}>
          Try removing a filter or clearing your search to see more tickets.
        </Text>
        {onClearFilters && (
          <Pressable
            onPress={onClearFilters}
            accessibilityLabel="Clear all filters"
            style={({ hovered }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingVertical: 6, paddingHorizontal: 12,
              borderColor: c.border, borderWidth: 1, borderRadius: radius.sm,
              backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
              marginTop: 8,
            } as ViewStyle)}
          >
            <IconClose size={12} color={c.mut} />
            <Text style={{ color: c.fg, fontSize: 12, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>Clear all filters</Text>
          </Pressable>
        )}
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md, padding: 40, alignItems: 'center', gap: 8 }}>
      <View style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: c.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <IconInbox size={22} color={c.mut} />
      </View>
      <Text style={{ color: c.red, fontSize: font.body, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>No tickets found</Text>
      <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, textAlign: 'center', maxWidth: 340 }}>
        Submit a new support{' '}
        <Text onPress={onRaise} style={{ color: c.red, textDecorationLine: 'underline', fontFamily }}>ticket</Text>
        , and we will be happy to assist.
      </Text>
    </View>
  );
}

// ─── ViewsSidebar — 10 canonical Zoho views + counts ────────────────────

function ViewsSidebar({
  activeView, counts, onPick,
}: {
  activeView: ViewKey;
  counts: Record<ViewKey, number>;
  onPick: (v: ViewKey) => void;
}) {
  const { c } = useTheme();
  const myViews = VIEWS.filter((v) => v.group === 'my');
  const ccViews = VIEWS.filter((v) => v.group === 'cc');
  return (
    <View style={{
      borderColor: c.border, borderWidth: 1, borderRadius: radius.lg,
      backgroundColor: c.card, overflow: 'hidden',
    }}>
      {/* Card header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
        borderBottomColor: c.border, borderBottomWidth: 1,
        backgroundColor: c.footerBg,
      }}>
        <IconFileText size={12} color={c.mut} />
        <Text style={{ color: c.mut, fontSize: 11, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          Views
        </Text>
      </View>
      {/* Groups */}
      <SidebarGroup label="My Tickets" />
      {myViews.map((v) => (
        <ViewLink key={v.key} v={v} active={activeView === v.key} count={counts[v.key]} onClick={() => onPick(v.key)} />
      ))}
      <SidebarGroup label="CC'd Tickets" />
      {ccViews.map((v) => (
        <ViewLink key={v.key} v={v} active={activeView === v.key} count={counts[v.key]} onClick={() => onPick(v.key)} />
      ))}
    </View>
  );
}

function SidebarGroup({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{
      paddingHorizontal: 12, paddingVertical: 6,
      backgroundColor: c.footerBg,
      borderBottomColor: c.border, borderBottomWidth: 1,
    }}>
      <Text style={{
        color: c.mut, fontSize: 11, fontWeight: weight.semibold as TextStyle['fontWeight'],
        letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
      }}>{label}</Text>
    </View>
  );
}

function ViewLink({
  v, active, count, onClick,
}: {
  v: ViewDef;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onClick}
      accessibilityRole="button"
      accessibilityLabel={`Filter: ${v.label} (${count})`}
      accessibilityState={{ selected: active }}
      style={({ hovered }) => ({
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, paddingVertical: 10, minHeight: 44,
        backgroundColor: active ? c.navActiveBg : (hovered as boolean) ? c.accent : 'transparent',
        borderBottomColor: c.border, borderBottomWidth: 1,
      } as ViewStyle)}
    >
      <Text
        numberOfLines={1}
        style={{
          color: active ? c.red : c.fg,
          fontSize: 14,
          fontWeight: (active ? weight.semibold : weight.regular) as TextStyle['fontWeight'],
          fontFamily,
          flex: 1, minWidth: 0,
        }}
      >
        {v.label}
      </Text>
      {count > 0 && (
        <View style={{
          marginLeft: 8,
          paddingHorizontal: 6, paddingVertical: 1,
          borderRadius: 4,
          backgroundColor: active ? withAlpha(c.redSolid, 0.15) : c.muted,
        }}>
          <Text style={{
            color: active ? c.red : c.mut,
            fontSize: 11, fontVariant: ['tabular-nums'], fontFamily,
          }}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Small helpers ──────────────────────────────────────────────────────

type StatusChipCfg = { label: string; tx: string; bg: string; border: string };
function statusChipFor(status: UserTicket['status'], c: any): StatusChipCfg {
  switch (status) {
    case 'open':    return { label: 'Open',    tx: c.bTx, bg: c.bBg, border: c.bBorder };
    case 'on-hold': return { label: 'On Hold', tx: c.yTx, bg: c.yBg, border: c.yTx };
    case 'closed':  return { label: 'Closed',  tx: c.gTx, bg: c.gBg, border: c.gTx };
  }
}

// Blend two hex colors — kept simple; falls back to `over` if inputs aren't
// pure hex (e.g. rgba tokens in dark mode).
function mixBg(over: string, under: string, ratio: number): string {
  if (!over.startsWith('#') || !under.startsWith('#')) return over;
  const a = hex(over), b = hex(under);
  if (!a || !b) return over;
  const mix = (x: number, y: number) => Math.round(x * (1 - ratio) + y * ratio);
  return '#' + [mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b)].map(toHex).join('');
}
function mixText(fg: string, mut: string, ratio: number): string {
  return mixBg(fg, mut, ratio);
}
function hex(v: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(v);
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}
function toHex(n: number) { return n.toString(16).padStart(2, '0'); }

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const a = hex(color);
    if (!a) return color;
    return `rgba(${a.r}, ${a.g}, ${a.b}, ${alpha})`;
  }
  return color;
}

function avatarBgHash(name: string): string {
  // Local import of AVATAR_COLORS avoided to keep the fn synchronous with model.
  const AVATAR_COLORS = [
    '#dc2626', '#f97316', '#eab308', '#059669', '#2563eb',
    '#9333ea', '#ec4899', '#0d9488', '#4f46e5', '#0891b2',
  ];
  const h = name.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

// Suppress unused-import lint until later tasks pick these up.
export const __UNUSED = { Channel: null as null | Channel, Department: null as null | Department, SortKey: null as null | SortKey, SORT_LABELS };
