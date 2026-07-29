// Submit a Ticket — Zoho-faithful single-page form. Field order verbatim:
//   Section A · Notify others (optional)  → Secondary Contacts (Live layout only)
//   Section B · Ticket details            → Department, Category picker, Priority (Onboarding only)
//   Section C · Tell us what happened     → Subject (required, ≤120 chars), Description (rich text)
//   Section D · Attachments (optional)    → Take photo / Choose file + chip list
//
// The Department picker drives the layout: switching department flips the
// category tree, hides/shows CCs, and toggles the Priority field. `LAYOUTS`
// in ./model owns those rules.

import { useState } from 'react';
import { View, Pressable, TextInput, type ViewStyle, type TextStyle } from 'react-native';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius, weight, font, space } from '../theme/tokens';
import { Body, Button, Screen } from '../components/ui';
import { Breadcrumb } from '../components/Breadcrumb';
import { HelpPopover } from '../components/HelpPopover';
import {
  IconArrowLeft, IconChevronRight, IconSend, IconClose,
  IconAlert, IconCamera, IconPaperclip,
} from '../components/icons';
import type {
  Department, UserTicket, NewTicketDraft,
} from './model';
import {
  DEPARTMENTS, LAYOUTS, ME, validateDraft, fmtAbs,
} from './model';
import { CategoryPicker } from './CategoryPicker';
import { CCField } from './composers';
import { useSetDirty, guardNav } from '../hooks/useUnsavedChangesGuard';

