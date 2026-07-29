// Home — the app's landing route. Two goals in tension: (1) get the user into
// their real work fast, (2) quietly teach them what each module is for so the
// app doesn't feel opaque on the first visit.
//
// Resolution: each live module gets a rich card that IS a switcher AND a
// self-contained micro-explainer. Icon tile + name + one-line purpose +
// three concrete "what you can do here" bullets + explicit CTA. No cheeky
// copy, no gratuitous motion — just a clear look at what lives inside.
// Coming-soon modules sit in a quieter row below.

import { useMemo } from 'react';
import { View, Pressable, type ViewStyle, type TextStyle } from 'react-native';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAuth } from '../../src/auth/AuthContext';
import { fontFamily, radius, weight, font, space } from '../../src/theme/tokens';
import { Body, Screen, PageHeader, Button, useBreakpoint } from '../../src/components/ui';
import {
  IconLayoutDashboard, IconLifeBuoy,
  IconGraduationCap, IconBell, IconChevronRight,
  IconFileText, IconRefresh, IconBulb,
  IconPlus, IconMessageSquare, IconSearch,
  IconAlert, IconLock, IconClock, IconCheckCircle,
  IconSend, IconCalendar, IconArrowRight,
} from '../../src/components/icons';
import { guardNav } from '../../src/hooks/useUnsavedChangesGuard';
import { usePageTitle } from '../../src/hooks/usePageTitle';
import { api } from '../../src/api/client';
import { isOverdueOf, relTime as ticketRelTime } from '../../src/support/model';
import { useTicketStore } from '../../src/support/TicketStore';
import { todayIso, shortDayYear } from '../../src/utils/format';

// ─── Content model ──────────────────────────────────────────────────────

interface Feature {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  text: string;
}
interface LiveModule {
  key: string;
  title: string;
  purpose: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  features: Feature[];
  cta: string;
  href: string;
}
interface SoonModule {
  key: string;
  title: string;
  desc: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}

const LIVE: LiveModule[] = [
  {
    key: 'si',
    title: 'SI Portal',
    purpose: 'Review, generate, and lock suggestive indents for your stores.',
    Icon: IconLayoutDashboard,
    features: [
      { Icon: IconFileText, text: "Review today's indents and flag anything that will run out." },
      { Icon: IconRefresh,  text: 'Generate a fresh SI: pick indent days and stores.' },
      { Icon: IconBulb,     text: 'Burn cycle — see what will run out before the next order.' },
    ],
    cta: 'Open SI Portal',
    href: '/sis',
  },
  {
    key: 'support',
    title: 'Support',
    purpose: 'Raise a ticket with HQ and track every reply in one thread.',
    Icon: IconLifeBuoy,
    features: [
      { Icon: IconPlus,           text: 'Raise a ticket — pick a category, describe, submit.' },
      { Icon: IconMessageSquare,  text: 'Reply in-thread; closed tickets reopen on your reply.' },
      { Icon: IconSearch,         text: '10 built-in views: My open, overdue, CC’d, and more.' },
    ],
    cta: 'Open Support',
    href: '/support',
  },
];

const SOON: SoonModule[] = [
  {
    key: 'academy',
    title: 'Burger Singh Academy',
    desc: 'Training modules, SOPs, and playbooks for every station.',
    Icon: IconGraduationCap,
  },
  {
    key: 'alerts',
    title: 'Central alerts',
    desc: 'Announcements and urgent notices from HQ in one feed.',
    Icon: IconBell,
  },
];

