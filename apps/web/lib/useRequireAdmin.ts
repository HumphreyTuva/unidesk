'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth';

type AdminRole = 'ADMIN' | 'SUPPORT';

// For admin pages. Returns true once we know the visitor is allowed in. Anyone else is sent away.
// This is only about what to show: every admin request is checked again on the server.
export function useRequireAdmin(allow: AdminRole[] = ['ADMIN']) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const allowed = !!user && (allow as string[]).includes(user.role);
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/login?next=/admin');
    else if (!allowed) router.replace('/');
  }, [ready, user, allowed, router]);
  return ready && allowed;
}
