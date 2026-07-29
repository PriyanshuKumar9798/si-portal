// Show Original — a portaled modal that mirrors the email-style "raw
// message" view from Zoho Desk. Header fields (From/To/Subject/Date/Channel/
// Ticket-Id) + a monospaced body. Print + Close actions.
//
// Reached from a message's ⋯ menu in the thread. Rendered outside of the
// scrolled column via ReactDOM.createPortal so nothing above it (headers,
// panels with overflow:hidden) can trap it inside a scrolled region.

import { View, Pressable, ScrollView, type ViewStyle, type TextStyle } from 'react-native';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius, weight, font } from '../theme/tokens';
import { Button } from '../components/ui';
import { IconClose, IconPrinter } from '../components/icons';
import { ME } from './model';
import type { Reply, UserTicket } from './model';

export function ShowOriginalModal({
  ticket, reply, onClose,
}: {
  ticket: UserTicket;
  reply: Reply | null;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const headerFrom = reply
    ? (reply.from === 'You' ? ME.displayName : (reply.authorName ?? 'Corporate'))
    : ME.displayName;
  const text    = reply ? reply.text     : ticket.description;
  const when    = reply ? reply.whenAbs  : ticket.createdAbs;
  const channel = reply ? reply.channel  : ticket.channel;

  const node = (
    <View
      // @ts-ignore RN Web position: fixed
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
        alignItems: 'center', justifyContent: 'center',
        padding: 16, zIndex: 80,
      } as ViewStyle}
    >
      <Pressable
        onPress={onClose}
        accessibilityLabel="Dismiss"
        // @ts-ignore
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
          backgroundColor: 'rgba(0,0,0,0.45)',
        } as ViewStyle}
      />
      <View
        style={{
          width: '100%', maxWidth: 640,
          backgroundColor: c.card, borderColor: c.border, borderWidth: 1,
          borderRadius: radius.lg, overflow: 'hidden',
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 10 },
        }}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingVertical: 10,
          borderBottomColor: c.border, borderBottomWidth: 1,
        }}>
          <Text style={{ color: c.fg, fontSize: 13, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
            Show Original
          </Text>
          <Pressable onPress={onClose} accessibilityLabel="Close" style={{ padding: 6 }}>
            <IconClose size={14} color={c.mut} />
          </Pressable>
        </View>

        {/* Body — email headers + text */}
        <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ padding: 16 }}>
          <View style={{ gap: 4 }}>
            <HdrLine label="From" value={headerFrom} />
            <HdrLine label="To" value={ticket.emailRequester} />
            <HdrLine label="Subject" value={ticket.subject} />
            <HdrLine label="Date" value={when} />
            <HdrLine label="Channel" value={channel} />
            <HdrLine label="Ticket-Id" value={`#${ticket.id}`} />
          </View>
          <View style={{ marginTop: 12, paddingTop: 12, borderTopColor: c.border, borderTopWidth: 1 }}>
            <Text
              style={{
                color: c.fg, fontSize: 12,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                lineHeight: 18,
              } as any}
            >
              {text}
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          paddingHorizontal: 14, paddingVertical: 10,
          borderTopColor: c.border, borderTopWidth: 1,
          backgroundColor: c.footerBg,
        }}>
          <Button
            label="Print"
            variant="secondary"
            leading={<IconPrinter size={13} color={c.fg} />}
            onPress={() => { if (typeof window !== 'undefined') window.print(); }}
          />
          <Button label="Close" variant="primary" onPress={onClose} />
        </View>
      </View>
    </View>
  );

  if (typeof document === 'undefined' || !document.body) return node;
  const { createPortal } = require('react-dom') as { createPortal: (n: any, c: Element) => any };
  return createPortal(node, document.body);
}

function HdrLine({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <Text style={{
        color: c.mut, fontSize: 11,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        width: 72,
      }}>
        {label}:
      </Text>
      <Text
        // @ts-ignore RN Web whiteSpace
        style={{
          flex: 1, color: c.fg, fontSize: 12,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
