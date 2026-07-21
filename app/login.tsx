// Login — email/password, follows the design brief: password login is
// primary; "Continue with Google" is a placeholder button (backend has SSO
// wired but v1 flow is passwords). Redirects to /sis on success.

import { useEffect, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { useTheme } from '../src/theme/ThemeContext';
import { Body, Button, Field, MicroLabel } from '../src/components/ui';
import { font, radius, weight, fontFamily } from '../src/theme/tokens';
import type { ApiError } from '../src/api/types';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth();
  const { c } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If a session hydrates while we're on the login screen, bounce to SIs.
  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/sis');
  }, [authLoading, isAuthenticated, router]);

  const disabled = submitting || email.trim().length === 0 || password.length === 0;

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/sis');
    } catch (e) {
      const err = e as ApiError;
      setError(err?.message ?? 'Could not sign in — check your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 400 }}>
        {/* Brand block */}
        <View style={{ alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <View style={{
            width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.redSolid,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20, fontFamily }}>B</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: c.fg, fontSize: 20, fontWeight: weight.bold as any, fontFamily }}>Burger Singh</Text>
            <MicroLabel style={{ marginTop: 4 }}>SI Portal</MicroLabel>
          </View>
        </View>

        {/* Card */}
        <View style={{
          borderWidth: 1, borderColor: c.border, borderRadius: radius.lg,
          backgroundColor: c.card, padding: 24, gap: 16,
        }}>
          <View>
            <Body size="h3" wt="semibold">Sign in</Body>
            <Body mut style={{ marginTop: 4 }}>Enter your work email and password to continue.</Body>
          </View>

          {error && (
            <View style={{ backgroundColor: c.rBg, borderRadius: radius.md, padding: 12 }}>
              <Text style={{ color: c.rTx, fontSize: font.body, fontWeight: weight.semibold as any, fontFamily }}>
                Sign-in failed
              </Text>
              <Text style={{ color: c.mut, fontSize: font.small, marginTop: 4, fontFamily }}>{error}</Text>
            </View>
          )}

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@burgersinghonline.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoFocus
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          <Button
            label={submitting ? 'Signing in…' : 'Sign in'}
            onPress={onSubmit}
            disabled={disabled}
            loading={submitting}
            fullWidth
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
            <Text style={{ color: c.mut, fontSize: font.caption, fontFamily }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
          </View>

          <Button
            label="Continue with Google"
            variant="secondary"
            fullWidth
            onPress={() => setError('Google SSO is not enabled yet — please sign in with email + password.')}
          />
        </View>

        <Body mut size="caption" style={{ textAlign: 'center', marginTop: 20 }}>
          Access is invite-only. Contact the ops team if you need an account.
        </Body>
      </KeyboardAvoidingView>
    </View>
  );
}
