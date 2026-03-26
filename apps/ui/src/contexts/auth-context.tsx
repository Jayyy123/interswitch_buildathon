'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { AuthUser } from '@/lib/auth-types';
import {
  clearSession,
  getStoredToken,
  getStoredUser,
  persistSession,
  syncCookiesFromStorage,
} from '@/lib/session';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  hydrated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const hydrated = true;

  useEffect(() => {
    syncCookiesFromStorage();
  }, []);

  const login = useCallback((t: string, u: AuthUser) => {
    persistSession(t, u);
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, hydrated, login, logout }),
    [user, token, hydrated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
