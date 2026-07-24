// SI Detail — the core operating screen. Handles both variants (draft +
// locked) in a single render tree, keyed off `data.status`. Edits are staged
// locally in a `pendingEdits` map so "Save all" is one round-trip. Locking
// is a confirm dialog; deletion is a separate confirm dialog with red CTA.

import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Platform, type TextStyle, type ViewStyle } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme/ThemeContext';
import { api } from '../../../src/api/client';
import type { SiDetail, SiException, ExceptionType } from '../../../src/api/types';
import { Body, Button, ErrorState, LoadingState, PageHeader, Screen, SectionCard, StatusChip, MicroLabel, useBreakpoint } from '../../../src/components/ui';
import { font, radius, weight, fontFamily, space } from '../../../src/theme/tokens';
import { shortDayYear } from '../../../src/utils/format';
import { buildCsv, downloadCsv } from '../../../src/utils/csv';
import { ConfirmDialog } from './index';
import {
  IconDownload, IconSave, IconTrash, IconLock, IconAlertTriangle, IconFileText,
  IconUser, IconClock,
} from '../../../src/components/icons';
import { BackLink } from '../../../src/components/BackLink';
import { HelpPopover } from '../../../src/components/HelpPopover';
import { useUnsavedChangesGuard } from '../../../src/hooks/useUnsavedChangesGuard';
import { UnsavedChangesBar, UNSAVED_BAR_FOOTER_PAD } from '../../../src/components/UnsavedChangesBar';
import { useToast } from '../../../src/components/Toast';

