'use client';
import { useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

// Personal details students type into letters (name, admission number, phone, email, school, course).
// Saved on this device only, and only while logged in, so the next letter is pre-filled. Cleared on logout.
export const PROFILE_KEYS = ['name', 'adm', 'phone', 'email', 'school', 'course'] as const;
export type SavedProfile = Partial<Record<(typeof PROFILE_KEYS)[number], string>>;
const key = (id: string) => `unidesk_profile_${id}`;

export function useSavedProfile(fill: (p: SavedProfile) => void) {
  const { user, ready } = useAuth();
  const uid = user?.id;

  useEffect(() => {
    if (!ready || !uid) return;
    let saved: SavedProfile = {};
    try { saved = JSON.parse(localStorage.getItem(key(uid)) || '{}'); } catch {}
    const p: SavedProfile = { ...saved };
    if (!p.name && user?.name) p.name = user.name;
    if (!p.email && user?.email) p.email = user.email;
    fill(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, uid]);

  const save = useCallback((v: Record<string, string>) => {
    if (!uid) return;
    const p: SavedProfile = {};
    PROFILE_KEYS.forEach(k => { if (v[k]?.trim()) p[k] = v[k].trim(); });
    try { localStorage.setItem(key(uid), JSON.stringify(p)); } catch {}
  }, [uid]);

  return { save, loggedIn: !!uid };
}