// ─── Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  usePageTitle('Home');
  const { c } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { isPhone, width } = useBreakpoint();

  const firstName = (user?.name ?? user?.email ?? '').split(/[\s@]/)[0];
  const greet = firstName ? `Hi, ${firstName}` : 'Welcome back';

  const twoCol = width >= 900;
  const soonCols = width < 720 ? 1 : 2;
  const gap = 16;

  const go = (href: string) => guardNav(() => router.push(href as never));

  // ── Live counts ────────────────────────────────────────────────────
  // SI counts come from the mock API so refreshing counts stays consistent
  // with what the /sis list shows. Support counts come from the seed
  // (Support has no API yet — the state lives in the /support route).
  const sisQ = useQuery({
    queryKey: ['home-sis', { runDate: todayIso() }],
    queryFn: () => api.listSis({ runDate: todayIso() }),
    staleTime: 60_000,
  });
  const siStats = useMemo(() => {
    const rows = sisQ.data ?? [];
    return {
      draft:  rows.filter((r) => r.status === 'draft').length,
      locked: rows.filter((r) => r.status === 'locked').length,
      total:  rows.length,
    };
  }, [sisQ.data]);

  const { tickets } = useTicketStore();
  const supportStats = useMemo(() => {
    const mine = tickets.filter((t) => t.raisedByMe);
    const open = mine.filter((t) => t.status === 'open').length;
    const awaitingYou = mine.filter((t) => {
      const last = t.replies[t.replies.length - 1];
      return t.status === 'open' && last && last.from === 'Corporate';
    }).length;
    const overdue = mine.filter(isOverdueOf).length;
    return { open, awaitingYou, overdue };
  }, [tickets]);

  return (
    <Screen>
      <PageHeader
        title={greet}
        subtitle="Here's what needs your attention today. Cards below explain what lives inside each module — click any to jump in."
      />

      {/* ── Today's scorecards ─────────────────────────────────────── */}
      <Scorecards
        loading={sisQ.isLoading}
        onOpenSis={() => go('/sis')}
        onOpenSupport={() => go('/support')}
        si={siStats}
        support={supportStats}
      />

      {/* ── Quick actions ─────────────────────────────────────────── */}
      <QuickActions
        onGenerateSi={() => go('/sis/generate')}
        onRaiseTicket={() => go('/add-ticket')}
        onOpenCycle={() => go('/cycle')}
      />

      {/* ── Recent activity + Next indent countdown side-by-side ── */}
      <View style={{ flexDirection: twoCol ? 'row' : 'column', gap }}>
        <View style={{ flex: 2, minWidth: 0 }}>
          <RecentActivity
            tickets={tickets}
            onOpen={(id) => go(`/support?t=${encodeURIComponent(id)}`)}
            sisTotal={siStats.total}
            sisLocked={siStats.locked}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <NextIndentCard onOpen={() => go('/cycle')} />
        </View>
      </View>

      {/* Live modules — two big teaching cards */}
      <View style={{ flexDirection: twoCol ? 'row' : 'column', gap }}>
        {LIVE.map((m) => (
          <LiveCard key={m.key} module={m} onOpen={() => go(m.href)} isPhone={isPhone} />
        ))}
      </View>

      {/* Coming-soon quieter row */}
      <View style={{ gap: 10 }}>
        <Text style={{
          color: c.mut, fontSize: 11,
          fontWeight: weight.semibold as TextStyle['fontWeight'],
          letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
        }}>
          Coming next
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
          {SOON.map((s) => {
            const flexBasis = soonCols === 1 ? '100%' : `calc(50% - ${gap / 2}px)`;
            return (
              <View
                key={s.key}
                // @ts-ignore flexBasis string on web
                style={{
                  flexBasis,
                  minWidth: 0,
                  padding: isPhone ? 14 : 16,
                  gap: 10,
                  borderRadius: radius.lg,
                  borderColor: c.border, borderWidth: 1,
                  backgroundColor: c.card,
                  opacity: 0.7,
                } as ViewStyle}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: c.muted,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <s.Icon size={18} color={c.mut} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Body size="body" wt="semibold" mut>{s.title}</Body>
                      <View style={{
                        paddingHorizontal: 6, paddingVertical: 1,
                        borderRadius: 999,
                        borderColor: c.border, borderWidth: 1,
                      }}>
                        <Text style={{
                          color: c.mut, fontSize: 10, fontFamily,
                          fontWeight: weight.semibold as TextStyle['fontWeight'],
                          letterSpacing: 0.5, textTransform: 'uppercase',
                        }}>
                          Coming soon
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: c.mut, fontSize: 12, fontFamily, marginTop: 4, lineHeight: 17 }}>
                      {s.desc}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Bottom-nav hint */}
      <View style={{
        marginTop: space.sm,
        padding: 12,
        borderRadius: radius.md,
        borderColor: c.border, borderWidth: 1,
        backgroundColor: c.accent,
      }}>
        <Text style={{ color: c.mut, fontSize: 12, fontFamily, lineHeight: 17 }}>
          You can jump between modules any time using the bottom bar. Unsaved work in the SI Portal is kept safe when you switch.
        </Text>
      </View>
    </Screen>
  );
}

