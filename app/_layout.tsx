// Root layout — providers only. QueryClient singleton is created once; Auth &
// Theme providers wrap the entire tree so every route (login included) has
// theme access.

import { useMemo } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { AuthProvider } from '../src/auth/AuthContext';
import { installWebFocusStyles } from '../src/theme/webFocusStyle';
import { ToastProvider } from '../src/components/Toast';
import { NavGuardProvider } from '../src/components/NavGuardProvider';
import { TicketStoreProvider } from '../src/support/TicketStore';

// Install the a11y focus shim ONCE, at module load, before any component
// mounts. Web-only; no-op on native. See webFocusStyle.ts for rationale.
installWebFocusStyles();

export default function RootLayout() {
  const qc = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  }), []);

  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <NavGuardProvider>
              <TicketStoreProvider>
                <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                  <Stack.Screen name="login" options={{ title: 'Sign in · Burger Singh' }} />
                  <Stack.Screen name="(app)" options={{ title: 'Burger Singh' }} />
                </Stack>
              </TicketStoreProvider>
            </NavGuardProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
