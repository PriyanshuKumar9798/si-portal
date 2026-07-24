// SI list — the app's landing page. Pixel-parity port of the approved Claude
// Design output (SiListFrame.dc.html): PageHeader, filter pill row, 3-metric
// headline strip, SectionCard with active-filter chip strip, table with
// sticky Store column, Delete action on drafts only, insight footer.
//
// All four states (data / loading / empty / error) render inside the same
// SectionCard so the surrounding chrome (filters, chips, header) is always
// visible.

import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform, type TextStyle, type ViewStyle } from 'react-native';

// Web-only sticky-header style. On native, `position: 'sticky'` isn't a
// valid RN value, so this returns null and the header just scrolls with
// the page. Every table on this screen (SI list, Detail lines, Exceptions,
// Discrepancies) uses this identical pattern.
const stickyHeader = (): ViewStyle | null =>
  Platform.OS === 'web'
    ? { position: 'sticky' as ViewStyle['position'], top: 0, zIndex: 2 }
    : null;
import { useOutsideClick } from '../../../src/hooks/useOutsideClick';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme/ThemeContext';
import { api } from '../../../src/api/client';
import type { SiSummary, SiStatus } from '../../../src/api/types';
import { Body, Button, ErrorState, EmptyState, LoadingState, MetricCard, PageHeader, Screen, SectionCard, Segment, StatusChip, MetaChip, FilterChip } from '../../../src/components/ui';
import { MultiSelectPill } from '../../../src/components/MultiSelectPill';
import { IconTrash, IconCalendar, IconChevronDown, IconChevronUp, IconPlus, IconBulb, IconUser, IconClock, IconLock, IconAlert } from '../../../src/components/icons';
import { HelpPopover } from '../../../src/components/HelpPopover';
import { Calendar } from '../../../src/components/Calendar';
import { useToast } from '../../../src/components/Toast';
import { ConfirmDialog } from '../../../src/components/ConfirmDialog';
import { font, radius, space, weight, fontFamily } from '../../../src/theme/tokens';
import { refreshedAt, shortDayYear, todayIso } from '../../../src/utils/format';