export default function SiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  // Route-focus gate. Expo-router keeps the previous screen mounted during
  // its fade transition, which means the floating bar's portal keeps
  // rendering ON TOP of the new page for a beat. Comparing against the
  // live pathname lets us disable the bar the moment the URL changes.
  const currentPath = usePathname();
  const focused = currentPath === `/sis/${id}`;
  const [pending, setPending] = useState<Record<string, number | null>>({});
  const [confirmLock, setConfirmLock] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toast = useToast();

  const q = useQuery({
    queryKey: ['si', id],
    queryFn: () => api.getSi(id!),
    enabled: !!id,
  });

  const saveMut = useMutation({
    mutationFn: () => {
      const editCount = Object.keys(pending).length;
      return api.saveLines(id!, {
        edits: Object.entries(pending).map(([lineId, editedQty]) => ({ lineId, editedQty })),
      }).then((res) => ({ res, editCount }));
    },
    onSuccess: ({ res, editCount }) => {
      qc.setQueryData(['si', id], res);
      qc.invalidateQueries({ queryKey: ['sis'] });
      setPending({});
      toast.show(
        `Saved ${editCount} edit${editCount === 1 ? '' : 's'} for ${res.store.name}.`,
        { tone: 'success' },
      );
    },
    onError: (e: unknown) => {
      const msg = (e as { message?: string })?.message || 'Save failed. Try again.';
      toast.show(msg, { tone: 'error' });
    },
  });

  const lockMut = useMutation({
    mutationFn: () => api.lockSi(id!),
    onSuccess: (fresh) => {
      qc.setQueryData(['si', id], fresh);
      qc.invalidateQueries({ queryKey: ['sis'] });
      setConfirmLock(false);
      toast.show(`SI for ${fresh.store.name} is now locked.`, { tone: 'success' });
    },
    onError: (e: unknown) => {
      const msg = (e as { message?: string })?.message || 'Lock failed. Try again.';
      toast.show(msg, { tone: 'error' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => api.deleteSi(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sis'] });
      const name = q.data?.store.name ?? 'draft';
      router.push('/sis');
      toast.show(`Draft SI for ${name} deleted. You can regenerate it later.`, { tone: 'success' });
    },
    onError: (e: unknown) => {
      const msg = (e as { message?: string })?.message || 'Delete failed. Try again.';
      toast.show(msg, { tone: 'error' });
    },
  });

  // Hooks MUST live above the loading/error early returns — Rules of Hooks
  // require every render to call the same set of hooks in the same order.
  // Both are safe to evaluate before `q.data` exists (they only depend on
  // local state and viewport width).
  const dirtyCount = Object.keys(pending).length;
  // Only report dirty while THIS screen is focused. Otherwise a
  // stale-mid-transition Detail could keep the guard active on the next
  // page and blindly prompt the user when they click a nav item there.
  const guardNav = useUnsavedChangesGuard(focused && dirtyCount > 0);
  const { width } = useBreakpoint();
  // The 5-button action cluster (Export SI, Export exceptions, Save all,
  // Delete draft, Lock SI) needs ~900 px to lay out on one row. Below that
  // we force the cluster to full-width via `flexBasis: '100%'` so its own
  // `flexWrap` folds the buttons into a 2-column stack instead of letting
  // Lock SI overflow off the right edge.
  const stackActions = width < 900;
  const actionStyle: ViewStyle = stackActions
    ? { flexDirection: 'row', gap: 8, flexWrap: 'wrap', flexBasis: '100%' }
    : { flexDirection: 'row', gap: 8, flexWrap: 'wrap' };

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

  return (
    <Screen>
      <BackLink guard={guardNav} />

      {/* Header + action cluster. Buttons carry (1) a leading icon so they
          are scannable at a glance, (2) a hover tooltip so intent is clear
          before clicking, and (3) a dirty-state shape for Save all — the
          primary CTA rings when there are unsaved edits. */}
      <PageHeader
        title={data.store.name}
        subtitle={`${data.store.code} · ${data.store.warehouse}`}
        titleBadge={<StatusChip tone={editing ? 'draft' : 'locked'} />}
        action={
          <View style={actionStyle}>
            <Button
              label="Export SI"
              variant="secondary"
              leading={<IconDownload size={16} color={c.fg} />}
              tooltip="Download every line of this SI as a CSV."
              onPress={() => exportSi(data)}
            />
            <Button
              label="Export exceptions"
              variant="secondary"
              leading={<IconFileText size={16} color={c.fg} />}
              tooltip={
                data.exceptions.length === 0
                  ? 'No exceptions to export.'
                  : 'Download only the lines with data issues.'
              }
              onPress={() => exportExceptions(data.exceptions, data.store.code)}
              disabled={data.exceptions.length === 0}
            />
            {editing && (
              <>
                {/* Save all lives in the floating bar that appears whenever
                    there are unsaved edits — no need to duplicate it here. */}
                <Button
                  label="Delete draft"
                  variant="danger"
                  leading={<IconTrash size={16} color={c.rTx} />}
                  tooltip="Remove this draft SI. You can regenerate it later."
                  onPress={() => setConfirmDelete(true)}
                />
                <Button
                  label="Lock SI"
                  variant="primary"
                  leading={<IconLock size={16} color="#ffffff" />}
                  tooltip={
                    dirtyCount
                      ? 'Save your edits before locking. Locked SIs cannot be changed.'
                      : 'Finalise this SI. Quantities become read-only after locking.'
                  }
                  onPress={() => setConfirmLock(true)}
                  disabled={dirtyCount > 0}
                />
              </>
            )}
          </View>
        }
      />

      {/* Meta strip — three grouped cards mapping to the operator's review
          flow: TIMELINE (when does this ship?), CONFIG (what levers drove
          the math?), SOURCE (who made it and why?). Status sits with the
          title above so it never competes with these for attention. */}
      <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
        <TimelineCard runDate={data.runDate} deliveryDate={data.deliveryDate} />
        <ConfigCard bufferDays={data.bufferDays} leadTimeDays={data.leadTimeDays} />
        <SourceCard origin={data.origin} trigger={data.trigger} />
      </View>

      {/* Lines table */}
      <SectionCard
        title="Order lines"
        subtitle={editing
          ? `Edit case quantities inline. Nothing is saved until you tap "Save all".`
          : `Read-only. This SI is locked. Regenerate to make changes.`}
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
          body="Locking finalises the SI. Quantities become read-only and the draft cannot be deleted. Nothing is auto-posted to Rista. You still submit the indent manually."
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

      <HelpPopover
        title="SI detail"
        sections={[
          {
            heading: 'What you can do here',
            body: editing
              ? 'Adjust any line quantity you disagree with, then Save all. Lock when the order is final. Delete to remove the draft.'
              : 'This SI is locked, so quantities are read-only. Export to CSV if you need to share it. To make changes, regenerate the SI first.',
          },
          {
            heading: 'Draft vs Locked',
            body: 'The chip next to the store name shows the state. Draft means you can still edit quantities, save changes, or delete the SI and regenerate. Locked is final: quantities are frozen and the SI cannot be deleted. Locking is one-way, so make sure everything looks right first.',
          },
          {
            heading: 'Timeline card',
            body: 'Runs is the date this SI was computed for. Delivers is when stock is expected to reach the store. The days-between number is the wait once you submit the indent in Rista.',
          },
          {
            heading: 'Engine config card',
            body: 'Safety buffer is the extra days of stock the engine keeps on top of forecast demand, so a busy weekend doesn\'t stock out. Lead time is how long the DC needs to pick, pack, and dispatch. Both come from your store\'s standing config; if either looks wrong for this SI, flag it to ops instead of overriding line-by-line.',
          },
          {
            heading: 'Source card',
            body: 'Auto means the nightly 9 pm engine created this SI on schedule. Manual means a person generated it, usually for a store the cron missed or for a same-day catch-up. Catch-up runs, admin backfills, and manual generations all produce identical SIs; only the audit trail differs.',
          },
          {
            heading: 'Suggested vs Final',
            body: 'Suggested is what the engine calculated. Final is what will actually be ordered. Type in the Final box to override. The row turns yellow so you can see what you changed. A note under the input shows the original suggestion.',
          },
          {
            heading: 'Case, not unit',
            body: 'Every quantity in the order lines is in CASES, not individual units. One case of buns is not one bun. If you\'re unsure how many units are in a case for a given SKU, check with the DC before overriding.',
          },
          {
            heading: 'Exceptions',
            body: 'Red "Has exception" text under an item means the engine couldn\'t compute a quantity for that line, usually because a SKU is unmapped or missing conversion data. Scroll to the Exceptions panel at the bottom for the reason. The line is still editable; just don\'t save a blind number.',
          },
          {
            heading: 'Flags',
            body: 'The "bun" chip means it\'s a bun SKU (mixed-bun logic applies). "trimmed" means the DC trims the item before dispatch, so you receive a smaller physical quantity than the case count implies. Both flags are labels, not toggles.',
          },
          {
            heading: 'Delete draft vs Lock SI',
            body: 'Delete draft removes the SI entirely; you can regenerate it later. Lock SI freezes the current quantities and marks the SI final. Locking is permanent, so lock only when you\'re ready to submit the indent in Rista.',
          },
          {
            heading: 'Order of steps',
            numbered: true,
            body: [
              'Scan the Exceptions panel first if any lines have issues.',
              'Adjust line quantities in the Final column.',
              'Tap Save all when everything looks right.',
              'Tap Lock SI to finalise. You cannot edit a locked SI.',
              'Rista is not auto-posted. A human still submits the indent in Rista.',
            ],
          },
        ]}
      />

      {/* Bottom spacer — pushes the last row above the floating unsaved-
          changes bar so the bar never sits on top of an editable input. */}
      {focused && editing && dirtyCount > 0 && <View style={{ height: UNSAVED_BAR_FOOTER_PAD }} />}

      {/* Route-focus gate — expo-router keeps the Detail screen mounted for
          the fade transition, so the portaled bar would linger on top of
          the next page. `focused` drops count to 0 the moment the URL
          leaves this SI, which unmounts the portal contents cleanly. */}
      <UnsavedChangesBar
        count={focused && editing ? dirtyCount : 0}
        onSave={() => saveMut.mutate()}
        onUndo={() => setPending({})}
        saving={saveMut.isPending}
      />
    </Screen>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

// ─── Meta-strip cards ──────────────────────────────────────────────────────
// The old 7-tile row treated every field as equally important. In practice
// an operator scans left→right asking three questions in this order:
//   1. When does this ship?         → TimelineCard
//   2. What levers drove the math?  → ConfigCard
//   3. Who made it and why?         → SourceCard
// Grouping by intent means less visual chrome and stronger information
// scent, and each card can add tiny context (e.g. the arrow between run and
// delivery visualising the wait) that separate tiles couldn't.

function MetaCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{
      flex: 1, minWidth: 220,
      borderWidth: 1, borderColor: c.border, borderRadius: radius.md,
      backgroundColor: c.card, padding: 14, gap: 10,
    }}>
      <MicroLabel>{title}</MicroLabel>
      {children}
    </View>
  );
}

function TimelineCard({ runDate, deliveryDate }: { runDate: string; deliveryDate: string }) {
  const { c } = useTheme();
  const days = Math.max(
    0,
    Math.round(
      (new Date(deliveryDate).getTime() - new Date(runDate).getTime()) / 86_400_000,
    ),
  );
  return (
    <MetaCard title="Timeline">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View>
          <Body wt="semibold">{shortDayYear(runDate)}</Body>
          <Body mut size="caption">Runs</Body>
        </View>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border, alignSelf: 'center' }} />
        <View style={{ alignItems: 'flex-end' }}>
          <Body wt="semibold">{shortDayYear(deliveryDate)}</Body>
          <Body mut size="caption">Delivers</Body>
        </View>
      </View>
      <Body mut size="caption">{days === 1 ? '1 day' : `${days} days`} between run and delivery.</Body>
    </MetaCard>
  );
}

