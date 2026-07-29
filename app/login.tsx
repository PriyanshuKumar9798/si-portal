// Login — two-column split matching the Franchise Ops mockup.
// Left column: sign-in form (Send OTP → verify, or Continue with Google).
// Right column: purple hero panel with the sardar logo lockup + tagline.
//
// On mobile (< 900px) the hero panel collapses; only the form remains.

import { useEffect, useState, type ReactElement } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAuth } from '../src/auth/AuthContext';
import { useTheme } from '../src/theme/ThemeContext';
import { Body, Button, useBreakpoint } from '../src/components/ui';
import { font, radius, weight, fontFamily } from '../src/theme/tokens';
import { IconArrowRight, IconMail } from '../src/components/icons';
import { BurgerSinghLogo } from '../src/components/BurgerSinghLogo';
import type { ApiError } from '../src/api/types';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth();
  const { c } = useTheme();
  const { width } = useBreakpoint();
  // Two-column layout above 900px; the hero panel disappears on phones/tablets
  // so the form is always the primary target on small screens.
  const twoCol = width >= 900;

  const [email, setEmail]           = useState('');
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If a session hydrates while we're on the login screen, bounce to the home.
  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/');
  }, [authLoading, isAuthenticated, router]);

  const disabled = submitting;

  const onSendOtp = async () => {
    setError(null);
    setSubmitting(true);
    try {
      // Dev bypass — the real flow will POST to /auth/otp and open a verify
      // screen. For now, sign in with the email + a dummy password so the
      // downstream auth guard clears.
      await signIn(email.trim(), 'otp');
      router.replace('/');
    } catch (e) {
      const err = e as ApiError;
      setError(err?.message ?? 'Could not send OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        // @ts-ignore RN Web: min-height: 100vh so the two-column layout fills
        // the viewport even when the Stack's default container is content-height.
        minHeight: '100vh',
        backgroundColor: c.bg,
        flexDirection: twoCol ? 'row' : 'column',
      } as any}
    >
      {/* ── Left: form ─────────────────────────────────────────────── */}
      <View style={{
        flex: 1, minWidth: 0,
        alignItems: 'center', justifyContent: 'center',
        paddingVertical: twoCol ? 24 : 40, paddingHorizontal: 24,
      }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', maxWidth: 380, gap: 24 }}
        >
          {/* Small-screen brand lockup — hero collapses on phones so the
              form takes the whole viewport; a compact logo keeps identity. */}
          {!twoCol && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BurgerSinghLogo size={34} />
              <View>
                <Text style={{ color: c.fg, fontSize: 15, fontWeight: weight.bold as TextStyle['fontWeight'], fontFamily }}>
                  Burger Singh
                </Text>
                <Text style={{ color: c.mut, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily }}>
                  Franchise Operations
                </Text>
              </View>
            </View>
          )}

          {/* Heading */}
          <View style={{ gap: 8 }}>
            <Text style={{
              color: c.fg, fontFamily,
              fontSize: 34, lineHeight: 40,
              fontWeight: weight.bold as TextStyle['fontWeight'],
            }}>
              Sign in
            </Text>
            <Text style={{ color: c.mut, fontSize: 14, fontFamily, lineHeight: 20 }}>
              Use your invited email, or your linked Google account.
            </Text>
          </View>

          {error && (
            <View style={{ backgroundColor: c.rBg, borderRadius: radius.md, padding: 12 }}>
              <Text style={{
                color: c.rTx, fontSize: font.body,
                fontWeight: weight.semibold as TextStyle['fontWeight'], fontFamily,
              }}>
                Sign-in failed
              </Text>
              <Text style={{ color: c.mut, fontSize: font.small, marginTop: 4, fontFamily }}>{error}</Text>
            </View>
          )}

          {/* Email + Send OTP */}
          <View style={{ gap: 8 }}>
            <Text style={{
              color: c.fg, fontSize: 13, fontFamily,
              fontWeight: weight.semibold as TextStyle['fontWeight'],
            }}>
              Email address
            </Text>
            <EmailField value={email} onChange={setEmail} onSubmit={onSendOtp} disabled={disabled} />
            <Button
              label={submitting ? 'Sending OTP…' : 'Send OTP'}
              onPress={onSendOtp}
              disabled={disabled}
              loading={submitting}
              fullWidth
              trailing={<IconArrowRight size={14} color="#fff" />}
            />
          </View>

          {/* OR divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
            <Text style={{ color: c.mut, fontSize: 12, fontFamily, letterSpacing: 0.6 }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
          </View>

          {/* Google SSO */}
          <Button
            label="Continue with Google"
            variant="secondary"
            fullWidth
            leading={<GoogleGlyph size={16} />}
            onPress={() => setError('Google SSO is not enabled yet. Ask your admin to invite you by email.')}
          />

          {/* Footer copy */}
          <View style={{ gap: 4, marginTop: 8 }}>
            <Text style={{ color: c.mut, fontSize: 12, fontFamily, textAlign: 'center' }}>
              By signing in you accept the Burger Singh Operations Terms.
            </Text>
            <Text style={{ color: c.mut, fontSize: 12, fontFamily, textAlign: 'center' }}>
              Need help? Contact your franchise admin.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* ── Right: hero panel (desktop only) ──────────────────────── */}
      {twoCol && <HeroPanel />}
    </View>
  );
}