export default function SiListScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  // Pick up ?runDate=<iso> from the URL so the Generate flow can hand off
  // to the list already scoped to the date it just generated for. Falls
  // back to today if the param is missing (normal daily-review flow).
  const params = useLocalSearchParams<{ runDate?: string }>();
  const [runDate, setRunDate] = useState<string>(
    (typeof params.runDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.runDate))
      ? params.runDate
      : todayIso(),
  );
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [status, setStatus] = useState<SiStatus | 'all'>('all');
  const [confirmDelete, setConfirmDelete] = useState<SiSummary | null>(null);

  const storesQ = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.listStores(),
  });

  const listQ = useQuery({
    queryKey: ['sis', { runDate, storeIds, status }],
    queryFn: () => api.listSis({ runDate, storeIds: storeIds.length ? storeIds : undefined, status }),
    // Keep the previous data visible while a filter switch refetches, so the
    // metric strip + table don't flash em-dash / empty state for 200ms every
    // time the user changes a pill.
    placeholderData: (prev) => prev,
  });

  const toast = useToast();
  const deleteMut = useMutation({
    mutationFn: (row: SiSummary) => api.deleteSi(row.id).then(() => row),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['sis'] });
      toast.show(`Draft SI for ${row.store.name} deleted.`, { tone: 'success' });
    },
    onError: (e: unknown) => {
      const msg = (e as { message?: string })?.message || 'Delete failed. Try again.';
      toast.show(msg, { tone: 'error' });
    },
  });

  const rows = listQ.data ?? [];
  const totals = useMemo(() => {
    const drafts = rows.filter((r) => r.status === 'draft').length;
    const locked = rows.filter((r) => r.status === 'locked').length;
    return { total: rows.length, drafts, locked };
  }, [rows]);

  const excCount = rows.reduce((n, r) => n + (r.exceptionCount > 0 ? 1 : 0), 0);
  const flaggedNames = rows
    .filter((r) => r.exceptionCount > 0)
    .slice(0, 3)
    .map((r) => r.store.name);
  const insight =
    totals.drafts === 0
      ? `All drafts for ${shortDayYear(runDate)} are already locked or none exist.`
      : excCount === 0
      ? `${totals.drafts} draft SIs waiting on review. None have exceptions flagged.`
      : `${totals.drafts} draft SIs waiting on review. Start with the ${excCount} flagged with exceptions${flaggedNames.length ? ` (${flaggedNames.join(', ')})` : ''}.`;

  return (
    <Screen>
      <PageHeader
        title="Suggestive Indents"
        subtitle={`Updated daily · last refreshed ${refreshedAt(new Date().toISOString())}`}
      />

      {/* Filter pill row — zIndex > below-siblings so open popovers overlay the KPIs. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', zIndex: 30, position: 'relative' }}>
        <RunDatePill value={runDate} onChange={setRunDate} />
        <MultiSelectPill
          label="Stores"
          selected={storeIds}
          onChange={setStoreIds}
          options={(storesQ.data ?? []).map((s) => ({
            value: s.id,
            label: s.name,
            sublabel: `${s.code} · ${s.warehouse}`,
          }))}
          placeholderAll="All stores"
        />
        <Segment
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all',    label: 'All' },
            { value: 'draft',  label: 'Draft' },
            { value: 'locked', label: 'Locked' },
          ]}
        />
      </View>

      {/* 3-metric headline strip — icon + hero number + one-line context.
          The label already says "drafts" and "locked", so the old status
          chips beside the number were redundant. Ratios ("5 of 8") give
          proportion at a glance, which a raw count can't. */}
      <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
        <MetricCard
          label="Total SIs"
          value={listQ.isLoading ? '–' : totals.total}
          hint={shortDayYear(runDate)}
          icon={<IconCalendar size={18} color={c.sTx} />}
          iconTone="neutral"
        />
        <MetricCard
          label="Awaiting your review"
          value={listQ.isLoading ? '–' : totals.drafts}
          hint={totals.total > 0 ? `${totals.drafts} of ${totals.total} today` : 'None yet'}
          icon={<IconAlert size={18} color={c.yTx} />}
          iconTone="draft"
        />
        <MetricCard
          label="Locked & final"
          value={listQ.isLoading ? '–' : totals.locked}
          hint={totals.total > 0 ? `${totals.locked} of ${totals.total} today` : 'None yet'}
          icon={<IconLock size={18} color={c.gTx} />}
          iconTone="locked"
        />
      </View>

      <SectionCard
        title="Today's SIs"
        subtitle="Draft indents are editable and can be regenerated · locked indents are final"
        filterChips={
          <>
            <FilterChip label={`Run date: ${shortDayYear(runDate)}`} onClear={() => setRunDate(todayIso())} />
            {status !== 'all' && (
              <FilterChip label={`Status: ${status === 'draft' ? 'Draft' : 'Locked'}`} onClear={() => setStatus('all')} />
            )}
            {storeIds.length > 0 && (
              <FilterChip
                label={`${storeIds.length === 1 ? 'Store' : 'Stores'}: ${
                  storeIds
                    .map((id) => (storesQ.data ?? []).find((s) => s.id === id)?.name ?? id)
                    .join(', ')
                }`}
                onClear={() => setStoreIds([])}
              />
            )}
          </>
        }
        action={
          <Button
            label="Generate SIs"
            leading={<IconPlus size={15} color="#fff" />}
            tooltip="Create fresh draft SIs for one or more of your stores now, without waiting for the 9 pm run."
            onPress={() => router.push('/sis/generate')}
          />
        }
        contentPadding={false}
      >
        {listQ.isLoading ? (
          <SkeletonRows count={6} />
        ) : listQ.isError ? (
          <ErrorState
            title="Couldn't load SIs"
            body="The request timed out reaching the indent service. Your session is still active. Try again in a moment."
            onRetry={() => listQ.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={`No indents for ${shortDayYear(runDate)}`}
            body="The daily engine runs at 9 pm. Anything for tomorrow appears here overnight. You can also generate drafts manually for your assigned stores right now."
            cta={<Button label="Generate SIs" onPress={() => router.push('/sis/generate')} />}
          />
        ) : (
          <>
            <SiTable rows={rows} onOpen={(id) => router.push(`/sis/${id}` as never)} onDelete={setConfirmDelete} />
            {/* Insight footer */}
            <View style={{
              padding: 14, borderTopWidth: 1, borderTopColor: c.border,
              backgroundColor: c.footerBg, flexDirection: 'row', gap: 8, alignItems: 'center',
            }}>
              <IconBulb size={15} color={c.yTx} />
              <Text style={{ color: c.mut, fontSize: font.small, fontFamily }}>{insight}</Text>
            </View>
          </>
        )}
      </SectionCard>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete draft for ${confirmDelete.store.name}?`}
          body={`This SI can be regenerated later. Any edits you saved to line quantities will be lost.`}
          confirmLabel="Delete draft"
          onConfirm={async () => {
            await deleteMut.mutateAsync(confirmDelete);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteMut.isPending}
        />
      )}

      <HelpPopover
        title="Suggestive Indents"
        sections={[
          {
            heading: 'What this page shows',
            body: 'All the day\'s indents for your stores. Drafts you can still edit are listed first. Locked indents are final and read-only.',
          },
          {
            heading: 'Origin: Auto vs Manual',
            body: 'Auto rows come from the nightly engine that runs at 9 pm. Manual rows are ones you or the ops team generated by hand.',
          },
          {
            heading: 'Your daily flow',
            numbered: true,
            body: [
              'Pick the date at the top (Today by default).',
              'Open each Draft row.',
              'Adjust line quantities and Save all.',
              'Lock the SI when you\'re happy with it.',
            ],
          },
          {
            heading: 'Nothing showing?',
            body: 'The engine runs overnight. If the list is empty, tap Generate SIs to create drafts for your stores right now.',
          },
        ]}
      />
    </Screen>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SiTable({
  rows, onOpen, onDelete,
}: { rows: SiSummary[]; onOpen: (id: string) => void; onDelete: (r: SiSummary) => void }) {
  const { c } = useTheme();
  const th: TextStyle = {
    color: c.mut, fontSize: font.micro,
    fontWeight: weight.semibold as TextStyle['fontWeight'],
    textTransform: 'uppercase', letterSpacing: 0.6, fontFamily,
  };
  return (
    // Horizontal ScrollView default-shrinks to its content width — so the
    // inner rows never learn the card is wider than 760px. Force it to fill
    // via `style: width 100%` and use `contentContainerStyle: minWidth` for
    // the mobile-scroll floor.
    <ScrollView
      horizontal
      style={{ width: '100%' }}
      contentContainerStyle={{ minWidth: 760, width: '100%' }}
    >
      <View style={{ minWidth: 760, width: '100%' }}>
        {/* header — Store gets `flex: 1` so the row spans the SectionCard end-to-end
            instead of stopping at the sum of the fixed column widths. Every other
            column is fixed-width so numeric columns stay aligned across rows. */}
        <View style={{
          flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
          borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card,
          ...stickyHeader(),
        }}>
          <Text style={[th, { flex: 1, minWidth: 220 }]}>Store</Text>
          <Text style={[th, { width: 90 }]}>Run date</Text>
          <Text style={[th, { width: 90 }]}>Origin</Text>
          <Text style={[th, { width: 120 }]}>Trigger</Text>
          <Text style={[th, { width: 100 }]}>Status</Text>
          <Text style={[th, { width: 110 }]}>Exceptions</Text>
          <Text style={[th, { width: 90, textAlign: 'right' }]}>Lead time</Text>
          <Text style={[th, { width: 60 }]}></Text>
        </View>

        {rows.map((r) => (
          <SiRow key={r.id} row={r} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </View>
    </ScrollView>
  );
}

function RunDatePill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<any>(null);
  useOutsideClick(wrapperRef, open, () => setOpen(false));
  return (
    <View ref={wrapperRef} style={{ position: 'relative', zIndex: open ? 40 : 1 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          borderWidth: 1, borderColor: c.border, backgroundColor: c.card,
          borderRadius: radius.md, paddingVertical: 7, paddingHorizontal: 12,
        }}
        accessibilityLabel={`Run date, ${shortDayYear(value)}`}
      >
        <IconCalendar size={14} color={c.mut} />
        <Text style={{ color: c.fg, fontSize: font.body, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
          {shortDayYear(value)}
        </Text>
        {open ? <IconChevronUp size={12} color={c.mut} /> : <IconChevronDown size={12} color={c.mut} />}
      </Pressable>
      {open && (
        <View
          style={{
            position: 'absolute',
            top: 40,                 // trigger height (34px) + 6px gap
            left: 0,
            backgroundColor: c.card,
            borderWidth: 1, borderColor: c.border,
            borderRadius: radius.md,
            zIndex: 100, elevation: 8,
            shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 },
          }}
        >
          <Calendar
            value={value}
            onChange={(iso) => { onChange(iso); setOpen(false); }}
          />
        </View>
      )}
    </View>
  );
}

// ConfirmDialog moved to src/components/ConfirmDialog.tsx so components
// outside this route can consume it without a circular import. Re-exported
// from here for existing call sites that already imported from './index'.
export { ConfirmDialog } from '../../../src/components/ConfirmDialog';

// ─── SiRow — one table row with hover-driven chevron affordance ───────────
function SiRow({
  row, onOpen, onDelete,
}: { row: SiSummary; onOpen: (id: string) => void; onDelete: (r: SiSummary) => void }) {
  const { c } = useTheme();
  // Freshness — rows created in the last 90 seconds get a subtle tint + a
  // "Just now" pill so the user can spot "which one did I just make?"
  // right after landing on the list from Generate. Computed at render;
  // natural re-renders (hover, filter change, refetch) update it.
  const ageMs = Date.now() - new Date(row.createdAt).getTime();
  const isFresh = ageMs < 90_000 && ageMs >= 0;
  const isManual = row.origin === 'manual';
  return (
    <Pressable
      onPress={() => onOpen(row.id)}
      style={({ hovered }) => ({
        flexDirection: 'row',
        paddingHorizontal: 16, paddingVertical: 11,
        borderBottomWidth: 1, borderBottomColor: c.border,
        // Fresh rows tint YELLOW (Draft-family colour) so the eye lands on
        // them first. Hover on top of that stays subtle — accent overlay
        // reads through the tint without clashing.
        backgroundColor: isFresh ? c.yBg : (hovered as boolean) ? c.accent : c.card,
        alignItems: 'center',
      })}
    >
      {({ hovered }) => (
        <>
          {/* Store — flex:1 so the row spans end-to-end. Store name stays in
              foreground colour on hover (turning it red clashed with the
              nearby "N issues" red text and read as an error). The row bg
              lift + hover chevron on the right already convey "clickable". */}
          <View style={{ flex: 1, minWidth: 220 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text
                style={{
                  color: c.fg,
                  fontWeight: weight.semibold as TextStyle['fontWeight'],
                  fontSize: font.body, fontFamily,
                }}
                numberOfLines={1}
              >
                {row.store.name}
              </Text>
              {isFresh && (
                <View style={{
                  backgroundColor: c.yBg, borderRadius: radius.pill,
                  paddingHorizontal: 8, paddingVertical: 2,
                  borderWidth: 1, borderColor: c.yTx,
                }}>
                  <Text style={{ color: c.yTx, fontSize: font.caption, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
                    Just now
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ color: c.mut, fontSize: font.caption, marginTop: 1, fontFamily }} numberOfLines={1}>
              {row.store.code} · {row.store.warehouse}
            </Text>
          </View>
          <Text style={{ width: 90, color: c.fg, fontSize: font.body, fontFamily }}>{fmtDate(row.runDate)}</Text>
          {/* Origin — icon + colour differentiated so Manual/Auto reads at a
              glance (GitHub Actions pattern). Manual = person icon in brand
              red (a human made this); Auto = clock icon in slate (cron). */}
          <View style={{ width: 90 }}>
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: isManual ? c.navActiveBg : c.sBg,
              borderRadius: radius.pill,
              paddingVertical: 3, paddingHorizontal: 8,
              flexDirection: 'row', alignItems: 'center', gap: 4,
            }}>
              {isManual
                ? <IconUser size={12} color={c.red} />
                : <IconClock size={12} color={c.sTx} />}
              <Text style={{
                color: isManual ? c.red : c.sTx,
                fontSize: font.caption,
                fontWeight: weight.semibold as TextStyle['fontWeight'],
                fontFamily,
              }}>
                {isManual ? 'Manual' : 'Auto'}
              </Text>
            </View>
          </View>
          <Text style={{ width: 120, color: c.mut, fontSize: font.body, fontFamily }}>{fmtTrigger(row.trigger)}</Text>
          <View style={{ width: 100 }}>
            <StatusChip tone={row.status === 'locked' ? 'locked' : 'draft'} />
          </View>
          <View style={{ width: 110 }}>
            <Text style={{
              fontWeight: weight.semibold as TextStyle['fontWeight'],
              fontSize: font.body,
              color: row.exceptionCount > 0 ? c.rTx : c.sTx,
              fontFamily, fontVariant: ['tabular-nums'],
            }}>
              {row.exceptionCount > 0 ? `${row.exceptionCount} ${row.exceptionCount === 1 ? 'issue' : 'issues'}` : '–'}
            </Text>
          </View>
          <Text style={{ width: 90, textAlign: 'right', color: c.fg, fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'] }}>
            {row.leadTimeDays} {row.leadTimeDays === 1 ? 'day' : 'days'}
          </Text>
          <View style={{ width: 60, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}>
            {row.status === 'draft' && (
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); onDelete(row); }}
                accessibilityRole="button"
                accessibilityLabel={`Delete draft SI for ${row.store.name}`}
                style={({ hovered: hoverBtn }) => ({
                  width: 30, height: 30, borderRadius: radius.sm,
                  borderWidth: 1,
                  borderColor: (hoverBtn as boolean) ? c.chipRedBorder : c.border,
                  alignItems: 'center', justifyContent: 'center',
                })}
              >
                <IconTrash size={14} color={c.mut} />
              </Pressable>
            )}
          </View>
        </>
      )}
    </Pressable>
  );
}

// ─── SkeletonRows — pulse-placeholder rows shown while the list loads.
// Matches the real row shape so users perceive the layout before data lands
// (Vercel-style perceived-speed win vs a lone spinner). ────────────────
function SkeletonRows({ count = 6 }: { count?: number }) {
  const { c } = useTheme();
  const rowStyle = {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: c.border,
    backgroundColor: c.card,
    gap: 12,
  };
  const bar = (w: number, h = 12) => ({ width: w, height: h, borderRadius: 4, backgroundColor: c.muted, opacity: 0.6 });
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={rowStyle}>
          <View style={{ flex: 1, minWidth: 220, gap: 6 }}>
            <View style={bar(160)} />
            <View style={bar(110, 9)} />
          </View>
          <View style={{ width: 90 }}><View style={bar(50)} /></View>
          <View style={{ width: 90 }}><View style={bar(58, 18)} /></View>
          <View style={{ width: 120 }}><View style={bar(80)} /></View>
          <View style={{ width: 100 }}><View style={bar(58, 18)} /></View>
          <View style={{ width: 110 }}><View style={bar(60)} /></View>
          <View style={{ width: 90 }}><View style={bar(46)} /></View>
          <View style={{ width: 60 }} />
        </View>
      ))}
    </View>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
}
function fmtTrigger(t: string): string {
  // Match the design's casing verbatim — Sentence case only on the first
  // word ("Catch-up", "Daily cron", "Admin backfill"), not Title Case per
  // word. Design HTML uses lowercase after the first letter.
  const spaced = t.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
