// Auth context — thin wrapper over the login/logout API and JWT storage.
// Uses SecureStore on native, AsyncStorage on web (SecureStore is native-only).
// The client library reads the token via a lazy getter registered on mount so
// api/client.ts never imports React.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { api, configureAuth } from '../api/client';
import type { AuthLoginResponse } from '../api/types';

type User = AuthLoginResponse['user'];

interface AuthCtx {
  user: User | null;
  token: string | null;
  isLoading: boolean;              // true during initial hydration
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY_TOKEN = 'si_portal_token_v1';
const KEY_USER  = 'si_portal_user_v1';

// Storage adapter — SecureStore on native, AsyncStorage on web.
const storage = {
  get: async (k: string): Promise<string | null> => {
    if (Platform.OS === 'web') return AsyncStorage.getItem(k);
    return SecureStore.getItemAsync(k);
  },
  set: async (k: string, v: string): Promise<void> => {
    if (Platform.OS === 'web') return AsyncStorage.setItem(k, v);
    return SecureStore.setItemAsync(k, v);
  },
  del: async (k: string): Promise<void> => {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(k);
    return SecureStore.deleteItemAsync(k);
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Register the token getter with the api client. Runs once — the getter
  // closes over the `token` state via a ref-like pattern so it always reads
  // the latest.
  useEffect(() => {
    configureAuth(() => token);
  }, [token]);

  // Hydrate from storage on mount.
  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([storage.get(KEY_TOKEN), storage.get(KEY_USER)]);
        if (t && u) {
          setToken(t);
          setUser(JSON.parse(u) as User);
        }
      } catch {
        // hydrate errors are non-fatal — start signed-out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, _password: string) => {
    // ── DEV bypass ────────────────────────────────────────────────────────
    // Backend isn't wired up yet — until it is, clicking "Sign in" always
    // succeeds with a mock owner. Any email typed in the field is echoed
    // back so the header pill shows something meaningful; empty inputs
    // fall back to a demo user. Swap this whole block back to
    // `await api.login(...)` the day the Nest server is running.
    const fakeToken = 'dev-bypass-token';
    const fakeUser = {
      id: 'dev-user-001',
      email: email.trim() || 'demo@burgersinghonline.com',
      name: email.trim() ? email.trim().split('@')[0] : 'Demo Owner',
      role: 'store' as const,
      storeIds: ['s-cp', 's-ind', 's-kor', 's-cyb', 's-pow', 's-hsr', 's-noi', 's-and'],
    };
    await Promise.all([
      storage.set(KEY_TOKEN, fakeToken),
      storage.set(KEY_USER, JSON.stringify(fakeUser)),
    ]);
    setToken(fakeToken);
    setUser(fakeUser);
  }, []);

  const signOut = useCallback(async () => {
    await Promise.all([storage.del(KEY_TOKEN), storage.del(KEY_USER)]);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user, token, isLoading,
    isAuthenticated: !!token && !!user,
    signIn, signOut,
  }), [user, token, isLoading, signIn, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