// ─── Trailing chevron button (imported into ui.tsx would be cleaner, but
// this file is the only caller for now) ─────────────────────────────────

// ─── Email input with a leading mail icon ──────────────────────────────

function EmailField({
  value, onChange, onSubmit, disabled,
}: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 12, paddingVertical: 8,
      backgroundColor: c.card,
      borderColor: c.border, borderWidth: 1, borderRadius: radius.md,
    }}>
      <IconMail size={16} color={c.mut} />
      <TextInputImport
        value={value}
        onChangeText={onChange}
        placeholder="you@example.com"
        placeholderTextColor={c.mut}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!disabled}
        onSubmitEditing={onSubmit}
        style={{
          flex: 1, minWidth: 0,
          paddingVertical: 6,
          color: c.fg, fontSize: 15, fontFamily,
          backgroundColor: 'transparent',
        } as any}
      />
    </View>
  );
}
// Deferred import to keep the JSX above tidy.
import { TextInput as TextInputImport } from 'react-native';

// ─── Google glyph (multi-colour "G") ──────────────────────────────────

function GoogleGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x="0" y="0" width="0" height="0" fill="transparent" />
      {/* Simplified G — recognisable but avoids the licensed multi-arc mark */}
      <Rect x="0" y="0" width="0" height="0" />
      <G />
    </Svg>
  );
}
function G() {
  return (
    <>
      {/* red segment */}
      <PathG d="M24 10c3.4 0 6.5 1.2 8.9 3.2l6.7-6.7C35.5 2.5 30 0 24 0 14.6 0 6.5 5.4 2.5 13.3l7.8 6.1C12.4 13.6 17.7 10 24 10Z" fill="#EA4335" />
      {/* blue segment */}
      <PathG d="M46.98 24.55c0-1.57-.15-3.09-.4-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z" fill="#4285F4" />
      {/* yellow segment */}
      <PathG d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.8-6.1C1.03 16.44 0 20.1 0 24s1.03 7.56 2.73 10.68l7.8-6.09Z" fill="#FBBC05" />
      {/* green segment */}
      <PathG d="M24 48c6 0 11.5-2 15.7-5.34l-7.73-6c-2.03 1.44-4.72 2.34-7.97 2.34-6.3 0-11.63-3.62-13.7-8.78l-7.8 6.1C6.5 42.6 14.6 48 24 48Z" fill="#34A853" />
    </>
  );
}
// Local Path alias so the tag reads cleanly above.
function PathG(props: any) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RNSvg = require('react-native-svg');
  return <RNSvg.Path {...props} />;
}

// ─── Hero panel (right column) ─────────────────────────────────────────
// Purple gradient background, Burger Singh logo lockup top-left, tagline
// bottom-left. Skyline silhouette painted with SVG polygons so no external
// image asset is required.

