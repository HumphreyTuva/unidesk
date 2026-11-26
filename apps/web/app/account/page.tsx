'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import ThemeSwitch from '@/components/ThemeSwitch';
import InviteCard from '@/components/InviteCard';

export default function Account() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  if (!ready || !user) return null;

  return (
    <main className="px-5 pt-10">
      <h1 className="text-2xl font-extrabold">Your account</h1>
      <div className="mt-5 rounded-2xl border-[1.5px] border-line bg-card p-5">
        <p className="text-lg font-bold">{user.name || user.username || user.email}</p>
        {user.username && <p className="mt-1 text-sm text-muted">Username: {user.username}</p>}
        {user.email && <p className="mt-1 text-sm text-muted">{user.email}</p>}
      </div>
      <div className="mt-4"><InviteCard /></div>
      <ThemeSwitch />
      <button
        type="button"
        onClick={async () => { await logout(); router.replace('/'); }}
        className="mt-6 h-12 w-full rounded-2xl border-[1.5px] border-edge bg-card font-bold text-ink"
      >
        Sign out
      </button>
    </main>
  );
}
