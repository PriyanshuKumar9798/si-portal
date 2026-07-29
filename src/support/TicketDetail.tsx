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

import { useRef, useState } from 'react';
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
import { useOutsideClick } from '../hooks/useOutsideClick';

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

          {/* Thread — chat-style: my messages on the right, HQ on the left.
              Bubbles have a tail on their originating side (bottom-left for
              HQ, bottom-right for me) so the direction reads at a glance. */}
          <View style={{
            paddingHorizontal: 16, paddingVertical: 18,
            gap: 14,
            backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
          }}>
            <Text style={{
              color: c.mut, fontSize: 11,
              fontWeight: weight.semibold as TextStyle['fontWeight'],
              letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
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
              <ThreadMessage
                key={i}
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

// ThreadMessage — chat-bubble layout. My messages sit on the right in a
// red-tinted bubble; HQ / Corporate replies sit on the left with an avatar,
// muted bubble, and one asymmetric corner acting as a "tail" pointing at
// the sender. Author label + badges + timestamp are stacked inside/around
// the bubble so the visual weight stays with the message text.
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
  const menuWrapRef = useRef<View | null>(null);
  useOutsideClick(menuWrapRef, menuOpen, () => setMenuOpen(false));
  const mine = from === 'You';
  const initials = displayName.split(/[\s()]+/).filter(Boolean).map((p) => p[0]!.toUpperCase()).slice(0, 2).join('');
  const avatarBg = mine ? c.redSolid : avatarBgHash(displayName);

  // Bubble palette — mine picks up the brand-tinted nav surface so the whole
  // thread reads as one system; HQ side uses the muted card fill.
  const bubbleBg      = mine ? c.navActiveBg : c.muted;
  const bubbleBorder  = mine ? c.chipRedBorder : c.border;
  const bubbleText    = c.fg;
  // Asymmetric bottom corner = the "tail" hint. My bubble has a squared
  // bottom-right; HQ's has a squared bottom-left.
  const bubbleRadius: ViewStyle = mine
    ? { borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 14, borderBottomRightRadius: 4 }
    : { borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 4, borderBottomRightRadius: 14 };

  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: mine ? 'flex-end' : 'flex-start',
      alignItems: 'flex-end',
      gap: 8,
    }}>
      {/* Left avatar — only for HQ side (WhatsApp-style: no self-avatar) */}
      {!mine && (
        <View style={{
          width: 30, height: 30, borderRadius: 999,
          backgroundColor: avatarBg,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 4,
        }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: weight.bold as TextStyle['fontWeight'], fontFamily }}>
            {initials || 'U'}
          </Text>
        </View>
      )}

      {/* Bubble — max 78% so long messages wrap gracefully. Sender name +
          badges sit INSIDE the bubble at the top (WhatsApp group-chat style)
          so the whole message reads as one block. */}
      <View
        style={{
          maxWidth: '78%',
          paddingHorizontal: 12, paddingVertical: 10,
          backgroundColor: bubbleBg,
          borderColor: bubbleBorder, borderWidth: 1,
          ...bubbleRadius,
        } as ViewStyle}
      >
        {/* Sender + badge row — hidden on my side (no self-name in a chat
            you own), kept on HQ side so the reader knows who spoke. */}
        {(!mine || isOriginal || draftBadge) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            {!mine && (
              <Text style={{
                color: avatarBg, fontSize: 12, fontFamily,
                fontWeight: weight.semibold as TextStyle['fontWeight'],
              }}>
                {displayName}
              </Text>
            )}
            {isOriginal && (
              <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: c.accent }}>
                <Text style={{ color: c.mut, fontSize: 10, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  Opened
                </Text>
              </View>
            )}
            {draftBadge && (
              <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: c.yBg }}>
                <Text style={{ color: c.yTx, fontSize: 10, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
                  {draftBadge}
                </Text>
              </View>
            )}
          </View>
        )}
        <Text style={{ color: bubbleText, fontSize: font.body, fontFamily, lineHeight: 21 }}>
          {text}
        </Text>
          {/* Inline footer: channel icon + time (+ options menu) */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
          }}>
            <ChIcon size={11} color={c.mut} />
            <Text
              accessibilityLabel={whenAbs}
              style={{ color: c.mut, fontSize: 11, fontFamily, fontVariant: ['tabular-nums'] }}
            >
              {whenRel}
            </Text>
            <View ref={menuWrapRef} style={{ position: 'relative' }}>
              <Pressable
                onPress={() => setMenuOpen((v) => !v)}
                accessibilityLabel="Message options"
                style={({ hovered }) => ({
                  padding: 3, borderRadius: radius.sm,
                  backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
                } as ViewStyle)}
              >
                <IconMore size={12} color={c.mut} />
              </Pressable>
              {menuOpen && (
                <View style={{
                  position: 'absolute',
                  // Pop the menu on whichever side has more room. For "mine"
                  // bubbles the menu opens leftward so it stays on-screen.
                  right: mine ? 0 : undefined,
                  left: mine ? undefined : 0,
                  top: 22, zIndex: 40,
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
