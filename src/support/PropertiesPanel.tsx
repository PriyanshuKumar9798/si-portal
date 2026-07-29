// Ticket Properties + Ticket Information — the right sidebar on the detail
// page. Ports the Zoho-faithful two-card layout from Franchisee Support:
//   Card 1 · Ticket Properties — read-only: Ticket Id, Status, Assigned To, Channel.
//   Card 2 · Ticket Information — editable: Department, Category, Secondary
//            Contacts (CCs), Email. Edit toggles CategoryPicker + CCField.
//
// The category picker (drill-down + search) ships in a later task; until it
// lands, the property panel shows a read-only category string in edit mode.

import { useState } from 'react';
import { View, Pressable, type ViewStyle, type TextStyle } from 'react-native';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius, weight, font } from '../theme/tokens';
import { Button } from '../components/ui';
import {
  IconEdit, IconInbox, IconInfo, IconUsers,
} from '../components/icons';
import { channelIcon, LAYOUTS, avatarBg as avatarBgOf } from './model';
import type { UserTicket } from './model';
import { CCField } from './composers';
import { CategoryPicker } from './CategoryPicker';

// Status → chip tone (matches TicketDetail's statusMeta).
function statusChip(status: UserTicket['status'], c: any) {
  switch (status) {
    case 'open':    return { label: 'Open',    bg: c.bBg, tx: c.bTx, border: c.bBorder };
    case 'on-hold': return { label: 'On Hold', bg: c.yBg, tx: c.yTx, border: c.yTx };
    case 'closed':  return { label: 'Closed',  bg: c.gBg, tx: c.gTx, border: c.gTx };
  }
}