// ─── Scorecards — "today at a glance" strip ─────────────────────────────
// Four small cards summarising the two live modules with real counts.
// Tapping a card jumps straight into that module's most-relevant view.
// Loading is a subtle skeleton (dashes) so the strip never blocks or
// flashes empty state.

interface ScoreProps {
  loading: boolean;
  onOpenSis: () => void;
  onOpenSupport: () => void;
  si: { draft: number; locked: number; total: number };
  support: { open: number; awaitingYou: number; overdue: number };
}

function Scorecards({ loading, onOpenSis, onOpenSupport, si, support }: ScoreProps) {
  const { c } = useTheme();
  const { width } = useBreakpoint();
  const twoCol = width >= 900;
  const gap = 12;

  const siCards: ScoreCardData[] = [
    {
      key: 'draft',
      label: 'Drafts to review',
      value: si.draft,
      hint: si.total > 0 ? `of ${si.total} SIs today` : 'No SIs generated yet',
      tone: si.draft > 0 ? 'watch' : 'quiet',
      Icon: IconAlert,
      onPress: onOpenSis,
    },
    {
      key: 'locked',
      label: 'Locked today',
      value: si.locked,
      hint: si.locked === si.total && si.total > 0 ? 'All indents final' : 'Ready to send to HQ',
      tone: si.locked > 0 ? 'good' : 'quiet',
      Icon: IconLock,
      onPress: onOpenSis,
    },
  ];
  const supportCards: ScoreCardData[] = [
    {
      key: 'reply',
      label: 'Awaiting your reply',
      value: support.awaitingYou,
      hint: support.awaitingYou > 0 ? 'HQ replied — your turn' : 'Nothing pending from you',
      tone: support.awaitingYou > 0 ? 'bad' : 'good',
      Icon: IconMessageSquare,
      onPress: onOpenSupport,
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: support.overdue,
      hint: support.overdue > 0 ? "HQ hasn't replied in window" : 'All within target',
      tone: support.overdue > 0 ? 'bad' : 'good',
      Icon: IconClock,
      onPress: onOpenSupport,
    },
  ];

  return (
    <View style={{ flexDirection: twoCol ? 'row' : 'column', gap: 16 }}>
      <ScoreSection
        title="SI Portal · today"
        Icon={IconLayoutDashboard}
        onOpen={onOpenSis}
        openLabel="Open SI Portal"
        cards={siCards}
        loading={loading}
        gap={gap}
      />
      <ScoreSection
        title="Support · today"
        Icon={IconLifeBuoy}
        onOpen={onOpenSupport}
        openLabel="Open Support"
        cards={supportCards}
        loading={loading}
        gap={gap}
      />
    </View>
  );
}

// A grouped column of scorecards. Header names the section (kills the
// "which module am I looking at" confusion), then two tiles inside, then a
// subtle "Open …" link. Clicking the header row jumps to the section too.
function ScoreSection({
  title, Icon, onOpen, openLabel, cards, loading, gap,
}: {
  title: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onOpen: () => void;
  openLabel: string;
  cards: ScoreCardData[];
  loading: boolean;
  gap: number;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
      {/* Section header — mini row that also links to the section */}
      <Pressable
        onPress={onOpen}
        accessibilityRole="link"
        accessibilityLabel={openLabel}
        style={({ hovered }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingVertical: 2, paddingRight: 4,
          opacity: (hovered as boolean) ? 0.85 : 1,
        } as ViewStyle)}
      >
        <View style={{
          width: 24, height: 24, borderRadius: 6,
          backgroundColor: c.navActiveBg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} color={c.red} />
        </View>
        <Text style={{
          color: c.fg, fontSize: 13, fontFamily,
          fontWeight: weight.semibold as TextStyle['fontWeight'],
          letterSpacing: 0.3,
        }}>
          {title}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: c.mut, fontSize: 12, fontFamily, textDecorationLine: 'underline' }}>
          {openLabel}
        </Text>
      </Pressable>

      {/* Two-tile row inside the section */}
      <View style={{ flexDirection: 'row', gap }}>
        {cards.map((card) => (
          <ScoreCard
            key={card.key}
            data={card}
            loading={loading}
            style={{ flex: 1, minWidth: 0 } as ViewStyle}
          />
        ))}
      </View>
    </View>
  );
}

