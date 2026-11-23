import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, clearStoredToken, getStoredToken, setStoredToken } from '../lib/api';
import type { Profile } from '../types/database';

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Profile>;
  setupInitialAdmin: (input: {
    full_name: string;
    email: string;
    password: string;
  }) => Promise<Profile>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch<{ user: Profile }>('/api/auth/me');
      setUser(res.user);
    } catch {
      clearStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: Profile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const setupInitialAdmin = async (input: {
    full_name: string;
    email: string;
    password: string;
  }) => {
    const res = await apiFetch<{ token: string; user: Profile }>('/api/auth/setup-admin', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, setupInitialAdmin, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
