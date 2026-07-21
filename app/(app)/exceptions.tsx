// Exceptions feed — cross-store list scoped to the signed-in user's stores.
// Type-chip filters at the top; a single table below. Row click opens the
// owning SI detail. Every list state (loading / empty / error) rendered
// inside the same SectionCard so filters stay visible.

import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, type TextStyle } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';
import { api } from '../../src/api/client';
import type { ExceptionType, SiException } from '../../src/api/types';
import { Body, Button, EmptyState, ErrorState, FilterChip, LoadingState, PageHeader, Screen, SectionCard } from '../../src/components/ui';
import { font, radius, weight, fontFamily } from '../../src/theme/tokens';
import { shortDayYear, todayIso } from '../../src/utils/format';
import { ExceptionTypeChip } from './sis/[id]';
import { buildCsv, downloadCsv } from '../../src/utils/csv';

const ALL_TYPES: ExceptionType[] = ['NEEDS_ADC', 'UNMAPPED', 'ADC_ZERO', 'FREEZER_OVERCAP', 'MISSING_CONVERSION'];

export default function ExceptionsScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const [runDate, setRunDate] = useState<string>(todayIso());
  const [types, setTypes] = useState<ExceptionType[]>([]);

  const q = useQuery({
    queryKey: ['exceptions', { runDate, types }],
    queryFn: () => api.listExceptions({ runDate, types }),
  });

  const rows = q.data ?? [];
  const countsByType = useMemo(() => {
    const map = new Map<ExceptionType, number>();
    for (const r of rows) map.set(r.type, (map.get(r.type) ?? 0) + 1);
    return map;
  }, [rows]);

  return (
    <Screen>
      <PageHeader
        title="Exceptions"
        subtitle="Data issues the engine couldn't resolve. Fix upstream, then re-generate."
        action={
          <Button
            label="Export CSV"
            variant="secondary"
            onPress={() => downloadCsv(`Exceptions_${runDate}.csv`, buildCsv<SiException>([
              { header: 'Type', get: (e) => e.type },
              { header: 'Store', get: (e) => e.storeName },
              { header: 'Store code', get: (e) => e.storeCode },
              { header: 'Run date', get: (e) => e.runDate },
              { header: 'SKU', get: (e) => e.sku },
              { header: 'Item', get: (e) => e.itemName },
              { header: 'Reason', get: (e) => e.reason },
            ], rows))}
            disabled={rows.length === 0}
          />
        }
      />

      {/* Type-chip filters + run-date pill */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {ALL_TYPES.map((t) => {
            const on = types.includes(t);
            const count = countsByType.get(t) ?? 0;
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
                <Text style={{
                  color: c.mut, fontSize: font.caption, fontFamily, fontVariant: ['tabular-nums'],
                }}>{count}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <FilterChip label={`Run date: ${shortDayYear(runDate)}`} onClear={() => setRunDate(todayIso())} />
          {types.length > 0 && (
            <FilterChip label={`Types: ${types.length}`} onClear={() => setTypes([])} />
          )}
        </View>
      </View>

      <SectionCard title="All exceptions" subtitle={`${rows.length} row${rows.length === 1 ? '' : 's'} matching filters`} contentPadding={false}>
        {q.isLoading ? (
          <LoadingState label="Loading exceptions…" />
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} body="Couldn't reach the indent service — try again in a moment." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No exceptions in scope"
            body="Every SKU on today's SIs resolved cleanly. Nice."
          />
        ) : (
          <ExceptionsTable rows={rows} onOpen={(siId) => router.push(`/sis/${siId}` as never)} />
        )}
      </SectionCard>
    </Screen>
  );
}

function ExceptionsTable({ rows, onOpen }: { rows: SiException[]; onOpen: (siId: string) => void }) {
  const { c } = useTheme();
  const th: TextStyle = {
    color: c.mut, fontSize: font.micro,
    fontWeight: weight.semibold as TextStyle['fontWeight'],
    textTransform: 'uppercase', letterSpacing: 0.6, fontFamily,
  };
  return (
    <ScrollView horizontal>
      <View style={{ minWidth: 900 }}>
        <View style={{
          flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
          borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card,
        }}>
          <Text style={[th, { width: 180 }]}>Type</Text>
          <Text style={[th, { width: 200 }]}>Store</Text>
          <Text style={[th, { width: 100 }]}>Run date</Text>
          <Text style={[th, { width: 110 }]}>SKU</Text>
          <Text style={[th, { width: 220 }]}>Item</Text>
          <Text style={[th, { flex: 1, minWidth: 200 }]}>Reason</Text>
        </View>
        {rows.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => onOpen(e.siId)}
            style={({ hovered }) => ({
              flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11,
              borderBottomWidth: 1, borderBottomColor: c.border,
              backgroundColor: (hovered as boolean) ? c.accent : c.card,
            })}
          >
            <View style={{ width: 180 }}><ExceptionTypeChip type={e.type} /></View>
            <View style={{ width: 200 }}>
              <Text style={{ color: c.fg, fontSize: font.body, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }} numberOfLines={1}>{e.storeName}</Text>
              <Text style={{ color: c.mut, fontSize: font.caption, marginTop: 1, fontFamily }}>{e.storeCode}</Text>
            </View>
            <Text style={{ width: 100, color: c.fg, fontSize: font.body, fontFamily }}>{shortDayYear(e.runDate)}</Text>
            <Text style={{ width: 110, color: c.fg, fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'] }}>{e.sku}</Text>
            <Text style={{ width: 220, color: c.fg, fontSize: font.body, fontFamily }} numberOfLines={1}>{e.itemName}</Text>
            <Text style={{ flex: 1, minWidth: 200, color: c.mut, fontSize: font.body, fontFamily }}>{e.reason}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
