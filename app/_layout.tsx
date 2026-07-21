// Root layout — providers only. QueryClient singleton is created once; Auth &
// Theme providers wrap the entire tree so every route (login included) has
// theme access.

import { useMemo } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { AuthProvider } from '../src/auth/AuthContext';

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
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="(app)" />
          </Stack>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
