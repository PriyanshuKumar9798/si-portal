// Cycle — burn forecast page for a single store. Answers three questions in
// order of urgency:
//   1. When is the next indent due?   → Next-indent date + days-until.
//   2. How long does the current stock last?   → Days-of-stock runway.
//   3. Which items will run out BEFORE the next indent?   → At-risk table.
//
// The design language mirrors the SI list — PageHeader, filter pill row,
// 3-up metric strip, SectionCard with a table inside. States: loading,
// error, no-stores, empty (nothing at risk), data.

import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform, type TextStyle, type ViewStyle } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';
import { api } from '../../src/api/client';
import type { StockForecast, StockForecastItem } from '../../src/api/types';
import {
  Body, Button, EmptyState, ErrorState, LoadingState, MetricCard,
  PageHeader, Screen, SectionCard, useBreakpoint,
} from '../../src/components/ui';
import { MultiSelectPill } from '../../src/components/MultiSelectPill';
import { HelpPopover } from '../../src/components/HelpPopover';
import { font, radius, weight, fontFamily, space } from '../../src/theme/tokens';
import { shortDay, shortDayYear } from '../../src/utils/format';
import {
  IconCalendar, IconClock, IconAlertTriangle, IconCheck, IconPlus,
} from '../../src/components/icons';

const stickyHeader = (): ViewStyle | null =>
  Platform.OS === 'web'
    ? { position: 'sticky' as ViewStyle['position'], top: 0, zIndex: 2 }
    : null;

