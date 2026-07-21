// Generate — the multi-store SI generator. Design language matches the SI
// list: PageHeader → SectionCards with title/subtitle/action. Form layout is
// two side-by-side cards on desktop (Stores + Config) collapsing to a stack
// on tablet/phone. Partial-failure handling is explicit — the success card
// lists both `succeeded` and `failed` with reasons.

import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, type ViewStyle, type TextStyle } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme/ThemeContext';
import { api } from '../../../src/api/client';
import type { GenerateSiResult } from '../../../src/api/types';
import { Body, Button, Field, MicroLabel, PageHeader, Screen, SectionCard, Banner } from '../../../src/components/ui';
import { font, radius, weight, fontFamily, space } from '../../../src/theme/tokens';
import { todayIso, shortDayYear } from '../../../src/utils/format';

export default function GenerateScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const storesQ = useQuery({ queryKey: ['stores'], queryFn: () => api.listStores() });
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [runDate, setRunDate] = useState<string>(todayIso());
  const [bufferDays, setBufferDays] = useState('2');
  const [leadOverride, setLeadOverride] = useState('');
  const [result, setResult] = useState<GenerateSiResult | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = storesQ.data ?? [];
    if (!needle) return list;
    return list.filter((s) =>
      s.name.toLowerCase().includes(needle) ||
      s.code.toLowerCase().includes(needle) ||
      s.warehouse.toLowerCase().includes(needle),
    );
  }, [query, storesQ.data]);

  const genMut = useMutation({
    mutationFn: () => api.generate({
      storeIds: selected,
      runDate,
      bufferDays: Number(bufferDays) || 0,
      leadTimeOverrideDays: leadOverride.trim() ? Number(leadOverride) : null,
    }),
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ['sis'] });
    },
  });

  const canSubmit = selected.length > 0 && !genMut.isPending;

  return (
    <Screen>
      <PageHeader
        title="Generate SIs"
        subtitle="Pick the stores you want fresh drafts for. Only your assigned stores are shown."
        action={<Button label="Back to SI list" variant="secondary" onPress={() => router.push('/sis')} />}
      />

      {result && (
        <View style={{ gap: space.md }}>
          {result.succeeded.length > 0 && (
            <Banner
              tone="success"
              title={`${result.succeeded.length} ${result.succeeded.length === 1 ? 'draft' : 'drafts'} created`}
              body={`Open the SI list to review the new drafts for ${shortDayYear(runDate)}.`}
              action={<Button label="Open SI list" onPress={() => router.push('/sis')} />}
            />
          )}
          {result.failed.length > 0 && (
            <View style={{
              backgroundColor: c.rBg, borderRadius: radius.md, padding: 14, gap: 8,
            }}>
              <Text style={{ color: c.rTx, fontSize: font.bodyLg, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
                {result.failed.length} store{result.failed.length === 1 ? '' : 's'} couldn't generate
              </Text>
              {result.failed.map((f) => (
                <View key={f.storeId} style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ color: c.fg, fontSize: font.body, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily, width: 200 }}>
                    {f.storeName}
                  </Text>
                  <Text style={{ color: c.mut, fontSize: font.body, fontFamily, flex: 1 }}>{f.reason}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
        {/* Stores card — flex-3 on desktop */}
        <View style={{ flex: 2, minWidth: 320 }}>
          <SectionCard
            title="Stores"
            subtitle={`${selected.length} of ${(storesQ.data ?? []).length} selected`}
            action={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Button
                  label="Select all"
                  variant="secondary"
                  onPress={() => setSelected((storesQ.data ?? []).map((s) => s.id))}
                />
                <Button
                  label="Clear"
                  variant="ghost"
                  onPress={() => setSelected([])}
                />
              </View>
            }
            contentPadding={false}
          >
            <View style={{ padding: 16, gap: 12 }}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by store name, code, or warehouse"
                placeholderTextColor={c.mut}
                style={{
                  borderWidth: 1, borderColor: c.border, backgroundColor: c.bg,
                  color: c.fg, borderRadius: radius.md,
                  paddingHorizontal: 12, paddingVertical: 9, fontSize: font.body, fontFamily,
                } as TextStyle}
              />
              <ScrollView style={{ maxHeight: 420 }}>
                {storesQ.isLoading && (
                  <Text style={{ color: c.mut, fontSize: font.body, padding: 12, fontFamily }}>Loading stores…</Text>
                )}
                {filtered.map((s) => {
                  const on = selected.includes(s.id);
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setSelected(on ? selected.filter((v) => v !== s.id) : [...selected, s.id])}
                      style={({ hovered }) => ([
                        { flexDirection: 'row', alignItems: 'center', gap: 12,
                          paddingVertical: 10, paddingHorizontal: 8,
                          borderRadius: radius.sm,
                          backgroundColor: (hovered as boolean) ? c.accent : 'transparent' } as ViewStyle,
                      ])}
                    >
                      <View style={{
                        width: 18, height: 18, borderRadius: 4,
                        borderWidth: 1,
                        borderColor: on ? c.redSolid : c.border,
                        backgroundColor: on ? c.redSolid : c.bg,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {on && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: c.fg, fontSize: font.body, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }} numberOfLines={1}>
                          {s.name}
                        </Text>
                        <Text style={{ color: c.mut, fontSize: font.caption, fontFamily }} numberOfLines={1}>
                          {s.code} · {s.warehouse}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
                {!storesQ.isLoading && filtered.length === 0 && (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: c.mut, fontSize: font.body, fontFamily }}>
                      No stores match "{query}".
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </SectionCard>
        </View>

        {/* Config card */}
        <View style={{ flex: 1, minWidth: 280 }}>
          <SectionCard title="Run configuration" subtitle="These apply to every store you generate for.">
            <View style={{ padding: 16, gap: 14 }}>
              <Field
                label="Run date"
                value={runDate}
                onChangeText={setRunDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
              <Field
                label="Buffer days"
                value={bufferDays}
                onChangeText={setBufferDays}
                placeholder="2"
                keyboardType="numeric"
              />
              <Field
                label="Lead time override (optional)"
                value={leadOverride}
                onChangeText={setLeadOverride}
                placeholder="Leave blank to use per-store default"
                keyboardType="numeric"
              />
              <View style={{ height: 4 }} />
              <Button
                label={genMut.isPending ? 'Generating…' : `Generate ${selected.length || ''} SI${selected.length === 1 ? '' : 's'}`.trim()}
                onPress={() => genMut.mutate()}
                disabled={!canSubmit}
                loading={genMut.isPending}
                fullWidth
              />
              {genMut.isError && (
                <Text style={{ color: c.rTx, fontSize: font.small, fontFamily }}>
                  {(genMut.error as { message?: string })?.message ?? 'Generate failed — try again.'}
                </Text>
              )}
              <Text style={{ color: c.mut, fontSize: font.small, fontFamily }}>
                Manual generations are logged with the "Catch-up" trigger and remain editable until locked.
              </Text>
            </View>
          </SectionCard>
        </View>
      </View>
    </Screen>
  );
}
