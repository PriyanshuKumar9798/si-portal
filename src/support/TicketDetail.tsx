// Ticket Detail — the Zoho-faithful thread view. Two-column desktop
// (thread on the left, Ticket Properties + Ticket Information on the right).
// On phones/tablets, the sidebar drops beneath the thread.
//
// Additive polish above the verbatim Zoho status pill:
//   • A plain-language banner that translates status/overdue/awaiting into
//     ONE sentence.
//   • A "Corporate replied · your turn" cue when the last reply is from HQ.
//
// Reply on a closed ticket reopens it (Zoho parity). Comment never reopens.

import { useState } from 'react';
import { View, Pressable, ScrollView, type ViewStyle, type TextStyle } from 'react-native';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius, weight, font } from '../theme/tokens';
import { Body, Button, Screen, useBreakpoint } from '../components/ui';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  IconArrowLeft, IconChevronRight, IconChevronDown,
  IconClock, IconSend, IconMessageSquare, IconMore,
  IconCheckCircle, IconExternalLink, IconPrinter,
} from '../components/icons';
import type { Reply, UserTicket } from './model';
import {
  ME, NOW, channelIcon, relTime, isOverdueOf,
} from './model';
import { ReplyComposer, CommentComposer } from './composers';
import { PropertiesPanel } from './PropertiesPanel';
import { ShowOriginalModal } from './ShowOriginalModal';
import { HelpPopover } from '../components/HelpPopover';

// Status → chip + banner config. Mirrors STATUS_CFG from Franchisee Support.
function statusMeta(status: UserTicket['status'], c: any) {
  switch (status) {
    case 'open':
      return {
        label: 'Open',
        chipBg: c.bBg, chipTx: c.bTx, chipBorder: c.bBorder,
        banner: "We're on it · corporate will reach out soon",
        bannerBg: c.bBg, bannerTx: c.bTx, bannerBorder: c.bBorder,
      };
    case 'on-hold':
      return {
        label: 'On Hold',
        chipBg: c.yBg, chipTx: c.yTx, chipBorder: c.yTx,
        banner: "Paused · corporate is waiting on something. We'll update you.",
        bannerBg: c.yBg, bannerTx: c.yTx, bannerBorder: c.yTx,
      };
    case 'closed':
      return {
        label: 'Closed',
        chipBg: c.gBg, chipTx: c.gTx, chipBorder: c.gTx,
        banner: 'Done. Reply below if it happened again.',
        bannerBg: c.gBg, bannerTx: c.gTx, bannerBorder: c.gTx,
      };
  }
}

// ─── Root ─────────────────────────────────────────────────────────────

