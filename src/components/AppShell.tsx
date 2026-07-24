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
import { IconChevronDown, IconChevronUp, IconSun, IconMoon } from './icons';
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
// Generate is intentionally NOT a top-level nav item. It is a sub-flow of SIs
// (accessed via the "Generate SIs" button on the list), and treating it as a
// peer was misleading — a new user reads it as an alternative to viewing SIs
// rather than a way to create them. Cutting it also removes the active-state
// bug where /sis/generate lit up both "SIs" and "Generate" at once.
const NAV: NavItem[] = [
  {
    label: 'SIs',
    href: '/sis',
    tooltip: 'Draft and locked indents for your stores. This is the daily-review landing page.',
    match: (p) => p === '/sis' || p.startsWith('/sis/'),
  },
  {
    label: 'Exceptions',
    href: '/exceptions',
    tooltip: 'Every line the engine couldn\'t compute today. Fix the data, then regenerate.',
    match: (p) => p.startsWith('/exceptions'),
  },
  {
    label: 'Discrepancies',
    href: '/discrepancies',
    tooltip: 'The subset of exceptions caused by unmapped SKUs or missing unit conversions.',
    match: (p) => p.startsWith('/discrepancies'),
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopBar />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

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
          onPress={() => guardNav(() => router.push('/sis'))}
          accessibilityRole="link"
          accessibilityLabel="Burger Singh SI Portal, go home"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <View style={{
            width: 28, height: 28, borderRadius: 8, backgroundColor: c.redSolid,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, fontFamily }}>B</Text>
          </View>
          {!hideWordmark && (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ color: c.fg, fontWeight: weight.bold as TextStyle['fontWeight'], fontSize: 15, fontFamily }}>Burger Singh</Text>
              <Text style={{
                color: c.mut, fontSize: 11, letterSpacing: 0.5,
                fontWeight: weight.semibold as TextStyle['fontWeight'], textTransform: 'uppercase', fontFamily,
              }}>SI Portal</Text>
            </View>
          )}
        </Pressable>
        <NavList path={path} />
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

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
