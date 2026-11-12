'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

export type User = { id: string; name: string | null; email: string | null; username: string | null; role: 'STUDENT' | 'SUPPORT' | 'ADMIN' };
type AuthState = { user: User | null; ready: boolean; setUser: (u: User | null) => void; logout: () => Promise<void> };

const Ctx = createContext<AuthState>({ user: null, ready: false, setUser: () => {}, logout: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<User>('/auth/me').then(setUser).catch(() => setUser(null)).finally(() => setReady(true));
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', 'POST').catch(() => {});
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, ready, setUser, logout }}>{children}</Ctx.Provider>;
}
