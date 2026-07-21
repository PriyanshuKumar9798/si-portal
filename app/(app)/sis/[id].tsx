// SI Detail — the core operating screen. Handles both variants (draft +
// locked) in a single render tree, keyed off `data.status`. Edits are staged
// locally in a `pendingEdits` map so "Save all" is one round-trip. Locking
// is a confirm dialog; deletion is a separate confirm dialog with red CTA.

import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, type TextStyle, type ViewStyle } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme/ThemeContext';
import { api } from '../../../src/api/client';
import type { SiDetail, SiException, ExceptionType } from '../../../src/api/types';
import { Body, Button, ErrorState, LoadingState, PageHeader, Screen, SectionCard, StatusChip, MetaChip, MicroLabel } from '../../../src/components/ui';
import { font, radius, weight, fontFamily, space } from '../../../src/theme/tokens';
import { shortDayYear } from '../../../src/utils/format';
import { buildCsv, downloadCsv } from '../../../src/utils/csv';
import { ConfirmDialog } from './index';

export default function SiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const [pending, setPending] = useState<Record<string, number | null>>({});
  const [confirmLock, setConfirmLock] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const q = useQuery({
    queryKey: ['si', id],
    queryFn: () => api.getSi(id!),
    enabled: !!id,
  });

  const saveMut = useMutation({
    mutationFn: () => api.saveLines(id!, {
      edits: Object.entries(pending).map(([lineId, editedQty]) => ({ lineId, editedQty })),
    }),
    onSuccess: (fresh) => {
      qc.setQueryData(['si', id], fresh);
      qc.invalidateQueries({ queryKey: ['sis'] });
      setPending({});
    },
  });

  const lockMut = useMutation({
    mutationFn: () => api.lockSi(id!),
    onSuccess: (fresh) => {
      qc.setQueryData(['si', id], fresh);
      qc.invalidateQueries({ queryKey: ['sis'] });
      setConfirmLock(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => api.deleteSi(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sis'] });
      router.push('/sis');
    },
  });

  if (q.isLoading) {
    return (
      <Screen>
        <PageHeader title="SI detail" subtitle="Loading…" />
        <SectionCard title=" " contentPadding={false}><LoadingState /></SectionCard>
      </Screen>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Screen>
        <PageHeader title="SI detail" />
        <SectionCard title="Couldn't load this SI" contentPadding={false}>
          <ErrorState onRetry={() => q.refetch()} body="The request failed or this SI is no longer available." />
        </SectionCard>
      </Screen>
    );
  }

  const data: SiDetail = q.data;
  const editing = data.status === 'draft';
  const dirtyCount = Object.keys(pending).length;

  return (
    <Screen>
      {/* Header + action cluster */}
      <PageHeader
        title={data.store.name}
        subtitle={`${data.store.code} · ${data.store.warehouse}`}
        action={
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              label="Export SI"
              variant="secondary"
              onPress={() => exportSi(data)}
            />
            <Button
              label="Export exceptions"
              variant="secondary"
              onPress={() => exportExceptions(data.exceptions, data.store.code)}
              disabled={data.exceptions.length === 0}
            />
            {editing && (
              <>
                <Button
                  label={saveMut.isPending ? 'Saving…' : `Save all${dirtyCount ? ` (${dirtyCount})` : ''}`}
                  variant={dirtyCount ? 'primary' : 'secondary'}
                  onPress={() => saveMut.mutate()}
                  disabled={dirtyCount === 0 || saveMut.isPending}
                  loading={saveMut.isPending}
                />
                <Button label="Delete draft" variant="danger" onPress={() => setConfirmDelete(true)} />
                <Button label="Lock SI" variant="primary" onPress={() => setConfirmLock(true)} />
              </>
            )}
          </View>
        }
      />

      {/* Meta strip */}
      <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
        <MetaTile label="Status" value={<StatusChip tone={editing ? 'draft' : 'locked'} />} />
        <MetaTile label="Run date" value={<Body wt="semibold">{shortDayYear(data.runDate)}</Body>} />
        <MetaTile label="Origin" value={<MetaChip label={data.origin === 'manual' ? 'Manual' : 'Auto'} />} />
        <MetaTile label="Trigger" value={<Body wt="medium">{data.trigger.replace(/_/g, ' ')}</Body>} />
        <MetaTile label="Buffer" value={<Body wt="semibold" numeric>{data.bufferDays}d</Body>} />
        <MetaTile label="Lead time" value={<Body wt="semibold" numeric>{data.leadTimeDays}d</Body>} />
        <MetaTile label="Delivery" value={<Body wt="semibold">{shortDayYear(data.deliveryDate)}</Body>} />
      </View>

      {/* Lines table */}
      <SectionCard
        title="Order lines"
        subtitle={editing
          ? `Edit case quantities inline — nothing is saved until you tap "Save all".`
          : `Read-only — this SI is locked. Regenerate to make changes.`}
        contentPadding={false}
      >
        <LinesTable
          data={data}
          pending={pending}
          setQty={(lineId, val) => setPending((p) => ({ ...p, [lineId]: val }))}
          resetLine={(lineId) => setPending((p) => { const n = { ...p }; delete n[lineId]; return n; })}
          editable={editing}
        />
      </SectionCard>

      {/* Exceptions panel */}
      {data.exceptions.length > 0 && (
        <SectionCard
          title={`Exceptions for this SI (${data.exceptions.length})`}
          subtitle="Data issues that stopped the engine from computing a quantity."
          contentPadding={false}
        >
          <ExceptionsPanel exceptions={data.exceptions} />
        </SectionCard>
      )}

      {/* Dialogs */}
      {confirmLock && (
        <ConfirmDialog
          title={`Lock SI for ${data.store.name}, ${shortDayYear(data.runDate)}?`}
          body="Locking finalises the SI — quantities become read-only and the draft cannot be deleted. Nothing is auto-posted to Rista in v1; you'll still submit the indent manually."
          confirmLabel="Lock SI"
          onConfirm={() => lockMut.mutate()}
          onCancel={() => setConfirmLock(false)}
          loading={lockMut.isPending}
          tone="primary"
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete draft for ${data.store.name}?`}
          body="This will remove the draft SI. Any local edits will be lost. You can regenerate later."
          confirmLabel="Delete draft"
          onConfirm={() => deleteMut.mutate()}
          onCancel={() => setConfirmDelete(false)}
          loading={deleteMut.isPending}
        />
      )}
    </Screen>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function MetaTile({ label, value }: { label: string; value: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{
      minWidth: 120, flex: 1,
      borderWidth: 1, borderColor: c.border, borderRadius: radius.md,
      backgroundColor: c.card, padding: 12, gap: 6,
    }}>
      <MicroLabel>{label}</MicroLabel>
      {typeof value === 'string' ? <Body wt="semibold">{value}</Body> : value}
    </View>
  );
}

function LinesTable({
  data, pending, setQty, resetLine, editable,
}: {
  data: SiDetail;
  pending: Record<string, number | null>;
  setQty: (lineId: string, v: number | null) => void;
  resetLine: (lineId: string) => void;
  editable: boolean;
}) {
  const { c } = useTheme();
  const th: TextStyle = {
    color: c.mut, fontSize: font.micro,
    fontWeight: weight.semibold as TextStyle['fontWeight'],
    textTransform: 'uppercase', letterSpacing: 0.6, fontFamily,
  };

  const excSkus = useMemo(() => new Set(data.exceptions.map((e) => e.sku)), [data.exceptions]);

  return (
    <ScrollView horizontal>
      <View style={{ minWidth: 900 }}>
        <View style={{
          flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
          borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card,
        }}>
          <Text style={[th, { width: 110 }]}>SKU</Text>
          <Text style={[th, { width: 260 }]}>Item</Text>
          <Text style={[th, { width: 140 }]}>Category</Text>
          <Text style={[th, { width: 100, textAlign: 'right' }]}>Suggested</Text>
          <Text style={[th, { width: 120, textAlign: 'right' }]}>Edited</Text>
          <Text style={[th, { width: 100, textAlign: 'right' }]}>Final</Text>
          <Text style={[th, { width: 90 }]}>Flags</Text>
        </View>
        {data.lines.map((l) => {
          const pendingVal = pending[l.id];
          const hasPending = Object.prototype.hasOwnProperty.call(pending, l.id);
          const effectiveEdited = hasPending ? pendingVal : l.editedQty;
          const effectiveFinal = effectiveEdited ?? l.suggestedQty;
          const hasExc = excSkus.has(l.sku);
          return (
            <View key={l.id} style={{
              flexDirection: 'row',
              paddingHorizontal: 16, paddingVertical: 11,
              borderBottomWidth: 1, borderBottomColor: c.border,
              backgroundColor: hasPending ? c.yBg : c.card,
              alignItems: 'center',
            }}>
              <Text style={{ width: 110, color: c.fg, fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'] }}>{l.sku}</Text>
              <View style={{ width: 260 }}>
                <Text style={{ color: c.fg, fontSize: font.body, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }} numberOfLines={1}>{l.itemName}</Text>
                {hasExc && <Text style={{ color: c.rTx, fontSize: font.caption, marginTop: 2, fontFamily }}>Has exception</Text>}
              </View>
              <Text style={{ width: 140, color: c.mut, fontSize: font.body, fontFamily }} numberOfLines={1}>{l.category}</Text>
              <Text style={{ width: 100, textAlign: 'right', color: c.mut, fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'] }}>
                {l.suggestedQty}
              </Text>
              <View style={{ width: 120, alignItems: 'flex-end' }}>
                {editable ? (
                  <TextInput
                    value={effectiveEdited === null || effectiveEdited === undefined ? '' : String(effectiveEdited)}
                    onChangeText={(v) => {
                      if (v.trim() === '') { setQty(l.id, null); return; }
                      const n = Number(v);
                      if (!Number.isFinite(n) || n < 0) return;
                      setQty(l.id, Math.round(n));
                    }}
                    onBlur={() => {
                      if (hasPending && pendingVal === l.editedQty) resetLine(l.id);
                    }}
                    placeholder="—"
                    placeholderTextColor={c.mut}
                    keyboardType="numeric"
                    style={{
                      minWidth: 72, textAlign: 'right',
                      borderWidth: 1, borderColor: hasPending ? c.yTx : c.border,
                      backgroundColor: c.bg, color: c.fg,
                      borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6,
                      fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'],
                    } as ViewStyle}
                  />
                ) : (
                  <Text style={{ color: c.fg, fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'] }}>
                    {l.editedQty ?? '—'}
                  </Text>
                )}
              </View>
              <Text style={{
                width: 100, textAlign: 'right',
                color: c.fg, fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'],
                fontWeight: weight.semibold as TextStyle['fontWeight'],
              }}>{effectiveFinal}</Text>
              <View style={{ width: 90, flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                {l.flags.bun && <FlagPill label="bun" />}
                {l.flags.trimmed && <FlagPill label="trimmed" />}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function FlagPill({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{
      backgroundColor: c.sBg, borderRadius: radius.pill,
      paddingHorizontal: 6, paddingVertical: 1,
    }}>
      <Text style={{ color: c.sTx, fontSize: font.caption, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
        {label}
      </Text>
    </View>
  );
}

function ExceptionsPanel({ exceptions }: { exceptions: SiException[] }) {
  const { c } = useTheme();
  const th: TextStyle = {
    color: c.mut, fontSize: font.micro,
    fontWeight: weight.semibold as TextStyle['fontWeight'],
    textTransform: 'uppercase', letterSpacing: 0.6, fontFamily,
  };
  return (
    <ScrollView horizontal>
      <View style={{ minWidth: 780 }}>
        <View style={{
          flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
          borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card,
        }}>
          <Text style={[th, { width: 180 }]}>Type</Text>
          <Text style={[th, { width: 110 }]}>SKU</Text>
          <Text style={[th, { width: 240 }]}>Item</Text>
          <Text style={[th, { flex: 1, minWidth: 240 }]}>Reason</Text>
        </View>
        {exceptions.map((e) => (
          <View key={e.id} style={{
            flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11,
            borderBottomWidth: 1, borderBottomColor: c.border,
          }}>
            <View style={{ width: 180 }}><ExceptionTypeChip type={e.type} /></View>
            <Text style={{ width: 110, color: c.fg, fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'] }}>{e.sku}</Text>
            <Text style={{ width: 240, color: c.fg, fontSize: font.body, fontFamily }} numberOfLines={1}>{e.itemName}</Text>
            <Text style={{ flex: 1, minWidth: 240, color: c.mut, fontSize: font.body, fontFamily }}>{e.reason}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function ExceptionTypeChip({ type }: { type: ExceptionType }) {
  const { c } = useTheme();
  const tone =
    type === 'NEEDS_ADC'          ? { tx: c.yTx, bg: c.yBg } :
    type === 'ADC_ZERO'           ? { tx: c.yTx, bg: c.yBg } :
    type === 'UNMAPPED'           ? { tx: c.rTx, bg: c.rBg } :
    type === 'FREEZER_OVERCAP'    ? { tx: c.rTx, bg: c.rBg } :
    /* MISSING_CONVERSION */        { tx: c.rTx, bg: c.rBg };
  return (
    <View style={{
      alignSelf: 'flex-start',
      backgroundColor: tone.bg, borderRadius: radius.pill,
      paddingVertical: 2, paddingHorizontal: 9,
    }}>
      <Text style={{ color: tone.tx, fontSize: font.caption, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
        {type}
      </Text>
    </View>
  );
}

// ─── CSV exports ────────────────────────────────────────────────────────────

function exportSi(data: SiDetail) {
  const csv = buildCsv<SiDetail['lines'][number]>([
    { header: 'SKU', get: (l) => l.sku },
    { header: 'Item', get: (l) => l.itemName },
    { header: 'Category', get: (l) => l.category },
    { header: 'Suggested cases', get: (l) => l.suggestedQty },
    { header: 'Edited cases', get: (l) => (l.editedQty ?? '') },
    { header: 'Final cases', get: (l) => l.finalQty },
    { header: 'Bun flag', get: (l) => (l.flags.bun ? 'yes' : '') },
    { header: 'Trimmed flag', get: (l) => (l.flags.trimmed ? 'yes' : '') },
  ], data.lines);
  downloadCsv(`SI_${data.store.code}_${data.runDate}.csv`, csv);
}

function exportExceptions(exceptions: SiException[], storeCode: string) {
  const csv = buildCsv<SiException>([
    { header: 'Type', get: (e) => e.type },
    { header: 'SKU', get: (e) => e.sku },
    { header: 'Item', get: (e) => e.itemName },
    { header: 'Category', get: (e) => e.category },
    { header: 'Reason', get: (e) => e.reason },
  ], exceptions);
  downloadCsv(`Exceptions_${storeCode}.csv`, csv);
}