export function PropertiesPanel({
  ticket, onPatch,
}: {
  ticket: UserTicket;
  onPatch: (p: Partial<UserTicket>) => void;
}) {
  const { c } = useTheme();
  const [editing, setEditing] = useState(false);
  const [cc, setCc] = useState<string[]>(ticket.secondaryContacts);
  // Category edit is placeholder until Task 12 wires ComplaintCategoryPicker.
  const [category, setCategory] = useState<string>(ticket.complaintCategoryPath);

  const chip = statusChip(ticket.status, c);
  const ChIcon = channelIcon(ticket.channel);

  const save = () => {
    onPatch({ secondaryContacts: cc, complaintCategoryPath: category });
    setEditing(false);
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Card 1 · Ticket Properties (read-only) */}
      <View style={{
        borderColor: c.border, borderWidth: 1, borderRadius: radius.lg,
        backgroundColor: c.card, overflow: 'hidden',
      }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 14, paddingVertical: 10,
          borderBottomColor: c.border, borderBottomWidth: 1,
          backgroundColor: c.footerBg,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <IconEdit size={12} color={c.mut} />
            <Text style={{
              color: c.mut, fontSize: 11,
              fontWeight: weight.semibold as TextStyle['fontWeight'],
              letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
            }}>
              Ticket Properties
            </Text>
          </View>
          <Pressable onPress={() => setEditing((v) => !v)} accessibilityLabel={editing ? 'Cancel edit' : 'Edit properties'}>
            <Text style={{
              color: c.red, fontSize: 12, fontFamily,
              fontWeight: weight.medium as TextStyle['fontWeight'],
              textDecorationLine: 'underline',
            }}>
              {editing ? 'Cancel' : 'Edit'}
            </Text>
          </Pressable>
        </View>
        <PropRow label="Ticket Id">
          <Text style={{ color: c.fg, fontSize: 13, fontFamily, fontWeight: weight.semibold as TextStyle['fontWeight'], fontVariant: ['tabular-nums'] }}>
            #{ticket.id}
          </Text>
        </PropRow>
        <PropRow label="Status">
          <View style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
            backgroundColor: chip.bg, borderColor: chip.border, borderWidth: 1,
          }}>
            <Text style={{ color: chip.tx, fontSize: 11, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
              {chip.label}
            </Text>
          </View>
        </PropRow>
        <PropRow label="Assigned To">
          {ticket.assignedTo === 'unassigned' ? (
            <Text style={{ color: c.mut, fontSize: 13, fontFamily, fontStyle: 'italic' }}>unassigned</Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{
                width: 20, height: 20, borderRadius: 999,
                backgroundColor: avatarBgOf(ticket.assignedTo),
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: weight.bold as TextStyle['fontWeight'], fontFamily }}>
                  {initialsOf(ticket.assignedTo)}
                </Text>
              </View>
              <Text style={{ color: c.fg, fontSize: 13, fontFamily }}>{ticket.assignedTo}</Text>
            </View>
          )}
        </PropRow>
        <PropRow label="Channel">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ChIcon size={12} color={c.mut} />
            <Text style={{ color: c.fg, fontSize: 13, fontFamily }}>{ticket.channel}</Text>
          </View>
        </PropRow>
      </View>

      {/* Card 2 · Ticket Information */}
      <View style={{
        borderColor: c.border, borderWidth: 1, borderRadius: radius.lg,
        backgroundColor: c.card, overflow: 'hidden',
      }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingHorizontal: 14, paddingVertical: 10,
          borderBottomColor: c.border, borderBottomWidth: 1,
          backgroundColor: c.footerBg,
        }}>
          <IconInbox size={12} color={c.mut} />
          <Text style={{
            color: c.mut, fontSize: 11,
            fontWeight: weight.semibold as TextStyle['fontWeight'],
            letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
          }}>
            Ticket Information
          </Text>
        </View>
        <PropRow label="Department">
          <Text style={{ color: c.fg, fontSize: 13, fontFamily }}>{ticket.department}</Text>
        </PropRow>
        <PropRow label={LAYOUTS[ticket.department].categoryLabel}>
          {editing ? (
            <CategoryPicker
              value={category}
              onChange={setCategory}
              tree={LAYOUTS[ticket.department].categories}
            />
          ) : (
            <Text style={{ color: c.fg, fontSize: 13, fontFamily }}>
              {ticket.complaintCategoryPath || '—'}
            </Text>
          )}
        </PropRow>
        <PropRow
          label={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
              <Text style={{ color: c.mut, fontSize: 12, fontFamily }}>Secondary Contacts (CCs)</Text>
              <InfoTip text="Secondary Contacts (CCs) are additional requesters. They are notified of replies and can track this ticket independently." />
            </View>
          }
        >
          {editing ? (
            <CCField value={cc} onChange={setCc} />
          ) : ticket.secondaryContacts.length === 0 ? (
            <Text style={{ color: c.mut, fontSize: 13, fontFamily, fontStyle: 'italic' }}>No CCs</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {ticket.secondaryContacts.map((s) => (
                <View key={s} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 6, paddingVertical: 2,
                  backgroundColor: c.muted, borderColor: c.border, borderWidth: 1, borderRadius: 4,
                }}>
                  <View style={{
                    width: 16, height: 16, borderRadius: 999,
                    backgroundColor: avatarBgOf(s), alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: weight.bold as TextStyle['fontWeight'], fontFamily }}>
                      {s.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ color: c.fg, fontSize: 12, fontFamily }}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </PropRow>
        <PropRow label="Email">
          <Text style={{ color: c.fg, fontSize: 12, fontFamily }}>{ticket.emailRequester}</Text>
        </PropRow>
        {editing && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingHorizontal: 14, paddingVertical: 10,
            backgroundColor: c.footerBg,
            borderTopColor: c.border, borderTopWidth: 1,
          }}>
            <Button label="Save" variant="primary" onPress={save} />
            <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
          </View>
        )}
      </View>
    </View>
  );
}

function PropRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      paddingHorizontal: 14, paddingVertical: 10,
      borderBottomColor: c.border, borderBottomWidth: 1,
    }}>
      <View style={{ width: 108, flexShrink: 0, paddingTop: 2 }}>
        {typeof label === 'string'
          ? <Text style={{ color: c.mut, fontSize: 12, fontFamily }}>{label}</Text>
          : label}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {children}
      </View>
    </View>
  );
}

function InfoTip({ text }: { text: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View
      // @ts-ignore RN Web hover props
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative' }}
    >
      <View style={{
        width: 14, height: 14, borderRadius: 999,
        borderColor: c.border, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: c.mut, fontSize: 9, fontFamily, fontWeight: weight.semibold as TextStyle['fontWeight'] }}>i</Text>
      </View>
      {open && (
        <View style={{
          position: 'absolute', top: -8, left: 20, zIndex: 50, width: 240,
          padding: 8, backgroundColor: '#0f172a', borderRadius: radius.sm,
        }}>
          <Text style={{ color: '#fff', fontSize: 11, lineHeight: 15, fontFamily }}>{text}</Text>
        </View>
      )}
    </View>
  );
}

function initialsOf(name: string): string {
  return name.split(/[\s()]+/).filter(Boolean).map((p) => p[0]!.toUpperCase()).slice(0, 2).join('') || 'U';
}
