// AppShell — the persistent top bar that wraps every authenticated screen.
// Ports the header from SiListFrame.dc.html: BS logo, product name, primary
// nav (SIs / Generate / Exceptions / Discrepancies), user pill with a
// dropdown for theme toggle + sign out.

import { useRef, useState } from 'react';
import { View, Text, Pressable, type TextStyle, type ViewStyle } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { font, radius, weight, fontFamily } from '../theme/tokens';
import { useOutsideClick } from '../hooks/useOutsideClick';
import {
  IconChevronDown, IconChevronUp, IconSun, IconMoon,
  IconHome, IconLayoutDashboard, IconLifeBuoy,
  IconGraduationCap, IconBell,
} from './icons';
import { BurgerSinghLogo } from './BurgerSinghLogo';
import { Tooltip } from './Tooltip';
import { useBreakpoint } from './ui';
import { guardNav } from '../hooks/useUnsavedChangesGuard';

interface NavItem {
  label: string;
  href: string;
  tooltip: string;
  /** Return true when this route (or any of its children) is the one the user
   *  is currently on. Written with a priority order in mind — see the resolver
   *  below that picks the LONGEST matching prefix so we never light up two
   *  items at once. */
  match: (path: string) => boolean;
}
// Nav layout for the store-user persona:
//   • SIs      — daily review landing.
//   • Generate — creates a fresh draft SI for a date + indent interval.
//   • Cycle    — burn forecast: when the current stock runs out relative to
//                the next indent, and which items are at risk before it.
//
// Exceptions + Discrepancies are ADMIN-only pages. The routes still exist
// under app/(app)/ so a direct URL works, but they are intentionally
// omitted from the nav so store owners don't see them.
const NAV: NavItem[] = [
  {
    label: 'SIs',
    href: '/sis',
    tooltip: 'Draft and locked indents for your stores. This is the daily-review landing page.',
    match: (p) => p === '/sis' || (p.startsWith('/sis/') && p !== '/sis/generate'),
  },
  {
    label: 'Generate',
    href: '/sis/generate',
    tooltip: 'Create a fresh draft SI: pick a date and how many days of stock it should cover.',
    match: (p) => p === '/sis/generate',
  },
  {
    label: 'Cycle',
    href: '/cycle',
    tooltip: 'Next indent date, days of stock remaining, and items at risk of running out before then.',
    match: (p) => p.startsWith('/cycle'),
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopBar />
      <View style={{ flex: 1 }}>{children}</View>
      <BottomNav />
    </View>
  );
}

// Height of the bottom nav (56 px content + safe-area inset). Every Screen
// container adds this as bottom padding so the last card is never obscured.
export const BOTTOM_NAV_HEIGHT = 68;