function HeroPanel() {
  return (
    <View style={{
      flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden',
      backgroundColor: '#3B1E6D', // fallback while the gradient paints
    }}>
      {/* Gradient + skyline background */}
      <Svg
        width="100%"
        height="100%"
        // @ts-ignore RN Web absolute positioning
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as any}
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 800 1000"
      >
        <Defs>
          <LinearGradient id="hero" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3B1E6D" />
            <Stop offset="0.55" stopColor="#6B2A6B" />
            <Stop offset="1" stopColor="#1E1035" />
          </LinearGradient>
          <LinearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F6D68A" />
            <Stop offset="1" stopColor="#F1A653" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="800" height="1000" fill="url(#hero)" />
        {/* Sun */}
        <Sun cx={500} cy={520} r={180} />
        {/* Skyline — a set of angular blocks */}
        <Skyline />
      </Svg>

      {/* Foreground content */}
      <View style={{ flex: 1, padding: 32, justifyContent: 'space-between', zIndex: 2 }}>
        {/* Lockup top-left */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <BurgerSinghLogo size={56} />
          <View>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: weight.bold as TextStyle['fontWeight'], fontFamily }}>
              Burger Singh
            </Text>
            <Text style={{
              color: 'rgba(255,255,255,0.72)', fontSize: 12,
              letterSpacing: 0.6, textTransform: 'uppercase', fontFamily,
              marginTop: 2,
            }}>
              Franchise Operations
            </Text>
          </View>
        </View>

        {/* Tagline bottom-left */}
        <View style={{ maxWidth: 460, gap: 8 }}>
          <Text style={{
            color: '#fff', fontFamily,
            fontSize: 26, lineHeight: 32,
            fontWeight: weight.bold as TextStyle['fontWeight'],
          }}>
            Every outlet, every payout — in one place.
          </Text>
          <Text style={{
            color: 'rgba(255,255,255,0.75)', fontFamily,
            fontSize: 14, lineHeight: 20,
          }}>
            Live sales, deductions, and what each aggregator owes you across every Burger Singh franchise you operate.
          </Text>
        </View>
      </View>
    </View>
  );
}

// Sun with a soft halo — two concentric circles.
function Sun({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RNSvg = require('react-native-svg');
  return (
    <>
      <RNSvg.Circle cx={cx} cy={cy} r={r + 40} fill="rgba(246, 214, 138, 0.15)" />
      <RNSvg.Circle cx={cx} cy={cy} r={r} fill="url(#sun)" />
    </>
  );
}

// Skyline — a row of angular black rectangles + rooftops with warm dots for windows.
function Skyline() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RNSvg = require('react-native-svg');
  const buildings = [
    { x: 20,   w: 100, h: 320 },
    { x: 120,  w: 80,  h: 380 },
    { x: 200,  w: 110, h: 260 },
    { x: 310,  w: 70,  h: 340 },
    { x: 380,  w: 100, h: 300 },
    { x: 480,  w: 90,  h: 400 },
    { x: 570,  w: 60,  h: 260 },
    { x: 630,  w: 100, h: 360 },
    { x: 730,  w: 70,  h: 280 },
  ];
  return (
    <>
      {/* Ground */}
      <RNSvg.Rect x={0} y={780} width={800} height={220} fill="#120A24" />
      {buildings.map((b, i) => (
        <RNSvg.Rect key={i} x={b.x} y={800 - b.h} width={b.w} height={b.h} fill="#100B24" />
      ))}
      {/* Warm window dots */}
      {buildings.flatMap((b, i) => {
        const cols = Math.max(1, Math.floor(b.w / 20));
        const rows = Math.max(2, Math.floor(b.h / 40));
        const out: ReactElement[] = [];
        for (let r = 0; r < rows; r++) {
          for (let cc = 0; cc < cols; cc++) {
            // Sparse pattern — every ~3rd cell lit.
            if ((r * 3 + cc * 5 + i) % 4 !== 0) continue;
            const x = b.x + 6 + cc * 20;
            const y = 800 - b.h + 20 + r * 40;
            out.push(<RNSvg.Rect key={`${i}-${r}-${cc}`} x={x} y={y} width={4} height={5} fill="#F5C56A" opacity={0.85} />);
          }
        }
        return out;
      })}
      {/* Reflection strip beneath (subtle) */}
      <RNSvg.Rect x={0} y={800} width={800} height={12} fill="rgba(217, 58, 45, 0.35)" />
    </>
  );
}