export default function CycleScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const { isPhone } = useBreakpoint();

  // Store selector. Single-store scope for now — the forecast is
  // store-specific; showing multiple stores is a v2 feature.
  const storesQ = useQuery({ queryKey: ['stores'], queryFn: () => api.listStores() });
  const [storeId, setStoreId] = useState<string | null>(null);
  // Pick the first store as default once the list arrives, so the page shows
  // meaningful data right away instead of a blank picker.
  useEffect(() => {
    if (!storeId && (storesQ.data?.length ?? 0) > 0) {
      setStoreId(storesQ.data![0].id);
    }
  }, [storesQ.data, storeId]);

  const forecastQ = useQuery({
    queryKey: ['stock-forecast', storeId],
    queryFn: () => api.getStockForecast(storeId!),
    enabled: !!storeId,
  });

  const data = forecastQ.data;

  return (
    <Screen>
      <PageHeader
        title="Indent cycle & stock"
        subtitle="Next indent date, runway, and items at risk of running out before the next order lands."
      />

      {/* Store picker — single-select. Uses the same MultiSelectPill the SI
          list uses, but capped to one selected id at a time. */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', zIndex: 30, position: 'relative' } as ViewStyle}>
        <MultiSelectPill
          label="Store"
          selected={storeId ? [storeId] : []}
          onChange={(ids) => setStoreId(ids[ids.length - 1] ?? null)}
          options={(storesQ.data ?? []).map((s) => ({
            value: s.id,
            label: s.name,
            sublabel: `${s.code} · ${s.warehouse}`,
          }))}
          placeholderAll="Pick a store"
        />
        {data && (
          <Body mut size="caption">
            Showing {data.storeName} ({data.storeCode})
          </Body>
        )}
      </View>

      {/* Metric strip — one row on desktop, wraps on phone. Runway card
          tone-shifts to red if 0-1 days remain, yellow if it's within the
          current cycle, else neutral. */}
      {data ? (
        <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
          <MetricCard
            label="Indent cycle"
            value={data.cycleLabel}
            hint={data.lastIndentDate ? `Last ran ${shortDay(data.lastIndentDate)}` : 'No prior indent recorded'}
            icon={<IconCalendar size={18} color={c.sTx} />}
            iconTone="neutral"
          />
          <MetricCard
            label="Next indent"
            value={shortDayYear(data.nextIndentDate)}
            hint={`In ${data.daysUntilNextIndent} ${data.daysUntilNextIndent === 1 ? 'day' : 'days'}`}
            icon={<IconClock size={18} color={c.sTx} />}
            iconTone="neutral"
          />
          <MetricCard
            label="Stock runway"
            value={`${data.daysOfStockLeft} ${data.daysOfStockLeft === 1 ? 'day' : 'days'}`}
            hint={
              data.daysOfStockLeft <= 1
                ? 'Critical — at least one SKU is about to stock out.'
                : data.daysOfStockLeft < data.daysUntilNextIndent
                  ? 'Some SKUs run out before the next indent.'
                  : 'Every SKU lasts past the next indent.'
            }
            icon={
              data.daysOfStockLeft <= 1
                ? <IconAlertTriangle size={18} color={c.rTx} />
                : data.daysOfStockLeft < data.daysUntilNextIndent
                  ? <IconAlertTriangle size={18} color={c.yTx} />
                  : <IconCheck size={18} color={c.gTx} />
            }
            iconTone={
              data.daysOfStockLeft <= 1
                ? 'red'
                : data.daysOfStockLeft < data.daysUntilNextIndent
                  ? 'draft'
                  : 'locked'
            }
          />
        </View>
      ) : forecastQ.isLoading ? (
        <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </View>
      ) : null}

      {/* At-risk items — the operational core of this page. When empty we
          render an all-green EmptyState instead of a boring "no rows"
          because the empty state IS the good news. */}
      <SectionCard
        title={data ? `At risk before ${shortDay(data.nextIndentDate)}` : 'At-risk items'}
        subtitle={
          data
            ? data.atRiskItems.length > 0
              ? `${data.atRiskItems.length} SKU${data.atRiskItems.length === 1 ? '' : 's'} run${data.atRiskItems.length === 1 ? 's' : ''} out before the next indent. Generate a fresh SI to cover the gap.`
              : `Every SKU has enough stock to last through the next indent. Nothing urgent.`
            : 'Loading forecast…'
        }
        action={
          data && data.atRiskItems.length > 0 ? (
            <Button
              label="Generate SI"
              leading={<IconPlus size={15} color="#fff" />}
              tooltip="Open Generate pre-configured for this store. After success, the critical SKUs will be listed here in red."
              onPress={() =>
                // `from=cycle` tells the Generate page to (a) skip the auto-
                // navigate to the SI list on success, and (b) show the
                // critical-items post-success card so the store owner can
                // see exactly which at-risk SKUs this SI just covered.
                router.push(`/sis/generate?from=cycle&storeId=${encodeURIComponent(data.storeId)}` as never)
              }
            />
          ) : null
        }
        contentPadding={false}
      >
        {forecastQ.isLoading ? (
          <RiskTableSkeleton count={4} />
        ) : forecastQ.isError ? (
          <ErrorState
            title="Couldn't load forecast"
            body="The stock service didn't answer. Retry in a moment; the last saved snapshot is unchanged."
            onRetry={() => forecastQ.refetch()}
          />
        ) : !data ? (
          <EmptyState
            title="Pick a store to see its forecast"
            body="Every store has its own cycle and stock levels. Pick one from the selector above."
          />
        ) : data.atRiskItems.length === 0 ? (
          <EmptyState
            title="Nothing at risk"
            body={`All ${data.safeItemsCount} SKUs will last past ${shortDay(data.nextIndentDate)}. Come back after the next indent runs.`}
            cta={
              <Button
                label="Back to SIs"
                variant="secondary"
                onPress={() => router.push('/sis' as never)}
              />
            }
          />
        ) : (
          <RiskTable rows={data.atRiskItems} nextDate={data.nextIndentDate} isPhone={isPhone} />
        )}
      </SectionCard>

      {/* Safe items — collapsed summary. Users mostly care about at-risk
          rows; this line just confirms the count so they don't wonder why
          the other 12 items aren't shown. */}
      {data && data.atRiskItems.length > 0 && data.safeItemsCount > 0 && (
        <View style={{
          padding: 14,
          borderWidth: 1, borderColor: c.border, borderRadius: radius.md,
          backgroundColor: c.card,
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <IconCheck size={16} color={c.gTx} />
          <Body mut style={{ flex: 1 }}>
            {data.safeItemsCount} other SKU{data.safeItemsCount === 1 ? '' : 's'} on this SI will last past the next indent — nothing to do there.
          </Body>
        </View>
      )}

      <HelpPopover
        title="Indent cycle & stock"
        sections={[
          {
            heading: 'What this page shows',
            body: 'Your store\'s indent rhythm — how often you order — plus a burn forecast: which SKUs will run out before the next indent lands.',
          },
          {
            heading: 'Stock runway',
            body: 'The shortest days-of-stock across every SKU. If one item runs out in 2 days, the whole runway is 2 days. Green means every item lasts past the next indent; yellow means some items don\'t; red means at least one is about to stock out.',
          },
          {
            heading: 'At risk',
            body: 'SKUs where current stock ÷ average daily consumption is less than the days remaining to the next indent. These are the lines that need extra coverage in your next SI.',
          },
          {
            heading: 'Next steps',
            numbered: true,
            body: [
              'If nothing is at risk, do nothing — the next auto-generated SI will cover you.',
              'If items are at risk, tap Generate SI at the top of the table.',
              'On Generate, keep the run date as today and pick an indent-days interval that covers the gap.',
              'Review and lock the resulting draft SI.',
            ],
          },
        ]}
      />
    </Screen>
  );
}

// ─── Table + skeletons ──────────────────────────────────────────────────────

function RiskTable({
  rows, nextDate, isPhone,
}: { rows: StockForecastItem[]; nextDate: string; isPhone: boolean }) {
  const { c } = useTheme();
  const th: TextStyle = {
    color: c.mut, fontSize: font.micro,
    fontWeight: weight.semibold as TextStyle['fontWeight'],
    textTransform: 'uppercase', letterSpacing: 0.6, fontFamily,
  };
  return (
    <ScrollView horizontal style={{ width: '100%' }} contentContainerStyle={{ minWidth: 780, width: '100%' }}>
      <View style={{ minWidth: 780, width: '100%' }}>
        <View style={{
          flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
          borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card,
          ...stickyHeader(),
        }}>
          <Text style={[th, { width: 130 }]}>SKU</Text>
          <Text style={[th, { flex: 1, minWidth: 200 }]}>Item</Text>
          <Text style={[th, { width: 110 }]}>Category</Text>
          <Text style={[th, { width: 100, textAlign: 'right' }]}>Stock (cs)</Text>
          <Text style={[th, { width: 100, textAlign: 'right' }]}>ADC (cs/d)</Text>
          <Text style={[th, { width: 180, textAlign: 'right' }]}>Runs out</Text>
        </View>
        {rows.map((r) => {
          // Runway urgency: red 0-1 days, yellow 2-days, else fg.
          const urgent = r.daysUntilStockout <= 1;
          const soon = r.daysUntilStockout <= 3;
          const runwayColor = urgent ? c.rTx : soon ? c.yTx : c.fg;
          return (
            <View key={r.sku} style={{
              flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11,
              borderBottomWidth: 1, borderBottomColor: c.border, alignItems: 'center',
            }}>
              <Text style={{ width: 130, color: c.fg, fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'] }}>{r.sku}</Text>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={{ color: c.fg, fontSize: font.body, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }} numberOfLines={1}>
                  {r.itemName}
                </Text>
              </View>
              <Text style={{ width: 110, color: c.mut, fontSize: font.body, fontFamily }} numberOfLines={1}>{r.category}</Text>
              <Text style={{ width: 100, textAlign: 'right', color: c.fg, fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'] }}>
                {r.currentStockCases}
              </Text>
              <Text style={{ width: 100, textAlign: 'right', color: c.mut, fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'] }}>
                {r.adc.toFixed(1)}
              </Text>
              <View style={{ width: 180, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: 8 }}>
                <Text style={{
                  color: runwayColor,
                  fontWeight: (urgent || soon ? weight.semibold : weight.regular) as TextStyle['fontWeight'],
                  fontSize: font.body, fontFamily, fontVariant: ['tabular-nums'],
                }}>
                  {r.daysUntilStockout} {r.daysUntilStockout === 1 ? 'day' : 'days'}
                </Text>
                <Text style={{ color: c.mut, fontSize: font.caption, fontFamily }}>
                  · {shortDay(r.runsOutOn)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function RiskTableSkeleton({ count = 4 }: { count?: number }) {
  const { c } = useTheme();
  const bar = (w: number, h = 12) => ({ width: w, height: h, borderRadius: 4, backgroundColor: c.muted, opacity: 0.6 });
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: c.border,
        }}>
          <View style={{ width: 130 }}><View style={bar(90)} /></View>
          <View style={{ flex: 1, minWidth: 200, gap: 6 }}>
            <View style={bar(160)} />
            <View style={bar(80, 9)} />
          </View>
          <View style={{ width: 110 }}><View style={bar(60)} /></View>
          <View style={{ width: 100 }}><View style={bar(40)} /></View>
          <View style={{ width: 100 }}><View style={bar(40)} /></View>
          <View style={{ width: 110 }}><View style={bar(50)} /></View>
          <View style={{ width: 100 }}><View style={bar(50)} /></View>
        </View>
      ))}
    </View>
  );
}

function MetricCardSkeleton() {
  const { c } = useTheme();
  const bar = (w: number, h = 12) => ({ width: w, height: h, borderRadius: 4, backgroundColor: c.muted, opacity: 0.6 });
  return (
    <View style={{
      flexGrow: 1, flexBasis: 200, minWidth: 200,
      borderWidth: 1, borderColor: c.border, borderRadius: radius.lg,
      backgroundColor: c.card, padding: 16,
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    }}>
      <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.muted, opacity: 0.6 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={bar(80, 9)} />
        <View style={{ marginTop: 4, ...bar(120, 22) }} />
        <View style={bar(140, 10)} />
      </View>
    </View>
  );
}