function TopBar() {
  const { c } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const path = usePathname() || '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<any>(null);
  useOutsideClick(menuRef, menuOpen, () => setMenuOpen(false));
  const { width, isPhone } = useBreakpoint();
  // Progressive-disclosure breakpoints — the bar collapses in three steps as
  // width drops. `hideWordmark` ditches the "Burger Singh" text once the
  // wordmark starts fighting the nav for space. `hideUserText` collapses
  // the account pill to just the initials circle so nav still fits on
  // phones. Nav labels themselves stay visible — we only have three.
  // Thresholds are `<=` so an exact-boundary viewport (e.g. iPad 768,
  // hypothetical 720) still gets the collapsed layout rather than a fight.
  const hideWordmark = width <= 780;
  const hideUserText = width < 560;

  return (
    <View style={{
      height: 56, paddingHorizontal: isPhone ? 12 : 24,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.card, borderBottomColor: c.border, borderBottomWidth: 1,
      zIndex: 50, gap: 12,
    } as ViewStyle}>
      {/* Left cluster — logo, product, nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: isPhone ? 12 : 28, minWidth: 0, flexShrink: 1 } as ViewStyle}>
        <Pressable
          onPress={() => guardNav(() => router.push('/'))}
          accessibilityRole="link"
          accessibilityLabel="Burger Singh Franchise Ops home"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <BurgerSinghLogo size={30} />
          {!hideWordmark && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{
                color: c.fg,
                fontWeight: weight.bold as TextStyle['fontWeight'],
                fontSize: 17, letterSpacing: 0.3, fontFamily,
              }}>
                BURGER SINGH
              </Text>
              {/* Vertical divider — sits full-cap-height between the wordmark
                  and the product tag (Originn's canonical "| FOR BUILDERS"
                  treatment) so the two labels read as siblings, not a two-line
                  stack. */}
              <View style={{ width: 1, height: 18, backgroundColor: c.border }} />
              <Text style={{
                color: c.red,
                fontSize: 12, letterSpacing: 1.2,
                fontWeight: weight.semibold as TextStyle['fontWeight'],
                textTransform: 'uppercase', fontFamily,
              }}>
                Franchise Ops
              </Text>
            </View>
          )}
        </Pressable>
        {/* Section nav is context-aware: only appears when the user is inside
            the SI Portal section. Home and Support don't need in-section
            tabs. Once Dashboards / Academy / Alerts ship, each will register
            their own in-section nav here the same way. */}
        {isSiPortalPath(path) && <NavList path={path} />}
      </View>

      {/* Right cluster — theme toggle + user pill */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <ThemeToggleButton />
      <View ref={menuRef} style={{ position: 'relative', zIndex: menuOpen ? 60 : 1 }}>
        <Pressable
          onPress={() => setMenuOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`Account menu for ${user?.name ?? user?.email ?? 'signed-in user'}`}
          accessibilityState={{ expanded: menuOpen }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingVertical: 5, paddingLeft: 5, paddingRight: 10,
            borderRadius: radius.pill, borderWidth: 1, borderColor: c.border,
          } as ViewStyle}
        >
          <View style={{
            width: 28, height: 28, borderRadius: 999, backgroundColor: c.accent,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: c.fg, fontSize: 12, fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily }}>
              {initialsOf(user?.name ?? user?.email ?? 'User')}
            </Text>
          </View>
          {!hideUserText && (
            <View style={{ minWidth: 0 }}>
              <Text style={{ color: c.fg, fontSize: 13, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }} numberOfLines={1}>
                {user?.name ?? user?.email ?? 'Signed in'}
              </Text>
              {user?.storeIds && user.storeIds.length > 0 && (
                <Text style={{ color: c.mut, fontSize: 10, fontFamily, marginTop: 1 }}>
                  {user.storeIds.length} {user.storeIds.length === 1 ? 'store' : 'stores'}
                </Text>
              )}
            </View>
          )}
          {!hideUserText && (menuOpen ? <IconChevronUp size={12} color={c.mut} /> : <IconChevronDown size={12} color={c.mut} />)}
        </Pressable>
        {menuOpen && (
          <View style={{
            position: 'absolute',
            top: 52,                  // pill height (~44) + 8 gap
            right: 0,
            minWidth: 220,
            backgroundColor: c.card,
            borderWidth: 1, borderColor: c.border, borderRadius: radius.md,
            padding: 6, gap: 2, zIndex: 100, elevation: 8,
            shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 },
          }}>
            <MenuRow
              label="Sign out"
              danger
              onPress={async () => {
                setMenuOpen(false);
                await signOut();
                router.replace('/login');
              }}
            />
          </View>
        )}
      </View>
      </View>
    </View>
  );
}

// Standalone theme toggle — same purpose as the old dropdown row, but always
// visible in the top bar. One tap flips the mode; the icon telegraphs where
// you'll land (Moon while light → tap to go dark; Sun while dark → tap to
// go light). Kept small, ghost-styled, so it doesn't compete with the
// account pill for attention.
function ThemeToggleButton() {
  const { c, mode, toggle } = useTheme();
  const dark = mode === 'dark';
  return (
    <Tooltip label={dark ? 'Switch to light mode' : 'Switch to dark mode'} placement="bottom">
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        style={({ hovered }) => ({
          width: 34, height: 34, borderRadius: 999,
          borderWidth: 1, borderColor: c.border,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
        })}
      >
        {dark ? <IconSun size={16} color={c.fg} /> : <IconMoon size={16} color={c.fg} />}
      </Pressable>
    </Tooltip>
  );
}

// NavList — pulled out so the priority-match resolver stays local and the
// TopBar body reads without a nested map. Only the LONGEST matching NAV entry
// lights up, so a nested route (like a hypothetical /exceptions/foo) can never
// accidentally activate two items at once.
function NavList({ path }: { path: string }) {
  const { c } = useTheme();
  const router = useRouter();
  // Priority = the longest matching href wins, so /sis/generate would light
  // the SIs tab and not both. Since Generate is no longer a top-level, this
  // is defence-in-depth for future additions.
  const activeHref = NAV
    .filter((n) => n.match(path))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {NAV.map((n) => {
        const active = n.href === activeHref;
        return (
          <Tooltip key={n.href} label={n.tooltip} placement="bottom">
            <Pressable
              onPress={() => guardNav(() => router.push(n.href as never))}
              accessibilityRole="link"
              accessibilityLabel={n.label}
              accessibilityState={{ selected: active }}
              style={{
                paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
                backgroundColor: active ? c.navActiveBg : 'transparent',
              }}
            >
              <Text style={{
                color: active ? c.red : c.mut,
                fontWeight: (active ? weight.semibold : weight.medium) as TextStyle['fontWeight'],
                fontSize: 14, fontFamily,
              }}>{n.label}</Text>
            </Pressable>
          </Tooltip>
        );
      })}
    </View>
  );
}

function MenuRow({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }) => ({
        paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.sm,
        backgroundColor: (hovered as boolean) ? c.accent : 'transparent',
      })}
    >
      <Text style={{ color: danger ? c.rTx : c.fg, fontSize: font.body, fontFamily }}>{label}</Text>
    </Pressable>
  );
}

