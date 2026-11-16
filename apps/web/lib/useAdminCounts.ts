'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from './api';
import { useAuth } from './auth';

export type AdminCounts = { chat: number; requests: number; campus: number; total: number };

// What is waiting for staff: chats to answer, open paper requests, ads/clubs to approve. Only fetched for admin and support accounts.
export function useAdminCounts(): AdminCounts | null {
  const { user, ready } = useAuth();
  const path = usePathname();
  const staff = ready && (user?.role === 'ADMIN' || user?.role === 'SUPPORT');
  const [c, setC] = useState<AdminCounts | null>(null);

  useEffect(() => {
    if (!staff) { setC(null); return; }
    let live = true;
    const load = () => api<AdminCounts>('/admin/overview').then(r => { if (live) setC(r); }).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    const vis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', vis);
    return () => { live = false; clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [staff, path]);

  return c;
}
