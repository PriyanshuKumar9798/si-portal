// Generate — the multi-store SI generator. Design language matches the SI
// list: PageHeader → SectionCards with title/subtitle/action. Form layout is
// two side-by-side cards on desktop (Stores + Config) collapsing to a stack
// on tablet/phone. Partial-failure handling is explicit — the success card
// lists both `succeeded` and `failed` with reasons.

import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, type ViewStyle, type TextStyle } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme/ThemeContext';
import { api } from '../../../src/api/client';
import type { GenerateSiResult } from '../../../src/api/types';
import { Body, Button, Field, MicroLabel, PageHeader, Screen, SectionCard, Banner } from '../../../src/components/ui';
import { BackLink } from '../../../src/components/BackLink';
import { HelpPopover } from '../../../src/components/HelpPopover';
import { font, radius, weight, fontFamily, space } from '../../../src/theme/tokens';
import { todayIso, shortDayYear } from '../../../src/utils/format';
import { IconArrowLeft, IconRefresh, IconPlus, IconCheck, IconClose, IconCalendar } from '../../../src/components/icons';
import { useToast } from '../../../src/components/Toast';

export default function GenerateScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  // `from=cycle&storeId=...` arrives when this page opens from the Cycle
  // tab. In that case: prefill the store, keep the user on this page after
  // success (no auto-nav), and render a "critical items" post-success view
  // instead of the plain "N drafts created" banner.
  const params = useLocalSearchParams<{ from?: string; storeId?: string }>();
  const fromCycle = params.from === 'cycle';
  const prefilledStoreId = typeof params.storeId === 'string' ? params.storeId : null;

  const storesQ = useQuery({ queryKey: ['stores'], queryFn: () => api.listStores() });
  const [selected, setSelected] = useState<string[]>(prefilledStoreId ? [prefilledStoreId] : []);
  const [query, setQuery] = useState('');
  // Run date is locked to today. The store persona should never generate an
  // SI for an arbitrary date; nightly cron handles the historical dates and
  // the manual case is always "generate for today". Kept in state so a
  // future admin override could unlock it, but the form UI is read-only.
  const runDate = todayIso();
  // Indent-cycle interval — how many days of demand this indent covers.
  // Default 21 (three weeks) — most store cycles land in the 20-30-day
  // range, so a 21-day default keeps the common case one-tap.
  const [indentDays, setIndentDays] = useState('21');
  const [result, setResult] = useState<GenerateSiResult | null>(null);

  // If the params arrive after the initial render (e.g., HMR), re-sync
  // the store selection to the prefilled value.
  useEffect(() => {
    if (prefilledStoreId && !selected.includes(prefilledStoreId)) {
      setSelected([prefilledStoreId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledStoreId]);


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

  // Mutation takes explicit storeIds as its variable so `Retry these stores`
  // can call it with the failed-only subset without depending on the async
  // `selected` state update landing first.
  const toast = useToast();
  const genMut = useMutation({
    mutationFn: (storeIds: string[]) => api.generate({
      storeIds,
      runDate,
      indentDays: Number(indentDays) || 3,
      // Buffer + lead-time overrides used to live in the form. The store
      // persona doesn't need those knobs — per-store defaults handle
      // buffer, and lead time comes from the DC config. Sent as 0 / null
      // so the API contract stays satisfied.
      bufferDays: 0,
      leadTimeOverrideDays: null,
    }),
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ['sis'] });
      // Toast confirms the outcome even when we're staying on this screen
      // (partial failures). On a clean success we auto-navigate; the toast
      // still fires so the user sees confirmation on the list page too.
      if (r.succeeded.length > 0 && r.failed.length === 0) {
        toast.show(
          `Generated ${r.succeeded.length} draft SI${r.succeeded.length === 1 ? '' : 's'} for ${shortDayYear(runDate)}.`,
          { tone: 'success' },
        );
      } else if (r.succeeded.length > 0 && r.failed.length > 0) {
        toast.show(
          `${r.succeeded.length} SI${r.succeeded.length === 1 ? '' : 's'} created, ${r.failed.length} failed. See below to retry.`,
          { tone: 'info' },
        );
      } else if (r.failed.length > 0) {
        toast.show(
          `Every store failed. Check the reasons below and retry.`,
          { tone: 'error' },
        );
      }
      // Brief §3 (daily flow): "land on SI list for that date". Auto-nav on
      // full success. On partial failure we stay put so the user sees WHICH
      // stores failed via the persistent red banner — quietly navigating
      // would swallow the failure list.
      //
      // Cycle-context branch: open the newly-generated SI's detail page so
      // the user can review the critical items right where they're editable
      // (the Detail page marks at-risk lines red + CRITICAL chip). The
      // regular Generate flow still lands on the SI list.
      if (r.failed.length === 0 && r.succeeded.length > 0) {
        if (fromCycle) {
          const siId = r.succeeded[0].siId;
          setTimeout(() => router.push(`/sis/${siId}` as never), 500);
        } else {
          setTimeout(() => router.push(`/sis?runDate=${runDate}` as never), 700);
        }
      }
    },
    onError: (e: unknown) => {
      const msg = (e as { message?: string })?.message || 'Generation failed. Try again.';
      toast.show(msg, { tone: 'error' });
    },
  });

  const canSubmit = selected.length > 0 && !genMut.isPending;

  return (
    <Screen>
      <BackLink />
      <PageHeader
        title="Generate SIs"
        subtitle="Pick the stores you want fresh drafts for. Only your assigned stores are shown."
      />

      {result && (
        <View style={{ gap: space.md }}>
          {result.succeeded.length > 0 && (
            <Banner
              tone="success"
              title={`${result.succeeded.length} ${result.succeeded.length === 1 ? 'draft' : 'drafts'} created`}
              body={`Open the SI list to review the new drafts for ${shortDayYear(runDate)}.`}
              action={
                <Button
                  label="Open SI list"
                  leading={<IconArrowLeft size={16} color="#ffffff" />}
                  tooltip="Jump to the SI list, already filtered to the run date you just generated for."
                  onPress={() => router.push('/sis')}
                />
              }
            />
          )}
          {result.failed.length > 0 && (
            <View style={{
              backgroundColor: c.rBg, borderRadius: radius.md, padding: 14, gap: 10,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Text style={{ color: c.rTx, fontSize: font.bodyLg, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
                  {result.failed.length} store{result.failed.length === 1 ? '' : 's'} couldn't generate
                </Text>
                {/* Retry just the failed stores — no re-picking. Preserves the
                    original run configuration; the mock re-rolls the ~5%
                    failure chance so retries usually succeed. */}
                <Button
                  label={genMut.isPending ? 'Retrying…' : `Retry ${result.failed.length === 1 ? 'this store' : 'these stores'}`}
                  variant="secondary"
                  leading={<IconRefresh size={16} color={c.fg} />}
                  tooltip="Re-run generation only for the stores that failed. Nothing else is touched."
                  onPress={() => {
                    const retryIds = result.failed.map((f) => f.storeId);
                    setSelected(retryIds);
                    setResult(null);
                    // Pass storeIds directly so we don't race on setSelected.
                    genMut.mutate(retryIds);
                  }}
                  loading={genMut.isPending}
                />
              </View>
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
                  leading={<IconCheck size={14} color={c.fg} />}
                  tooltip="Select every store you have access to."
                  onPress={() => setSelected((storesQ.data ?? []).map((s) => s.id))}
                />
                <Button
                  label="Clear"
                  variant="ghost"
                  leading={<IconClose size={14} color={c.mut} />}
                  tooltip="Deselect all stores."
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
              {/* Run date is intentionally read-only. The store persona
                  never generates for a historical or future date — every
                  manual run is "today's demand", the nightly cron handles
                  the rest. Rendered as a static pill so the layout still
                  reads as a form field. */}
              <View style={{ gap: 6 }}>
                <MicroLabel>Run date</MicroLabel>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  borderWidth: 1, borderColor: c.border, backgroundColor: c.bg,
                  borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12,
                }}>
                  <IconCalendar size={14} color={c.mut} />
                  <Text style={{ color: c.fg, fontSize: font.bodyLg, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
                    {shortDayYear(runDate)}
                  </Text>
                  <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, marginLeft: 4 }}>
                    (today)
                  </Text>
                </View>
              </View>
              <Field
                label="Indent days"
                value={indentDays}
                onChangeText={setIndentDays}
                placeholder="21"
                keyboardType="numeric"
              />
              <View style={{ height: 4 }} />
              <Button
                label={genMut.isPending ? 'Generating…' : `Generate ${selected.length || ''} SI${selected.length === 1 ? '' : 's'}`.trim()}
                leading={<IconPlus size={16} color="#ffffff" />}
                emphasis={canSubmit ? 'high' : 'normal'}
                tooltip={
                  !canSubmit
                    ? 'Pick at least one store above and set a valid run date to enable.'
                    : `Create fresh draft SIs for ${selected.length} store${selected.length === 1 ? '' : 's'} on ${shortDayYear(runDate)}.`
                }
                onPress={() => genMut.mutate(selected)}
                disabled={!canSubmit}
                loading={genMut.isPending}
                fullWidth
              />
              {genMut.isError && (
                <Text style={{ color: c.rTx, fontSize: font.small, fontFamily }}>
                  {(genMut.error as { message?: string })?.message ?? 'Generate failed. Try again.'}
                </Text>
              )}
              <Text style={{ color: c.mut, fontSize: font.small, fontFamily }}>
                Manual generations are logged with the "Catch-up" trigger and remain editable until locked.
              </Text>
            </View>
          </SectionCard>
        </View>
      </View>

      <HelpPopover
        title="Generate SIs"
        sections={[
          {
            heading: 'When to use this',
            body: 'Use Generate when the nightly engine has not run, when you need a fresh draft for a specific store, or when you want to catch up on a past date.',
          },
          {
            heading: 'How the numbers are picked',
            body: 'The engine looks at each SKU\'s Average Daily Consumption (ADC), the store\'s lead time, and your Buffer days. It then rounds up to full cases.',
          },
          {
            heading: 'Steps',
            numbered: true,
            body: [
              'Tick the stores you want drafts for.',
              'Set the run date (usually today or tomorrow).',
              'Adjust Buffer days if you expect a longer weekend or a spike.',
              'Leave Lead time override blank to use each store\'s default.',
              'Tap Generate. On success you\'ll land on the SI list, filtered to that date, with the new drafts marked "Just now".',
            ],
          },
          {
            heading: 'If a store fails',
            body: 'The failure banner names the reason. Tap Retry these stores to try again without picking them all over. Generating over an existing draft simply overwrites it.',
          },
        ]}
      />
    </Screen>
  );
}

