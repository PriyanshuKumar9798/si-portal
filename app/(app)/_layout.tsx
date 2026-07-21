// Auth-guarded shell. Everything under (app)/ requires a signed-in session.
// While auth is hydrating, render nothing (splash) — the guard flip must be
// atomic so unauthenticated routes are never briefly visible.

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { AppShell } from '../../src/components/AppShell';
import { useTheme } from '../../src/theme/ThemeContext';

export default function AuthedLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { c } = useTheme();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.mut} />
      </View>
    );
  }
  return (
    <AppShell>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="sis/index" options={{ title: 'Suggestive Indents' }} />
        <Stack.Screen name="sis/generate" options={{ title: 'Generate SIs' }} />
        <Stack.Screen name="sis/[id]" options={{ title: 'SI detail' }} />
        <Stack.Screen name="exceptions" options={{ title: 'Exceptions' }} />
        <Stack.Screen name="discrepancies" options={{ title: 'Mapping discrepancies' }} />
      </Stack>
    </AppShell>
  );
}
