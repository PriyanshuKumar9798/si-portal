// SI list — the app's landing page. Pixel-parity port of the approved Claude
// Design output (SiListFrame.dc.html): PageHeader, filter pill row, 3-metric
// headline strip, SectionCard with active-filter chip strip, table with
// sticky Store column, Delete action on drafts only, insight footer.
//
// All four states (data / loading / empty / error) render inside the same
// SectionCard so the surrounding chrome (filters, chips, header) is always
// visible.

import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, type TextStyle } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme/ThemeContext';
import { api } from '../../../src/api/client';
import type { SiSummary, SiStatus } from '../../../src/api/types';
import { Body, Button, ErrorState, EmptyState, LoadingState, MetricCard, PageHeader, Screen, SectionCard, Segment, StatusChip, MetaChip, FilterChip } from '../../../src/components/ui';
import { MultiSelectPill } from '../../../src/components/MultiSelectPill';
import { font, radius, space, weight, fontFamily } from '../../../src/theme/tokens';
import { refreshedAt, shortDayYear, todayIso } from '../../../src/utils/format';

export default function SiListScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const [runDate, setRunDate] = useState<string>(todayIso());
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
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteSi(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sis'] }),
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
      ? `${totals.drafts} draft SIs waiting on review — none have exceptions flagged.`
      : `${totals.drafts} draft SIs waiting on review — start with the ${excCount} flagged with exceptions${flaggedNames.length ? ` (${flaggedNames.join(', ')})` : ''}.`;

  return (
    <Screen>
      <PageHeader
        title="Suggestive Indents"
        subtitle={`Updated daily · last refreshed ${refreshedAt(new Date().toISOString())}`}
      />

      {/* Filter pill row */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
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

      {/* 3-metric headline strip */}
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <MetricCard label={`Total SIs · ${shortDayYear(runDate)}`} value={listQ.isLoading ? '—' : totals.total} />
        <MetricCard label="Drafts awaiting review" value={listQ.isLoading ? '—' : totals.drafts}
          valueSuffix={totals.drafts > 0 ? <StatusChip tone="draft" /> : null} />
        <MetricCard label="Locked today" value={listQ.isLoading ? '—' : totals.locked}
          valueSuffix={totals.locked > 0 ? <StatusChip tone="locked" /> : null} />
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
              <FilterChip label={`Stores: ${storeIds.length} selected`} onClear={() => setStoreIds([])} />
            )}
          </>
        }
        action={
          <Button
            label="Generate SIs"
            leading={<Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>+</Text>}
            onPress={() => router.push('/sis/generate')}
          />
        }
        contentPadding={false}
      >
        {listQ.isLoading ? (
          <LoadingState label={`Loading SIs for ${shortDayYear(runDate)}…`} />
        ) : listQ.isError ? (
          <ErrorState
            title="Couldn't load SIs"
            body="The request timed out reaching the indent service. Your session is still active — try again in a moment."
            onRetry={() => listQ.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={`No SIs for ${shortDayYear(runDate)}`}
            body="Nothing has been generated for this date yet. Generate drafts for your assigned stores to get started."
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
              <Text style={{ color: c.yTx, fontSize: 15 }}>💡</Text>
              <Text style={{ color: c.mut, fontSize: font.small, fontFamily }}>{insight}</Text>
            </View>
          </>
        )}
      </SectionCard>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete draft for ${confirmDelete.store.name}?`}
          body={`This SI can be regenerated later, but any edits you've saved to line quantities will be lost.`}
          confirmLabel="Delete draft"
          onConfirm={async () => {
            await deleteMut.mutateAsync(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteMut.isPending}
        />
      )}
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
    <ScrollView horizontal>
      <View style={{ minWidth: 760, width: '100%' }}>
        {/* header */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card }}>
          <Text style={[th, { width: 220 }]}>Store</Text>
          <Text style={[th, { width: 90 }]}>Run date</Text>
          <Text style={[th, { width: 90 }]}>Origin</Text>
          <Text style={[th, { width: 120 }]}>Trigger</Text>
          <Text style={[th, { width: 100 }]}>Status</Text>
          <Text style={[th, { width: 110 }]}>Exceptions</Text>
          <Text style={[th, { width: 90, textAlign: 'right' }]}>Lead time</Text>
          <Text style={[th, { width: 60 }]}></Text>
        </View>

        {rows.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => onOpen(r.id)}
            style={({ hovered }) => ({
              flexDirection: 'row',
              paddingHorizontal: 16, paddingVertical: 11,
              borderBottomWidth: 1, borderBottomColor: c.border,
              backgroundColor: (hovered as boolean) ? c.accent : c.card,
              alignItems: 'center',
            })}
          >
            {/* Store */}
            <View style={{ width: 220 }}>
              <Text style={{ color: c.fg, fontWeight: weight.semibold as TextStyle['fontWeight'], fontSize: font.body, fontFamily }} numberOfLines={1}>
                {r.store.name}
              </Text>
              <Text style={{ color: c.mut, fontSize: font.caption, marginTop: 1, fontFamily }} numberOfLines={1}>
                {r.store.code} · {r.store.warehouse}
              </Text>
            </View>
            <Text style={{ width: 90, color: c.fg, fontSize: font.body, fontFamily }}>{fmtDate(r.runDate)}</Text>
            <View style={{ width: 90 }}><MetaChip label={r.origin === 'manual' ? 'Manual' : 'Auto'} /></View>
            <Text style={{ width: 120, color: c.mut, fontSize: font.body, fontFamily }}>{fmtTrigger(r.trigger)}</Text>
            <View style={{ width: 100 }}>
              <StatusChip tone={r.status === 'locked' ? 'locked' : 'draft'} />
            </View>
            <View style={{ width: 110 }}>
              <Text style={{
                fontWeight: weight.semibold as TextStyle['fontWeight'],
                fontSize: font.body,
                color: r.exceptionCount > 0 ? c.rTx : c.sTx,
                fontFamily, fontVariant: ['tabular-nums'],
              }}>
                {r.exceptionCount > 0 ? `${r.exceptionCount} ${r.exceptionCount === 1 ? 'issue' : 'issues'}` : '—'}
              </Text>
            </View>
            <Text style={{ width: 90, textAlign: 'right', color: c.fg, fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'] }}>
              {r.leadTimeDays} {r.leadTimeDays === 1 ? 'day' : 'days'}
            </Text>
            <View style={{ width: 60, alignItems: 'flex-end' }}>
              {r.status === 'draft' && (
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); onDelete(r); }}
                  accessibilityLabel="Delete draft SI"
                  style={{
                    width: 30, height: 30, borderRadius: radius.sm,
                    borderWidth: 1, borderColor: c.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: c.mut, fontSize: 14 }}>🗑</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function RunDatePill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const presets = [-2, -1, 0, 1].map((n) => ({ iso: todayIso(n), label: n === 0 ? 'Today' : n === -1 ? 'Yesterday' : shortDayYear(todayIso(n)) }));
  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          borderWidth: 1, borderColor: c.border, backgroundColor: c.card,
          borderRadius: radius.md, paddingVertical: 7, paddingHorizontal: 12,
        }}
      >
        <Text style={{ color: c.mut, fontSize: 14 }}>📅</Text>
        <Text style={{ color: c.fg, fontSize: font.body, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
          {shortDayYear(value)}
        </Text>
      </Pressable>
      {open && (
        <View style={{
          position: 'absolute', top: '110%' as unknown as number, left: 0,
          minWidth: 220, backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
          borderRadius: radius.md, padding: 6, gap: 2, zIndex: 100,
        }}>
          {presets.map((p) => (
            <Pressable
              key={p.iso}
              onPress={() => { onChange(p.iso); setOpen(false); }}
              style={({ hovered }) => ({
                paddingVertical: 7, paddingHorizontal: 10, borderRadius: radius.sm,
                backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
              })}
            >
              <Text style={{ color: c.fg, fontSize: font.body, fontFamily }}>{p.label}</Text>
              <Text style={{ color: c.mut, fontSize: font.caption, fontFamily }}>{p.iso}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function ConfirmDialog({
  title, body, confirmLabel, onConfirm, onCancel, loading, tone = 'danger',
}: {
  title: string; body: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean; tone?: 'danger' | 'primary';
}) {
  const { c } = useTheme();
  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      padding: 24,
    }}>
      <View style={{
        width: '100%', maxWidth: 420,
        backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
        borderRadius: radius.lg, padding: 20,
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
}

export { ConfirmDialog };

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
}
function fmtTrigger(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