export function NewTicket({
  onCancel, onCreate,
}: {
  onCancel: () => void;
  onCreate: (t: UserTicket) => void;
}) {
  const { c } = useTheme();
  const [department, setDepartment] = useState<Department>(DEPARTMENTS[0]!);
  const layout = LAYOUTS[department];

  const [cc, setCc] = useState<string[]>([]);
  const [categoryPath, setCategoryPath] = useState('');
  const [priority, setPriority] = useState<string>(''); // '' = -None-
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Anything typed / picked counts as unsaved work. Department alone doesn't
  // count (it starts pre-filled with the first option and switching is a
  // free action). Register with the module-level guard so the same confirm
  // dialog the SI Portal uses fires on nav-away, browser refresh, or Cancel.
  const isDirty =
    subject.trim().length > 0 ||
    description.trim().length > 0 ||
    !!categoryPath ||
    !!priority ||
    cc.length > 0 ||
    attachments.length > 0;
  useSetDirty(isDirty, 'You have a ticket in progress. Discard it?');
  const cancelWithGuard = () => guardNav(onCancel);

  const onDepartmentChange = (next: Department) => {
    if (next === department) return;
    setDepartment(next);
    setCategoryPath('');
    setPriority('');
    if (!LAYOUTS[next].hasCCs) setCc([]);
    setErrors({});
  };

  const draft: NewTicketDraft = {
    department,
    categoryPath,
    priority,
    subject,
    description,
    cc: layout.hasCCs ? cc : [],
    attachments,
  };

  const submit = () => {
    const errs = validateDraft(draft, layout);
    setErrors(Object.fromEntries(errs.map((e) => [e.field, e.message])));
    if (errs.length) return;

    // Backend swap point — same shape as /api/v1/tickets would take.
    const now = new Date();
    const id = `${68000 + Math.floor((Date.now() % 999))}`;
    onCreate({
      id,
      subject: draft.subject.trim(),
      description: draft.description.trim(),
      status: 'open',
      department: draft.department,
      channel: 'Web',
      complaintCategoryPath: draft.categoryPath,
      assignedTo: 'unassigned',
      raisedByMe: true,
      ccMe: false,
      secondaryContacts: draft.cc,
      emailRequester: ME.email,
      createdAbs: fmtAbs(now),
      createdAt: now.getTime(),
      lastThreadAt: now.getTime(),
      overdueAt: null,
      replies: [],
    });
  };

  return (
    <Screen>
      <Breadcrumb parent={{ label: 'Support', href: '/support' }} current="Submit a ticket" />

      <View>
        <Text style={{ color: c.fg, fontSize: font.h1, fontWeight: weight.bold as TextStyle['fontWeight'], fontFamily, lineHeight: 34 }}>
          Submit a ticket
        </Text>
        <Text style={{ color: c.mut, fontSize: 14, fontFamily, marginTop: 4 }}>
          Fields marked Required must be filled before you can submit.
        </Text>
      </View>

      <View style={{ maxWidth: 640, gap: 16 }}>
        {/* Section A · Notify others */}
        {layout.hasCCs && (
          <FormSection title="Notify others (optional)">
            <Field
              label="Secondary Contacts (CCs)"
              hint="People who'll receive updates about this ticket, like your area manager."
            >
              <CCField value={cc} onChange={setCc} />
            </Field>
          </FormSection>
        )}

        {/* Section B · Ticket details */}
        <FormSection title="Ticket details">
          <Field label="Department">
            <DepartmentPicker value={department} onChange={onDepartmentChange} />
          </Field>

          <Field
            label={layout.categoryLabel}
            required
            hint="Pick the closest match: corporate will route it to the right team."
            error={errors.categoryPath}
          >
            <CategoryPicker
              value={categoryPath}
              onChange={(v) => { setCategoryPath(v); setErrors((p) => ({ ...p, categoryPath: '' })); }}
              tree={layout.categories}
            />
          </Field>

          {layout.hasPriority && (
            <Field
              label={layout.priorityLabel!}
              hint="How urgent is it? Be honest: corporate adjusts if needed."
            >
              <PriorityPicker value={priority} onChange={setPriority} options={layout.priorityOptions ?? []} />
            </Field>
          )}
        </FormSection>

        {/* Section C · Tell us what happened */}
        <FormSection title="Tell us what happened">
          <Field
            label="Subject"
            required
            counter={<CharCounter value={subject} max={120} />}
            error={errors.subject}
          >
            <TextInput
              value={subject}
              onChangeText={(v) => { setSubject(v.slice(0, 120)); if (errors.subject) setErrors((p) => ({ ...p, subject: '' })); }}
              placeholder="One-line summary of the issue"
              placeholderTextColor={c.mut}
              maxLength={120}
              style={{
                padding: 12, borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
                color: c.fg, fontSize: 14, fontFamily,
                backgroundColor: c.bg,
              } as any}
            />
          </Field>

          <Field
            label="Description"
            hint="What happened, when, what you tried. The more detail the faster the fix."
            error={errors.description}
          >
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Type here…"
              placeholderTextColor={c.mut}
              multiline
              style={{
                minHeight: 120,
                padding: 12, borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
                color: c.fg, fontSize: 14, fontFamily,
                backgroundColor: c.bg,
                textAlignVertical: 'top',
              } as any}
            />
          </Field>
        </FormSection>

        {/* Section D · Attachments */}
        <FormSection title="Attachments (optional)">
          <Field
            label="Attach a file"
            hint="Photos help corporate fix it faster. Up to 40 MB per file."
          >
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <AttachTile
                icon={<IconCamera size={18} color={c.red} />}
                label="Take photo"
                onPress={() => setAttachments([...attachments, `photo-${attachments.length + 1}.jpg`])}
              />
              <AttachTile
                icon={<IconPaperclip size={18} color={c.red} />}
                label="Choose file"
                onPress={() => setAttachments([...attachments, `file-${attachments.length + 1}.pdf`])}
              />
            </View>
            {attachments.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {attachments.map((f) => (
                  <View key={f} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    paddingHorizontal: 8, paddingVertical: 2,
                    backgroundColor: c.muted, borderColor: c.border, borderWidth: 1, borderRadius: 4,
                  }}>
                    <IconPaperclip size={11} color={c.mut} />
                    <Text style={{ color: c.fg, fontSize: 12, fontFamily }}>{f}</Text>
                    <Pressable onPress={() => setAttachments(attachments.filter((x) => x !== f))} accessibilityLabel={`Remove ${f}`} style={{ padding: 2 }}>
                      <IconClose size={11} color={c.mut} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Field>
        </FormSection>

        {/* Submit bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <Button
            label="Submit"
            variant="primary"
            leading={<IconSend size={14} color="#fff" />}
            onPress={submit}
          />
          <Button label="Discard" variant="secondary" onPress={cancelWithGuard} />
        </View>
      </View>

      <HelpPopover
        title="Submit a ticket"
        sections={[
          {
            heading: 'Which department?',
            body: [
              'BurgerSingh — Live Stores: everything after the store is open (POS, supply, maintenance, marketing, etc.).',
              'BurgerSingh — Onboarding Stores: for stores still being set up (licences, company formation, initial supply chain).',
              'Switching department changes the category list and form fields to match.',
            ],
          },
          {
            heading: 'Pick a Category',
            body: 'The Category field is REQUIRED — HQ uses it to route the ticket to the right team. Search inside the picker if you know the name, or drill down through parent categories. Pick the closest match; HQ will re-route if needed.',
          },
          {
            heading: 'Priority (Onboarding only)',
            body: 'Onboarding tickets have a Priority chip — Urgent / High / Medium. Be honest; HQ adjusts if the priority does not match the impact.',
          },
          {
            heading: 'Subject + Description',
            body: 'Subject is a one-line summary (120 chars max). Description is the story — what happened, when, what you tried. The more detail here, the faster the fix.',
          },
          {
            heading: 'Attachments',
            body: 'Photos help HQ diagnose faster. Take photo uses the device camera; Choose file picks from local storage. Up to 40 MB per file.',
          },
          {
            heading: 'CCs (Live Stores only)',
            body: 'Secondary Contacts (CCs) receive every reply on this ticket. Add your area manager if they need visibility.',
          },
        ]}
      />
    </Screen>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────
function Field({
  label, required, hint, counter, error, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  counter?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <Text style={{ color: c.fg, fontSize: 13, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>{label}</Text>
          {required && (
            <View style={{
              paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4,
              backgroundColor: c.rBg,
            }}>
              <Text style={{ color: c.rTx, fontSize: 10, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                Required
              </Text>
            </View>
          )}
        </View>
        {counter}
      </View>
      {hint && <Text style={{ color: c.mut, fontSize: 12, fontFamily, lineHeight: 16 }}>{hint}</Text>}
      <View>{children}</View>
      {error && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
          <IconAlert size={12} color={c.rTx} />
          <Text style={{ color: c.rTx, fontSize: 12, fontFamily }}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ─── FormSection ──────────────────────────────────────────────────────
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{
      padding: 16,
      backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
      gap: 16,
    }}>
      <Text style={{
        color: c.mut, fontSize: 11,
        fontWeight: weight.semibold as TextStyle['fontWeight'],
        letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
      }}>{title}</Text>
      {children}
    </View>
  );
}

// ─── DepartmentPicker (simple chip switcher) ──────────────────────────
function DepartmentPicker({
  value, onChange,
}: {
  value: Department; onChange: (v: Department) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {DEPARTMENTS.map((d) => {
        const active = d === value;
        return (
          <Pressable
            key={d}
            onPress={() => onChange(d)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={({ hovered }) => ({
              paddingHorizontal: 12, paddingVertical: 8,
              borderColor: active ? c.red : c.border, borderWidth: 1, borderRadius: 999,
              backgroundColor: active ? c.navActiveBg : (hovered as boolean) ? c.accent : 'transparent',
            } as ViewStyle)}
          >
            <Text style={{
              color: active ? c.red : c.fg,
              fontSize: 12,
              fontWeight: (active ? weight.semibold : weight.medium) as TextStyle['fontWeight'],
              fontFamily,
            }}>{d}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── PriorityPicker ───────────────────────────────────────────────────
function PriorityPicker({
  value, onChange, options,
}: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {(['', ...options]).map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt || 'none'}
            onPress={() => onChange(opt)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={({ hovered }) => ({
              paddingHorizontal: 12, paddingVertical: 6,
              borderColor: active ? c.red : c.border, borderWidth: 1, borderRadius: 999,
              backgroundColor: active ? c.navActiveBg : (hovered as boolean) ? c.accent : 'transparent',
            } as ViewStyle)}
          >
            <Text style={{
              color: active ? c.red : c.fg,
              fontSize: 12,
              fontWeight: (active ? weight.semibold : weight.medium) as TextStyle['fontWeight'],
              fontFamily,
            }}>{opt || '-None-'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── AttachTile ───────────────────────────────────────────────────────
function AttachTile({
  icon, label, onPress,
}: {
  icon: React.ReactNode; label: string; onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ hovered }) => ({
        flex: 1, minWidth: 0,
        padding: 14, gap: 6,
        alignItems: 'center', justifyContent: 'center',
        borderStyle: 'dashed', borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
        backgroundColor: (hovered as boolean) ? c.accent : c.card,
      } as ViewStyle)}
    >
      {icon}
      <Text style={{ color: c.fg, fontSize: 12, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>{label}</Text>
    </Pressable>
  );
}

// ─── CharCounter ──────────────────────────────────────────────────────
function CharCounter({ value, max }: { value: string; max: number }) {
  const { c } = useTheme();
  if (value.length === 0) return null;
  const ratio = value.length / max;
  const tone =
    ratio >= 1     ? c.rTx :
    ratio >= 0.85  ? c.yTx :
                     c.mut;
  return (
    <Text style={{
      color: tone, fontSize: 11, fontFamily,
      fontVariant: ['tabular-nums'],
      fontWeight: ratio >= 1 ? (weight.semibold as TextStyle['fontWeight']) : (weight.regular as TextStyle['fontWeight']),
    }}>
      {value.length} / {max}
    </Text>
  );
}