function ConfigCard({ bufferDays, leadTimeDays }: { bufferDays: number; leadTimeDays: number }) {
  return (
    <MetaCard title="Engine config">
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <View style={{ flex: 1 }}>
          <Body size="h3" wt="bold" numeric>{bufferDays}d</Body>
          <Body mut size="caption">Safety buffer</Body>
        </View>
        <View style={{ flex: 1 }}>
          <Body size="h3" wt="bold" numeric>{leadTimeDays}d</Body>
          <Body mut size="caption">Lead time</Body>
        </View>
      </View>
      <Body mut size="caption">Buffer covers demand spikes. Lead time is the DC turnaround.</Body>
    </MetaCard>
  );
}

// Human-readable trigger labels. Verbatim `trigger` values from the API are
// snake_case enums useful for filtering; users need plain English.
function triggerLabel(t: SiDetail['trigger']): string {
  switch (t) {
    case 'daily_cron': return 'Nightly 9 pm run';
    case 'catch_up': return 'Catch-up run';
    case 'manual': return 'Manual generation';
    case 'admin_backfill': return 'Admin backfill';
    default: return t;
  }
}

function SourceCard({ origin, trigger }: { origin: SiDetail['origin']; trigger: SiDetail['trigger'] }) {
  const { c } = useTheme();
  const isManual = origin === 'manual';
  return (
    <MetaCard title="Source">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          backgroundColor: isManual ? c.navActiveBg : c.sBg,
          borderRadius: radius.pill,
          paddingVertical: 3, paddingHorizontal: 10,
          alignSelf: 'flex-start',
        }}>
          {isManual
            ? <IconUser size={13} color={c.red} />
            : <IconClock size={13} color={c.sTx} />}
          <Text style={{
            color: isManual ? c.red : c.sTx,
            fontSize: font.caption,
            fontWeight: weight.semibold as TextStyle['fontWeight'],
            fontFamily,
          }}>{isManual ? 'Manual' : 'Auto'}</Text>
        </View>
        <Body wt="medium">{triggerLabel(trigger)}</Body>
      </View>
      <Body mut size="caption">
        {isManual
          ? 'A person generated this SI directly for the store.'
          : 'The nightly engine created this SI on schedule.'}
      </Body>
    </MetaCard>
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
    <ScrollView
      horizontal
      style={{ width: '100%' }}
      contentContainerStyle={{ minWidth: 780, width: '100%' }}
    >
      <View style={{ minWidth: 780, width: '100%' }}>
        {/* Sticky header on web — matters most on the SI Detail lines table
            (15+ SKUs) so column meanings stay visible while scrolling. Native
            doesn't support `position: sticky`, so we fall back to a regular
            header row there. */}
        <View style={{
          flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
          borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card,
          ...(Platform.OS === 'web' ? { position: 'sticky' as ViewStyle['position'], top: 0, zIndex: 2 } : null),
        }}>
          <Text style={[th, { width: 110 }]}>SKU</Text>
          <Text style={[th, { flex: 1, minWidth: 220 }]}>Item</Text>
          <Text style={[th, { width: 140 }]}>Category</Text>
          <Text style={[th, { width: 110, textAlign: 'right' }]}>Suggested</Text>
          <Text style={[th, { width: 140, textAlign: 'right' }]}>Final (cases)</Text>
          <Text style={[th, { width: 90 }]}>Flags</Text>
        </View>
        {data.lines.map((l) => {
          const pendingVal = pending[l.id];
          const hasPending = Object.prototype.hasOwnProperty.call(pending, l.id);
          const effectiveEdited = hasPending ? pendingVal : l.editedQty;
          const effectiveFinal = effectiveEdited ?? l.suggestedQty;
          const isOverridden = effectiveEdited !== null && effectiveEdited !== undefined && effectiveEdited !== l.suggestedQty;
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
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={{ color: c.fg, fontSize: font.body, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }} numberOfLines={1}>{l.itemName}</Text>
                {hasExc && <Text style={{ color: c.rTx, fontSize: font.caption, marginTop: 2, fontFamily }}>Has exception</Text>}
              </View>
              <Text style={{ width: 140, color: c.mut, fontSize: font.body, fontFamily }} numberOfLines={1}>{l.category}</Text>

              {/* SUGGESTED — the engine's reference number, read at a glance.
                  Full `c.fg` color (not muted) because muted grays disappear
                  against the dark card bg — the number MUST be trusted, not
                  de-emphasized. Role vs FINAL is signaled by chrome: FINAL
                  has an input border, SUGGESTED is plain right-aligned text. */}
              <Text style={{
                width: 110, textAlign: 'right',
                color: c.fg, fontSize: font.body, fontFamily,
                fontVariant: ['tabular-nums'],
                fontWeight: weight.medium as TextStyle['fontWeight'],
              }}>
                {l.suggestedQty}
              </Text>

              {/* FINAL — the number that will actually ship. On editable SIs,
                  it's a full-affordance input PRE-FILLED with the suggested
                  value; overrides tint the input yellow to signal "unsaved
                  change vs system". On locked SIs it's a bold read-only
                  number. This collapses the old suggested/edited/final
                  triple into two clear columns (Retool inventory pattern). */}
              <View style={{ width: 140, alignItems: 'flex-end', gap: 2 }}>
                {editable ? (
                  <>
                    <TextInput
                      value={String(effectiveFinal)}
                      onChangeText={(v) => {
                        // Compute what the input WOULD save as, then compare
                        // to the currently-saved value. If nothing effectively
                        // changes, delete the pending key entirely instead of
                        // storing a phantom entry (this covers both empty-
                        // input and "typed back to suggested" cases).
                        let wouldBeEdited: number | null;
                        if (v.trim() === '') {
                          wouldBeEdited = null;
                        } else {
                          const n = Number(v);
                          if (!Number.isFinite(n) || n < 0) return;
                          const rounded = Math.round(n);
                          wouldBeEdited = rounded === l.suggestedQty ? null : rounded;
                        }
                        if (wouldBeEdited === l.editedQty) {
                          resetLine(l.id);
                        } else {
                          setQty(l.id, wouldBeEdited);
                        }
                      }}
                      onBlur={() => {
                        if (hasPending && pendingVal === l.editedQty) resetLine(l.id);
                      }}
                      keyboardType="numeric"
                      selectTextOnFocus
                      style={{
                        // Explicit width — an unsized <input> on the web falls
                        // back to its ~192px HTML default and spills LEFT into
                        // the SUGGESTED cell, covering the reference number.
                        width: 100, textAlign: 'right',
                        borderWidth: 1.5,
                        borderColor: isOverridden ? c.yTx : c.border,
                        backgroundColor: isOverridden ? c.yBg : c.bg,
                        color: isOverridden ? c.yTx : c.fg,
                        borderRadius: radius.sm,
                        paddingHorizontal: 12, paddingVertical: 8,
                        fontSize: font.body,
                        fontWeight: weight.semibold as TextStyle['fontWeight'],
                        fontFamily, fontVariant: ['tabular-nums'],
                      }}
                    />
                    {isOverridden && (
                      <Text style={{ color: c.mut, fontSize: font.caption, fontFamily, fontVariant: ['tabular-nums'] }}>
                        was {l.suggestedQty}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={{
                    color: c.fg, fontSize: font.body, fontFamily,
                    fontVariant: ['tabular-nums'],
                    fontWeight: weight.bold as TextStyle['fontWeight'],
                  }}>
                    {effectiveFinal}
                  </Text>
                )}
              </View>

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
          ...(Platform.OS === 'web' ? { position: 'sticky' as ViewStyle['position'], top: 0, zIndex: 2 } : null),
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