export function TicketDetail({
  ticket, onBack, onReply, onComment, onClose, onPatchProperties,
}: {
  ticket: UserTicket;
  onBack: () => void;
  onReply: (r: Reply) => void;
  onComment: (r: Reply) => void;
  onClose: () => void;
  onPatchProperties: (p: Partial<UserTicket>) => void;
}) {
  const { c } = useTheme();
  const { width } = useBreakpoint();
  const twoCol = width >= 1024;
  const [mode, setMode] = useState<'idle' | 'reply' | 'comment'>('idle');
  const [showOriginal, setShowOriginal] = useState<{ reply: Reply | null } | null>(null);
  const meta = statusMeta(ticket.status, c);
  const overdue = isOverdueOf(ticket);
  const lastReply = ticket.replies[ticket.replies.length - 1];
  const awaitingYou = ticket.status === 'open' && lastReply && lastReply.from === 'Corporate';

  // Plain-language banner — the additive-polish sentence above the Zoho pill.
  const banner = overdue
    ? { text: "This ticket is overdue · corporate hasn't replied in their target window.", bg: c.rBg, tx: c.rTx, border: c.rTx }
    : awaitingYou
      ? { text: 'Corporate replied — your turn to respond.', bg: c.rBg, tx: c.rTx, border: c.rTx }
      : { text: meta.banner, bg: meta.bannerBg, tx: meta.bannerTx, border: meta.bannerBorder };

  return (
    <Screen>
      <Breadcrumb parent={{ label: 'Support', onPress: onBack }} current={`Ticket #${ticket.id}`} />

      <View style={{ flexDirection: twoCol ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        {/* Left column — thread */}
        <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
          {/* Header block */}
          <View>
            <Text style={{ color: c.fg, fontSize: font.h2, fontWeight: weight.bold as TextStyle['fontWeight'], fontFamily, lineHeight: 30 }}>
              {ticket.subject}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <Text style={{ color: c.mut, fontSize: 12, fontFamily, fontVariant: ['tabular-nums'] }}>{ticket.createdAbs}</Text>
              <Text style={{ color: c.mut, fontSize: 12, fontFamily, opacity: 0.5 }}>·</Text>
              <View style={{
                paddingHorizontal: 8, paddingVertical: 2,
                borderRadius: 4,
                backgroundColor: meta.chipBg, borderColor: meta.chipBorder, borderWidth: 1,
              }}>
                <Text style={{ color: meta.chipTx, fontSize: 11, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
                  {meta.label}
                </Text>
              </View>
              {overdue && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <IconClock size={12} color={c.rTx} />
                  <Text style={{ color: c.rTx, fontSize: 12, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>Overdue</Text>
                </View>
              )}
            </View>

            {/* Plain-language banner */}
            <View style={{
              marginTop: 12,
              paddingHorizontal: 12, paddingVertical: 8,
              backgroundColor: banner.bg, borderColor: banner.border, borderWidth: 1, borderRadius: radius.sm,
            }}>
              <Text style={{ color: banner.tx, fontSize: 12, fontFamily, lineHeight: 18 }}>{banner.text}</Text>
            </View>

            {/* Reply + Comment buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable
                onPress={() => setMode('reply')}
                accessibilityLabel="Reply to this ticket"
                style={({ hovered }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 12, paddingVertical: 8,
                  minHeight: 40,
                  borderColor: mode === 'reply' ? c.redSolid : c.border, borderWidth: 1, borderRadius: radius.md,
                  backgroundColor: mode === 'reply' ? c.navActiveBg : (hovered as boolean) ? c.accent : c.card,
                } as ViewStyle)}
              >
                <IconSend size={13} color={mode === 'reply' ? c.red : c.fg} />
                <Text style={{ color: mode === 'reply' ? c.red : c.fg, fontSize: 12, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
                  Reply
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('comment')}
                accessibilityLabel="Add an internal comment"
                style={({ hovered }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 12, paddingVertical: 8,
                  minHeight: 40,
                  borderColor: mode === 'comment' ? c.yTx : c.border, borderWidth: 1, borderRadius: radius.md,
                  backgroundColor: mode === 'comment' ? c.yBg : (hovered as boolean) ? c.accent : c.card,
                } as ViewStyle)}
              >
                <IconMessageSquare size={13} color={mode === 'comment' ? c.yTx : c.fg} />
                <Text style={{ color: mode === 'comment' ? c.yTx : c.fg, fontSize: 12, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
                  Comment
                </Text>
              </Pressable>
            </View>
          </View>

          {mode === 'reply' && (
            <ReplyComposer
              ticket={ticket}
              onCancel={() => setMode('idle')}
              onSend={(r) => { onReply(r); setMode('idle'); }}
            />
          )}
          {mode === 'comment' && (
            <CommentComposer
              onCancel={() => setMode('idle')}
              onSend={(r) => { onComment(r); setMode('idle'); }}
            />
          )}

          {/* Thread */}
          <View style={{
            padding: 16,
            backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
          }}>
            <Text style={{
              color: c.mut, fontSize: 11,
              fontWeight: weight.semibold as TextStyle['fontWeight'],
              letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
              marginBottom: 12,
            }}>
              Conversation · {1 + ticket.replies.length} message{ticket.replies.length === 0 ? '' : 's'}
            </Text>
            <ThreadMessage
              from="You"
              displayName={ME.displayName}
              channel={ticket.channel}
              whenAbs={ticket.createdAbs}
              whenRel={relTime(ticket.createdAt)}
              text={ticket.description}
              isOriginal
              onShowOriginal={() => setShowOriginal({ reply: null })}
              onReplyRequest={() => setMode('reply')}
            />
            {ticket.replies.map((r, i) => (
              <View key={i} style={{ borderTopColor: c.border, borderTopWidth: 1, paddingTop: 16, marginTop: 16 }}>
                <ThreadMessage
                  from={r.from}
                  displayName={r.from === 'You' ? ME.displayName : (r.authorName ?? 'Corporate')}
                  channel={r.channel}
                  whenAbs={r.whenAbs}
                  whenRel={r.whenRel}
                  text={r.text}
                  draftBadge={r.draftBadge}
                  onShowOriginal={() => setShowOriginal({ reply: r })}
                  onReplyRequest={() => setMode('reply')}
                />
              </View>
            ))}
          </View>

          {/* Close ticket CTA */}
          {ticket.status !== 'closed' && (
            <Button
              label="Close this ticket — issue resolved"
              variant="secondary"
              fullWidth
              leading={<IconCheckCircle size={14} color={c.gTx} />}
              onPress={onClose}
            />
          )}
        </View>

        {/* Right column — Properties + Information sidebar */}
        <View style={{ width: twoCol ? 280 : ('100%' as unknown as number) }}>
          <PropertiesPanel ticket={ticket} onPatch={onPatchProperties} />
        </View>
      </View>

      {showOriginal !== null && (
        <ShowOriginalModal
          ticket={ticket}
          reply={showOriginal.reply}
          onClose={() => setShowOriginal(null)}
        />
      )}

      <HelpPopover
        title="Ticket detail"
        sections={[
          {
            heading: 'The banner above the pill',
            body: 'Green means HQ is on it. Yellow means paused — HQ is waiting on something. Red means overdue or your turn. The pill is Zoho\'s raw status; the banner translates it.',
          },
          {
            heading: 'Reply vs Comment',
            body: [
              'Reply — visible to HQ, becomes part of the thread, and REOPENS a closed ticket.',
              'Comment — internal note tied to this thread. Does not reopen. Use it to log a step you tried before HQ responded.',
            ],
          },
          {
            heading: 'Closing a ticket',
            body: 'Use "Close this ticket — issue resolved" at the bottom of the thread when the fix has landed. Replying later reopens the same ticket instead of raising a new one.',
          },
          {
            heading: 'Ticket Properties (right side)',
            body: 'Ticket Id, status, assignee, and channel are read-only. Category and Secondary Contacts (CCs) can be edited — click "Edit" to change and Save.',
          },
          {
            heading: 'Show Original',
            body: 'Every message has a ⋯ menu with "Show Original" — the raw email-style headers (From/To/Subject/Date). Useful when forwarding to a vendor or checking a timestamp.',
          },
        ]}
      />
    </Screen>
  );
}

// ─── ThreadMessage ────────────────────────────────────────────────────

function ThreadMessage({
  from, displayName, channel, whenAbs, whenRel, text, isOriginal, draftBadge,
  onShowOriginal, onReplyRequest,
}: {
  from: 'You' | 'Corporate';
  displayName: string;
  channel: UserTicket['channel'];
  whenAbs: string;
  whenRel: string;
  text: string;
  isOriginal?: boolean;
  draftBadge?: Reply['draftBadge'];
  onShowOriginal: () => void;
  onReplyRequest: () => void;
}) {
  const { c } = useTheme();
  const ChIcon = channelIcon(channel);
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = displayName.split(/[\s()]+/).filter(Boolean).map((p) => p[0]!.toUpperCase()).slice(0, 2).join('');
  const avatarBg = from === 'You' ? c.redSolid : avatarBgHash(displayName);
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{
        width: 32, height: 32, borderRadius: 999,
        backgroundColor: avatarBg,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: weight.bold as TextStyle['fontWeight'], fontFamily }}>
          {initials || 'U'}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ color: c.fg, fontSize: font.body, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
            {displayName}
          </Text>
          {isOriginal && (
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: c.muted }}>
              <Text style={{ color: c.mut, fontSize: 11, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
                Opened
              </Text>
            </View>
          )}
          {draftBadge && (
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: c.yBg }}>
              <Text style={{ color: c.yTx, fontSize: 11, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
                {draftBadge}
              </Text>
            </View>
          )}
          <Text style={{ color: c.mut, fontSize: 12, fontFamily, fontVariant: ['tabular-nums'] }}>{whenRel}</Text>
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ChIcon size={13} color={c.mut} />
            <View style={{ position: 'relative' }}>
              <Pressable
                onPress={() => setMenuOpen((v) => !v)}
                accessibilityLabel="Message options"
                style={({ hovered }) => ({
                  padding: 4, borderRadius: radius.sm,
                  backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
                } as ViewStyle)}
              >
                <IconMore size={13} color={c.mut} />
              </Pressable>
              {menuOpen && (
                <View style={{
                  position: 'absolute', right: 0, top: 26, zIndex: 40,
                  minWidth: 160,
                  backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
                  paddingVertical: 4,
                  shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
                }}>
                  <MenuItem onPress={() => { setMenuOpen(false); onReplyRequest(); }} icon={<IconSend size={12} color={c.mut} />} label="Reply" />
                  <MenuItem onPress={() => { setMenuOpen(false); onShowOriginal(); }} icon={<IconExternalLink size={12} color={c.mut} />} label="Show Original" />
                  <MenuItem onPress={() => { setMenuOpen(false); if (typeof window !== 'undefined') window.print(); }} icon={<IconPrinter size={12} color={c.mut} />} label="Print" />
                </View>
              )}
            </View>
          </View>
        </View>
        <Text style={{ color: c.fg, fontSize: font.body, fontFamily, marginTop: 6, lineHeight: 21 }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function MenuItem({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      style={({ hovered }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
      } as ViewStyle)}
    >
      {icon}
      <Text style={{ color: c.fg, fontSize: 12, fontFamily }}>{label}</Text>
    </Pressable>
  );
}

function avatarBgHash(name: string): string {
  const AVATAR_COLORS = [
    '#dc2626', '#f97316', '#eab308', '#059669', '#2563eb',
    '#9333ea', '#ec4899', '#0d9488', '#4f46e5', '#0891b2',
  ];
  const h = name.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}