interface ScoreCardData {
  key: string;
  label: string;
  value: number;
  hint: string;
  tone: 'good' | 'watch' | 'bad' | 'quiet';
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
}

function ScoreCard({ data, loading, style }: { data: ScoreCardData; loading: boolean; style?: ViewStyle }) {
  const { c } = useTheme();
  const valueTone =
    data.tone === 'bad'   ? c.rTx :
    data.tone === 'watch' ? c.yTx :
    data.tone === 'good'  ? c.gTx :
                            c.fg;
  const iconTile =
    data.tone === 'bad'   ? { bg: c.rBg, fg: c.rTx } :
    data.tone === 'watch' ? { bg: c.yBg, fg: c.yTx } :
    data.tone === 'good'  ? { bg: c.gBg, fg: c.gTx } :
                            { bg: c.muted, fg: c.mut };
  return (
    <Pressable
      onPress={data.onPress}
      accessibilityRole="button"
      accessibilityLabel={`${data.label}: ${data.value}. Open`}
      style={({ hovered, pressed }) => ([
        {
          padding: 14, gap: 8,
          borderColor: c.border, borderWidth: 1, borderRadius: radius.lg,
          backgroundColor: c.card,
          shadowColor: (hovered as boolean) ? '#000' : 'transparent',
          shadowOpacity: (hovered as boolean) ? 0.06 : 0,
          shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
          transform: (pressed as boolean) ? [{ scale: 0.995 }] : [],
        } as ViewStyle,
        style ?? null,
      ])}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{
          width: 32, height: 32, borderRadius: 8,
          backgroundColor: iconTile.bg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <data.Icon size={16} color={iconTile.fg} />
        </View>
        {/* Labels can wrap up to 2 lines on narrow tiles rather than clip to
            an ellipsis — "Drafts to review" → "DRAFTS TO R…" hurt readability
            more than the extra vertical space. */}
        <Text
          numberOfLines={2}
          style={{
            flex: 1, minWidth: 0,
            color: c.mut, fontSize: 11,
            fontWeight: weight.semibold as TextStyle['fontWeight'],
            letterSpacing: 0.5, textTransform: 'uppercase', fontFamily,
            lineHeight: 13,
          }}
        >
          {data.label}
        </Text>
      </View>
      <Text style={{
        color: valueTone, fontSize: 30,
        fontWeight: weight.bold as TextStyle['fontWeight'],
        fontFamily, fontVariant: ['tabular-nums'], lineHeight: 32,
      }}>
        {loading ? '—' : data.value}
      </Text>
      <Text style={{ color: c.mut, fontSize: 12, fontFamily, lineHeight: 17 }} numberOfLines={2}>
        {data.hint}
      </Text>
    </Pressable>
  );
}

// ─── Quick actions ─────────────────────────────────────────────────────
// A thin strip of primary actions the user can fire from Home without going
// into a section first. Keeps the two most common tasks — generate an SI,
// raise a ticket — one tap away.

function QuickActions({
  onGenerateSi, onRaiseTicket, onOpenCycle,
}: {
  onGenerateSi: () => void;
  onRaiseTicket: () => void;
  onOpenCycle: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8,
      paddingVertical: 10, paddingHorizontal: 12,
      borderColor: c.border, borderWidth: 1, borderRadius: radius.lg,
      backgroundColor: c.card,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 4 }}>
        <View style={{
          width: 22, height: 22, borderRadius: 6,
          backgroundColor: c.navActiveBg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <IconBulb size={12} color={c.red} />
        </View>
        <Text style={{
          color: c.mut, fontSize: 11,
          fontWeight: weight.semibold as TextStyle['fontWeight'],
          letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
        }}>
          Quick actions
        </Text>
      </View>
      <QuickBtn label="Generate SI" Icon={IconRefresh} onPress={onGenerateSi} primary />
      <QuickBtn label="Raise a ticket" Icon={IconPlus} onPress={onRaiseTicket} />
      <QuickBtn label="View burn cycle" Icon={IconClock} onPress={onOpenCycle} />
    </View>
  );
}

function QuickBtn({
  label, Icon, onPress, primary,
}: {
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
  primary?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ hovered, pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: primary ? c.redSolid : c.border,
        backgroundColor:
          primary ? c.redSolid :
          (hovered as boolean) ? c.accent :
                                 'transparent',
        transform: (pressed as boolean) ? [{ scale: 0.98 }] : [],
      } as ViewStyle)}
    >
      <Icon size={13} color={primary ? '#ffffff' : c.fg} />
      <Text style={{
        color: primary ? '#ffffff' : c.fg,
        fontSize: 13, fontFamily,
        fontWeight: weight.semibold as TextStyle['fontWeight'],
      }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Recent activity ────────────────────────────────────────────────────
// A short timeline built from the Support tickets that the store actually
// owns. For each ticket we synthesize a single "most recent event" line and
// order by lastThreadAt desc. When SI events land in an API, we'll merge
// them into the same list — for now the SI side contributes just a summary
// footer line.

function RecentActivity({
  tickets, onOpen, sisTotal, sisLocked,
}: {
  tickets: import('../../src/support/model').UserTicket[];
  onOpen: (id: string) => void;
  sisTotal: number;
  sisLocked: number;
}) {
  const { c } = useTheme();
  const events = useMemo(() => {
    const items = tickets
      .filter((t) => t.raisedByMe || t.ccMe)
      .map((t) => {
        const last = t.replies[t.replies.length - 1];
        const summary = !last
          ? `You opened “${t.subject}”`
          : last.from === 'Corporate'
            ? `HQ replied on “${t.subject}”`
            : `You replied on “${t.subject}”`;
        return {
          id: t.id,
          subject: t.subject,
          summary,
          when: t.lastThreadAt,
          highlight: t.status !== 'closed' && last && last.from === 'Corporate',
          status: t.status,
        };
      });
    items.sort((a, b) => b.when - a.when);
    return items.slice(0, 5);
  }, [tickets]);

  return (
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
          <IconClock size={13} color={c.mut} />
          <Text style={{
            color: c.mut, fontSize: 11,
            fontWeight: weight.semibold as TextStyle['fontWeight'],
            letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
          }}>
            Recent activity
          </Text>
        </View>
        <Text style={{ color: c.mut, fontSize: 11, fontFamily }}>
          Last {events.length} update{events.length === 1 ? '' : 's'}
        </Text>
      </View>
      {events.length === 0 ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: c.mut, fontSize: 13, fontFamily, textAlign: 'center' }}>
            No recent activity. Anything you do in Support or SI Portal will land here.
          </Text>
        </View>
      ) : (
        <View>
          {events.map((e, idx) => (
            <Pressable
              key={e.id + idx}
              onPress={() => onOpen(e.id)}
              accessibilityRole="button"
              accessibilityLabel={e.summary}
              style={({ hovered }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingHorizontal: 14, paddingVertical: 12,
                borderBottomColor: c.border,
                borderBottomWidth: idx === events.length - 1 && sisTotal === 0 ? 0 : 1,
                backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
              } as ViewStyle)}
            >
              <View style={{
                width: 28, height: 28, borderRadius: 999,
                backgroundColor: e.highlight ? c.rBg : c.muted,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <IconMessageSquare size={13} color={e.highlight ? c.rTx : c.mut} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: c.fg, fontSize: 13, fontFamily,
                    fontWeight: (e.highlight ? weight.semibold : weight.medium) as TextStyle['fontWeight'],
                  }}
                >
                  {e.summary}
                </Text>
                <Text style={{ color: c.mut, fontSize: 11, fontFamily, marginTop: 2 }}>
                  #{e.id} · {ticketRelTime(e.when)}
                </Text>
              </View>
              <IconChevronRight size={13} color={c.mut} />
            </Pressable>
          ))}
          {sisTotal > 0 && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingHorizontal: 14, paddingVertical: 10,
              backgroundColor: c.footerBg,
            }}>
              <View style={{
                width: 20, height: 20, borderRadius: 999,
                backgroundColor: c.gBg,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <IconLock size={10} color={c.gTx} />
              </View>
              <Text style={{ color: c.mut, fontSize: 12, fontFamily }}>
                <Text style={{ color: c.fg, fontFamily, fontWeight: weight.semibold as TextStyle['fontWeight'] }}>
                  {sisLocked} of {sisTotal}
                </Text>
                {' '}SIs locked today.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Next indent countdown ─────────────────────────────────────────────
// A single actionable card that answers "when is my next indent due?".
// Pulls from api.getStockForecast for the first store the user has access
// to. When multi-store users need a per-store view, the Cycle page has the
// full picker — this is a summary teaser.

function NextIndentCard({ onOpen }: { onOpen: () => void }) {
  const { c } = useTheme();
  const storesQ = useQuery({
    queryKey: ['home-stores'],
    queryFn: () => api.listStores(),
    staleTime: 5 * 60_000,
  });
  const firstStoreId = storesQ.data?.[0]?.id ?? null;
  const firstStoreName = storesQ.data?.[0]?.name ?? '';
  const forecastQ = useQuery({
    queryKey: ['home-forecast', firstStoreId],
    queryFn: () => api.getStockForecast(firstStoreId!),
    enabled: !!firstStoreId,
    staleTime: 5 * 60_000,
  });

  const loading = storesQ.isLoading || forecastQ.isLoading;
  const forecast = forecastQ.data;
  const daysUntilNext = forecast?.daysUntilNextIndent ?? null;
  const runway = forecast?.daysOfStockLeft ?? null;
  const atRiskCount = forecast?.atRiskItems?.length ?? 0;

  // Tone: red if runway < daysUntilNext (won't last), yellow when tight,
  // green when comfortable, neutral while loading / no data.
  const tone: 'good' | 'watch' | 'bad' | 'neutral' =
    loading || daysUntilNext === null || runway === null ? 'neutral' :
    runway < daysUntilNext ? 'bad' :
    runway - daysUntilNext <= 1 ? 'watch' :
                                  'good';
  const chip =
    tone === 'bad'   ? { bg: c.rBg, fg: c.rTx, label: 'Short by ' + Math.max(0, (daysUntilNext ?? 0) - (runway ?? 0)) + 'd' } :
    tone === 'watch' ? { bg: c.yBg, fg: c.yTx, label: 'Tight — plan ahead' } :
    tone === 'good'  ? { bg: c.gBg, fg: c.gTx, label: 'Comfortable' } :
                       null;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="link"
      accessibilityLabel="Open Indent cycle"
      style={({ hovered, pressed }) => ({
        borderColor: c.border, borderWidth: 1, borderRadius: radius.lg,
        backgroundColor: c.card, overflow: 'hidden',
        shadowColor: (hovered as boolean) ? '#000' : 'transparent',
        shadowOpacity: (hovered as boolean) ? 0.06 : 0,
        shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
        transform: (pressed as boolean) ? [{ scale: 0.995 }] : [],
      } as ViewStyle)}
    >
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 10,
        borderBottomColor: c.border, borderBottomWidth: 1,
        backgroundColor: c.footerBg,
      }}>
        <IconCalendar size={13} color={c.mut} />
        <Text style={{
          color: c.mut, fontSize: 11,
          fontWeight: weight.semibold as TextStyle['fontWeight'],
          letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
        }}>
          Next indent
        </Text>
        <View style={{ flex: 1 }} />
        <IconChevronRight size={13} color={c.mut} />
      </View>

      <View style={{ padding: 14, gap: 6 }}>
        {loading ? (
          <Text style={{ color: c.mut, fontSize: 13, fontFamily }}>Loading forecast…</Text>
        ) : daysUntilNext === null ? (
          <Text style={{ color: c.mut, fontSize: 13, fontFamily }}>No indent scheduled.</Text>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{
                color: c.fg, fontSize: 30,
                fontWeight: weight.bold as TextStyle['fontWeight'],
                fontFamily, fontVariant: ['tabular-nums'], lineHeight: 32,
              }}>
                {daysUntilNext}
              </Text>
              <Text style={{ color: c.mut, fontSize: 14, fontFamily }}>
                {daysUntilNext === 1 ? 'day' : 'days'} away
              </Text>
            </View>
            <Text style={{ color: c.mut, fontSize: 12, fontFamily, lineHeight: 17 }}>
              {firstStoreName ? `${firstStoreName} · ` : ''}
              runway {runway} {runway === 1 ? 'day' : 'days'}
              {atRiskCount > 0 ? ` · ${atRiskCount} at-risk SKU${atRiskCount === 1 ? '' : 's'}` : ''}
            </Text>
            {chip && (
              <View style={{
                alignSelf: 'flex-start',
                marginTop: 4,
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                backgroundColor: chip.bg,
              }}>
                <Text style={{
                  color: chip.fg, fontSize: 11, fontFamily,
                  fontWeight: weight.semibold as TextStyle['fontWeight'],
                }}>
                  {chip.label}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

// ─── LiveCard — the "big teaching tile" ─────────────────────────────────

function LiveCard({
  module: m, onOpen, isPhone,
}: {
  module: LiveModule;
  onOpen: () => void;
  isPhone: boolean;
}) {
  const { c } = useTheme();

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="link"
      accessibilityLabel={m.title}
      style={({ hovered, pressed }) => ({
        flex: 1, minWidth: 0,
        padding: isPhone ? 16 : 20,
        gap: 14,
        borderRadius: radius.lg,
        borderColor: c.border, borderWidth: 1,
        backgroundColor: c.card,
        // Subtle lift on hover; scale-down on press for tactile feedback.
        shadowColor: (hovered as boolean) ? '#000' : 'transparent',
        shadowOpacity: (hovered as boolean) ? 0.08 : 0,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        transform: (pressed as boolean) ? [{ scale: 0.995 }] : [],
      } as ViewStyle)}
    >
      {/* Top row — icon tile + title stack + chevron */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <View style={{
          width: 44, height: 44, borderRadius: 12,
          backgroundColor: c.navActiveBg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <m.Icon size={22} color={c.red} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{
              color: c.fg, fontSize: font.h3,
              fontWeight: weight.bold as TextStyle['fontWeight'],
              fontFamily,
            }}>
              {m.title}
            </Text>
            <View style={{
              paddingHorizontal: 6, paddingVertical: 1,
              backgroundColor: c.gBg,
              borderRadius: 999,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: c.gDot }} />
                <Text style={{
                  color: c.gTx, fontSize: 10, fontFamily,
                  fontWeight: weight.semibold as TextStyle['fontWeight'],
                  letterSpacing: 0.5, textTransform: 'uppercase',
                }}>
                  Live
                </Text>
              </View>
            </View>
          </View>
          <Text style={{
            color: c.mut, fontSize: 14, fontFamily,
            marginTop: 4, lineHeight: 20,
          }}>
            {m.purpose}
          </Text>
        </View>
        <IconChevronRight size={16} color={c.mut} />
      </View>

      {/* Feature bullets — the "user manual" bit */}
      <View style={{ gap: 8, paddingTop: 10, borderTopColor: c.border, borderTopWidth: 1 }}>
        {m.features.map((f, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{
              width: 24, height: 24, borderRadius: 6,
              backgroundColor: c.muted,
              alignItems: 'center', justifyContent: 'center',
              marginTop: 1,
            }}>
              <f.Icon size={13} color={c.mut} />
            </View>
            <Text style={{
              flex: 1, minWidth: 0,
              color: c.fg, fontSize: 13, fontFamily, lineHeight: 18,
            }}>
              {f.text}
            </Text>
          </View>
        ))}
      </View>

    </Pressable>
  );
}
