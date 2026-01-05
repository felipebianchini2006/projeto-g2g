'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { authApi, type AuthLoginInput, type AuthRegisterInput } from '../../lib/auth-api';
import type { AuthSession, AuthUser } from '../../lib/auth-types';

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (input: AuthLoginInput) => Promise<AuthSession>;
  register: (input: AuthRegisterInput) => Promise<AuthSession>;
  refresh: () => Promise<AuthSession | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  const applySession = useCallback((session: AuthSession) => {
    setUser(session.user);
    setAccessToken(session.accessToken);
    accessTokenRef.current = session.accessToken;
  }, []);

  const login = useCallback(
    async (input: AuthLoginInput) => {
      const session = await authApi.login(input);
      applySession(session);
      return session;
    },
    [applySession],
  );

  const register = useCallback(
    async (input: AuthRegisterInput) => {
      const session = await authApi.register(input);
      applySession(session);
      return session;
    },
    [applySession],
  );

  const refresh = useCallback(async () => {
    try {
      const session = await authApi.refresh();
      applySession(session);
      return session;
    } catch {
      if (!accessTokenRef.current) {
        setUser(null);
        setAccessToken(null);
      }
      return null;
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setAccessToken(null);
      accessTokenRef.current = null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await refresh();
    };
    run()
      .catch(() => {})
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      loading,
      login,
      register,
      refresh,
      logout,
    }),
    [user, accessToken, loading, login, register, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
