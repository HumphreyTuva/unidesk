'use client';
import Link from 'next/link';
import { Bell, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAdminCounts } from '@/lib/useAdminCounts';
import Logo from './Logo';

export default function HomeHeader() {
  const { user, ready } = useAuth();
  const counts = useAdminCounts(); // staff only: null for everyone else, so students never see this
  const initial = (user?.name || user?.username || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Logo />
        <div>
          <div className="text-[13px] font-medium text-muted">{user?.name ? `Hello, ${user.name.split(' ')[0]}` : 'Welcome'}</div>
          <div className="text-lg font-extrabold leading-tight">What do you need today?</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {counts && counts.total > 0 && (
          <Link href="/admin" aria-label={`${counts.total} waiting in admin`} className="relative flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-edge bg-card text-brand-ink">
            <Bell size={20} aria-hidden />
            <span className="absolute -right-1 -top-1 flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#D92D20] px-1 text-[11px] font-extrabold text-white">{counts.total > 99 ? '99+' : counts.total}</span>
          </Link>
        )}
        <Link
          href={user ? '/account' : '/login'}
          aria-label={user ? 'Your account' : 'Sign in'}
          className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-edge bg-card text-brand-ink"
        >
          {ready && user ? <span className="text-base font-extrabold">{initial}</span> : <User size={22} aria-hidden />}
        </Link>
      </div>
    </div>
  );
}
