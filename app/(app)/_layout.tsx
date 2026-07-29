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
      {/* Browser-tab titles are set here (route-level) so every page reads
          "<Page> · Burger Singh" in the tab. Section pages carry their own
          scope; deep pages (SI detail, ticket detail) override the doc title
          at runtime with the record id. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: 'Home · Burger Singh' }} />
        <Stack.Screen name="sis/index" options={{ title: 'SI Portal · Burger Singh' }} />
        <Stack.Screen name="sis/generate" options={{ title: 'Generate SIs · SI Portal' }} />
        <Stack.Screen name="sis/[id]" options={{ title: 'SI detail · SI Portal' }} />
        <Stack.Screen name="cycle" options={{ title: 'Indent cycle · SI Portal' }} />
        <Stack.Screen name="support" options={{ title: 'Support · Burger Singh' }} />
        <Stack.Screen name="add-ticket" options={{ title: 'Submit a ticket · Support' }} />
        <Stack.Screen name="exceptions" options={{ title: 'Exceptions · Burger Singh' }} />
        <Stack.Screen name="discrepancies" options={{ title: 'Mapping discrepancies · Burger Singh' }} />
      </Stack>
    </AppShell>
  );
}
