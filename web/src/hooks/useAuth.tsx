import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthResponse, EmployeeDto } from '@shared';
import { api, getToken, setToken, setUnauthorizedHandler } from '../lib/api';

interface AuthState {
  employee: EmployeeDto | null;
  checking: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<EmployeeDto | null>(null);
  const [checking, setChecking] = useState(() => !!getToken());

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setEmployee(null);
    });
    if (getToken()) {
      api<EmployeeDto>('/auth/me')
        .then(setEmployee)
        .catch(() => setToken(null))
        .finally(() => setChecking(false));
    }
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api<AuthResponse>('/auth/login', { body: { username, password } });
    setToken(res.token);
    setEmployee(res.employee);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { body: {} });
    } finally {
      setToken(null);
      setEmployee(null);
    }
  }, []);

  return <AuthContext.Provider value={{ employee, checking, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
