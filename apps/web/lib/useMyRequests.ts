'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from './api';
import { useAuth } from './auth';

export type MyRequest = { id: string; unitCode: string; status: 'OPEN' | 'FULFILLED' | 'REJECTED'; paperId: string | null; createdAt: string; paper?: { title: string; year: number; published: boolean } | null };

const SEEN = 'unidesk_seen_requests';
const EVENT = 'unidesk:requests-seen';
const readSeen = (): string[] => { try { const v = JSON.parse(localStorage.getItem(SEEN) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

// A student's own paper requests, and how many have a paper ready that they have not opened yet.
export function useMyRequests() {
  const { user, ready } = useAuth();
  const path = usePathname();
  const [items, setItems] = useState<MyRequest[]>([]);
  const [seen, setSeen] = useState<string[]>([]);

  useEffect(() => {
    if (!ready || !user) { setItems([]); return; }
    let live = true;
    api<MyRequest[]>('/paper-requests/mine').then(r => { if (live) setItems(r.filter(x => x.status !== 'REJECTED')); }).catch(() => {});
    return () => { live = false; };
  }, [ready, user?.id, path]);

  useEffect(() => {
    const sync = () => setSeen(readSeen());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const isNew = useCallback((r: MyRequest) => r.status === 'FULFILLED' && !!r.paperId && !!r.paper?.published && !seen.includes(r.id), [seen]);
  const markSeen = useCallback((id: string) => {
    try { localStorage.setItem(SEEN, JSON.stringify([...new Set([...readSeen(), id])].slice(-200))); } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { items, newCount: items.filter(isNew).length, isNew, markSeen };
}
