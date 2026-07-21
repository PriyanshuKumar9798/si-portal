// Mapping discrepancies — same table shape as Exceptions but scoped to
// UNMAPPED + MISSING_CONVERSION issues. Above the table sits a summary row
// (2 metric cards) so the user can see the total counts at a glance.

import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, type TextStyle } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../src/theme/ThemeContext';
import { api } from '../../src/api/client';
import type { Discrepancy } from '../../src/api/types';
import { Body, Button, EmptyState, ErrorState, FilterChip, LoadingState, MetricCard, PageHeader, Screen, SectionCard } from '../../src/components/ui';
import { font, radius, weight, fontFamily, space } from '../../src/theme/tokens';
import { shortDayYear, todayIso } from '../../src/utils/format';
import { buildCsv, downloadCsv } from '../../src/utils/csv';
import { ExceptionTypeChip } from './sis/[id]';

type DiscType = 'UNMAPPED' | 'MISSING_CONVERSION';

export default function DiscrepanciesScreen() {
  const { c } = useTheme();
  const [runDate, setRunDate] = useState<string>(todayIso());
  const [types, setTypes] = useState<DiscType[]>([]);

  const q = useQuery({
    queryKey: ['discrepancies', { runDate, types }],
    queryFn: () => api.listDiscrepancies({ runDate, types }),
  });

  const rows = q.data ?? [];

  const counts = useMemo(() => {
    const map: Record<DiscType, number> = { UNMAPPED: 0, MISSING_CONVERSION: 0 };
    for (const r of rows) map[r.type] += 1;
    return map;
  }, [rows]);

  return (
    <Screen>
      <PageHeader
        title="Mapping discrepancies"
        subtitle="Unmapped SKUs and missing unit-conversion factors — data cleanup that unblocks the engine."
        action={
          <Button
            label="Export CSV"
            variant="secondary"
            onPress={() => downloadCsv(`Discrepancies_${runDate}.csv`, buildCsv<Discrepancy>([
              { header: 'Type', get: (r) => r.type },
              { header: 'Store', get: (r) => r.storeName },
              { header: 'Store code', get: (r) => r.storeCode },
              { header: 'Run date', get: (r) => r.runDate },
              { header: 'SKU', get: (r) => r.sku },
              { header: 'Item', get: (r) => r.itemName },
              { header: 'Category', get: (r) => r.category },
              { header: 'Reason', get: (r) => r.reason },
            ], rows))}
            disabled={rows.length === 0}
          />
        }
      />

      {/* Summary counts */}
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <MetricCard label="Unmapped SKUs" value={q.isLoading ? '—' : counts.UNMAPPED} />
        <MetricCard label="Missing conversions" value={q.isLoading ? '—' : counts.MISSING_CONVERSION} />
        <MetricCard label="Total rows" value={q.isLoading ? '—' : rows.length} />
      </View>

      {/* Type-chip filters */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {(['UNMAPPED', 'MISSING_CONVERSION'] as DiscType[]).map((t) => {
          const on = types.includes(t);
          return (
            <Pressable
              key={t}
              onPress={() => setTypes(on ? types.filter((x) => x !== t) : [...types, t])}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                borderWidth: 1, borderRadius: radius.pill,
                paddingVertical: 4, paddingHorizontal: 10,
                borderColor: on ? c.chipRedBorder : c.border,
                backgroundColor: on ? c.rBg : 'transparent',
              }}
            >
              <Text style={{
                color: on ? c.rTx : c.fg,
                fontSize: font.small,
                fontWeight: weight.semibold as TextStyle['fontWeight'],
                fontFamily,
              }}>{t}</Text>
              <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, fontVariant: ['tabular-nums'] }}>
                {counts[t]}
              </Text>
            </Pressable>
          );
        })}
        <FilterChip label={`Run date: ${shortDayYear(runDate)}`} onClear={() => setRunDate(todayIso())} />
      </View>

      <SectionCard
        title="Discrepancies"
        subtitle={`${rows.length} row${rows.length === 1 ? '' : 's'} matching filters`}
        contentPadding={false}
      >
        {q.isLoading ? (
          <LoadingState label="Loading discrepancies…" />
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} body="Couldn't reach the mapping service." />
        ) : rows.length === 0 ? (
          <EmptyState title="No mapping issues" body="Every SKU used on today's SIs maps cleanly to a warehouse product with a valid conversion." />
        ) : (
          <DiscrepanciesTable rows={rows} />
        )}
      </SectionCard>
    </Screen>
  );
}

function DiscrepanciesTable({ rows }: { rows: Discrepancy[] }) {
  const { c } = useTheme();
  const th: TextStyle = {
    color: c.mut, fontSize: font.micro,
    fontWeight: weight.semibold as TextStyle['fontWeight'],
    textTransform: 'uppercase', letterSpacing: 0.6, fontFamily,
  };
  return (
    <ScrollView horizontal>
      <View style={{ minWidth: 960 }}>
        <View style={{
          flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
          borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card,
        }}>
          <Text style={[th, { width: 180 }]}>Type</Text>
          <Text style={[th, { width: 200 }]}>Store</Text>
          <Text style={[th, { width: 110 }]}>SKU</Text>
          <Text style={[th, { width: 220 }]}>Item</Text>
          <Text style={[th, { width: 140 }]}>Category</Text>
          <Text style={[th, { width: 100 }]}>Run date</Text>
          <Text style={[th, { flex: 1, minWidth: 200 }]}>Reason</Text>
        </View>
        {rows.map((r) => (
          <View key={r.id} style={{
            flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11,
            borderBottomWidth: 1, borderBottomColor: c.border,
          }}>
            <View style={{ width: 180 }}><ExceptionTypeChip type={r.type} /></View>
            <View style={{ width: 200 }}>
              <Text style={{ color: c.fg, fontSize: font.body, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }} numberOfLines={1}>{r.storeName}</Text>
              <Text style={{ color: c.mut, fontSize: font.caption, marginTop: 1, fontFamily }}>{r.storeCode}</Text>
            </View>
            <Text style={{ width: 110, color: c.fg, fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'] }}>{r.sku}</Text>
            <Text style={{ width: 220, color: c.fg, fontSize: font.body, fontFamily }} numberOfLines={1}>{r.itemName}</Text>
            <Text style={{ width: 140, color: c.mut, fontSize: font.body, fontFamily }} numberOfLines={1}>{r.category}</Text>
            <Text style={{ width: 100, color: c.fg, fontSize: font.body, fontFamily }}>{shortDayYear(r.runDate)}</Text>
            <Text style={{ flex: 1, minWidth: 200, color: c.mut, fontSize: font.body, fontFamily }}>{r.reason}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
