// AppShell — the persistent top bar that wraps every authenticated screen.
// Ports the header from SiListFrame.dc.html: BS logo, product name, primary
// nav (SIs / Generate / Exceptions / Discrepancies), user pill with a
// dropdown for theme toggle + sign out.

import { useState } from 'react';
import { View, Text, Pressable, type TextStyle, type ViewStyle } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { font, radius, weight, fontFamily } from '../theme/tokens';

interface NavItem { label: string; href: string; match: (path: string) => boolean }
const NAV: NavItem[] = [
  { label: 'SIs',           href: '/sis',            match: (p) => p === '/sis' || p.startsWith('/sis/') },
  { label: 'Generate',      href: '/sis/generate',   match: (p) => p === '/sis/generate' },
  { label: 'Exceptions',    href: '/exceptions',     match: (p) => p.startsWith('/exceptions') },
  { label: 'Discrepancies', href: '/discrepancies',  match: (p) => p.startsWith('/discrepancies') },
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
  const { c, mode, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const path = usePathname() || '/';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={{
      height: 56, paddingHorizontal: 24,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.card, borderBottomColor: c.border, borderBottomWidth: 1,
      zIndex: 50,
    } as ViewStyle}>
      {/* Left cluster — logo, product, nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 28, minWidth: 0 }}>
        <Pressable onPress={() => router.push('/sis')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{
            width: 28, height: 28, borderRadius: 8, backgroundColor: c.redSolid,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, fontFamily }}>B</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ color: c.fg, fontWeight: weight.bold as TextStyle['fontWeight'], fontSize: 15, fontFamily }}>Burger Singh</Text>
            <Text style={{
              color: c.mut, fontSize: 11, letterSpacing: 0.5,
              fontWeight: weight.semibold as TextStyle['fontWeight'], textTransform: 'uppercase', fontFamily,
            }}>SI Portal</Text>
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          {NAV.map((n) => {
            const active = n.match(path);
            return (
              <Pressable
                key={n.href}
                onPress={() => router.push(n.href as never)}
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
            );
          })}
        </View>
      </View>

      {/* Right cluster — user pill + dropdown */}
      <View style={{ position: 'relative' }}>
        <Pressable
          onPress={() => setMenuOpen((v) => !v)}
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
          <Text style={{ color: c.fg, fontSize: 13, fontWeight: weight.medium as TextStyle['fontWeight'], fontFamily }}>
            {user?.name ?? user?.email ?? 'Signed in'}
          </Text>
          <Text style={{ color: c.mut, fontSize: 11 }}>{menuOpen ? '▲' : '▼'}</Text>
        </Pressable>
        {menuOpen && (
          <View style={{
            position: 'absolute', top: '110%' as unknown as number, right: 0,
            minWidth: 180,
            backgroundColor: c.card,
            borderWidth: 1, borderColor: c.border, borderRadius: radius.md,
            padding: 6, gap: 2, zIndex: 100,
          }}>
            <MenuRow label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onPress={() => { toggle(); setMenuOpen(false); }} />
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