// isSiPortalPath — the SI Portal section owns /sis/* + /cycle. Home, Support,
// and future sections have no in-section tabs of their own (yet), so gating
// on this predicate keeps the top bar clean everywhere else.
function isSiPortalPath(path: string): boolean {
  return path === '/sis' || path.startsWith('/sis/') || path.startsWith('/cycle');
}

// isRootPath — Home lives at "/" inside the (app) group. Expo Router surfaces
// both "/" and "" here depending on the entry point, so accept both.
function isRootPath(path: string): boolean {
  return path === '/' || path === '';
}

// Bottom nav — the persistent app switcher. Two live entries (Home, SI Portal,
// Support) and three greyed-out placeholders for future modules the user
// mentioned by name: Dashboards, Burger Singh Academy, Central alerts.
// Placeholders render but don't route — a tooltip explains "coming soon" so
// the icons don't look broken. Mirrors the Franchisee-app pattern (fixed
// bottom nav with equal-width tiles + safe-area inset on iOS PWA).
interface BottomTab {
  key: string;
  label: string;
  href: string | null;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  match: (path: string) => boolean;
  tooltip: string;
  disabled?: boolean;
}
const BOTTOM_TABS: BottomTab[] = [
  {
    key: 'home',
    label: 'Home',
    href: '/',
    Icon: IconHome,
    match: isRootPath,
    tooltip: 'Home',
  },
  {
    key: 'si',
    label: 'SI Portal',
    href: '/sis',
    Icon: IconLayoutDashboard,
    match: isSiPortalPath,
    tooltip: 'Suggestive Indents — daily review, generate, and burn cycle.',
  },
  {
    key: 'support',
    label: 'Support',
    href: '/support',
    Icon: IconLifeBuoy,
    match: (p) => p === '/support' || p.startsWith('/support/'),
    tooltip: 'Raise a ticket, view your open issues, and reply to conversations.',
  },
  {
    key: 'academy',
    label: 'Academy',
    href: null,
    Icon: IconGraduationCap,
    match: () => false,
    tooltip: 'Burger Singh Academy — training and playbooks. Coming soon.',
    disabled: true,
  },
  {
    key: 'alerts',
    label: 'Alerts',
    href: null,
    Icon: IconBell,
    match: () => false,
    tooltip: 'Central alerts from HQ. Coming soon.',
    disabled: true,
  },
];

function BottomNav() {
  const { c } = useTheme();
  const router = useRouter();
  const path = usePathname() || '/';
  const { isPhone } = useBreakpoint();
  const activeKey = BOTTOM_TABS
    .filter((t) => t.match(path))
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0]?.key;
  return (
    <View
      // RN Web accepts CSS env() as a string, but ViewStyle typing rejects it.
      // Cast via unknown so the safe-area inset still lands on iOS PWA.
      style={{
        height: BOTTOM_NAV_HEIGHT,
        flexDirection: 'row',
        backgroundColor: c.card,
        borderTopColor: c.border, borderTopWidth: 1,
        paddingHorizontal: isPhone ? 4 : 12,
        paddingBottom: 'env(safe-area-inset-bottom)',
      } as unknown as ViewStyle}
    >
      {BOTTOM_TABS.map((t) => {
        const active = t.key === activeKey;
        // Tooltip wraps its child in a position:relative View that doesn't
        // grow, so we place the flex:1 cell outside the tooltip. The tooltip
        // then hugs the Pressable, and the outer View is what fills the row.
        return (
          <View key={t.key} style={{ flex: 1 }}>
            {/* Bottom-nav tabs have visible labels already; a hover tooltip
                on top would just be noise. We keep the tooltip ONLY on
                disabled tabs so a "coming soon" hint has somewhere to live. */}
            <Tooltip label={t.disabled ? t.tooltip : ''} placement="top">
              <Pressable
                onPress={() => {
                  if (t.disabled || !t.href) return;
                  guardNav(() => router.push(t.href as never));
                }}
                accessibilityRole={t.disabled ? 'button' : 'link'}
                accessibilityLabel={t.label + (t.disabled ? ', coming soon' : '')}
                accessibilityState={{ selected: active, disabled: !!t.disabled }}
                style={{
                  alignItems: 'center', justifyContent: 'center',
                  paddingVertical: 8, gap: 4,
                  opacity: t.disabled ? 0.4 : 1,
                }}
              >
                <t.Icon size={20} color={active ? c.red : c.mut} />
                <Text style={{
                  color: active ? c.red : c.mut,
                  fontSize: 11,
                  fontWeight: (active ? weight.semibold : weight.medium) as TextStyle['fontWeight'],
                  fontFamily,
                }} numberOfLines={1}>{t.label}</Text>
              </Pressable>
            </Tooltip>
          </View>
        );
      })}
    </View>
  );
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
