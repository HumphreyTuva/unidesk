'use client';
import Link from 'next/link';
import { User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Logo from './Logo';

export default function HomeHeader() {
  const { user, ready } = useAuth();
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
      <Link
        href={user ? '/account' : '/login'}
        aria-label={user ? 'Your account' : 'Sign in'}
        className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-edge bg-white text-brand"
      >
        {ready && user ? <span className="text-base font-extrabold">{initial}</span> : <User size={22} aria-hidden />}
      </Link>
    </div>
  );
}
