'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Logo from './Logo';
import { TABS } from './BottomNav';

// Desktop navigation (screens 1024px and wider). Phones and tablets keep the bottom bar.
export default function Sidebar() {
  const path = usePathname();
  const { user, ready } = useAuth();
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const link = (on: boolean) => `flex h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-bold ${on ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-surface'}`;

  return (
    <aside aria-label="Sidebar" className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-line bg-white px-4 py-6 lg:flex">
      <Link href="/" className="flex items-center gap-3 px-2" aria-label="UniDesk home">
        <Logo />
        <span className="text-xl font-extrabold">UniDesk</span>
      </Link>
      <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
        {TABS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={link(active(href))}>
            <Icon size={22} aria-hidden /> {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
        {ready && user && user.role !== 'STUDENT' && <Link href="/admin" className={link(path.startsWith('/admin'))}><Settings size={22} aria-hidden /> Admin</Link>}
        <Link href={user ? '/account' : '/login'} className={link(path.startsWith('/account') || path.startsWith('/login'))}>
          <User size={22} aria-hidden /> <span className="truncate">{ready && user ? user.name || user.username || 'Your account' : 'Sign in'}</span>
        </Link>
      </div>
    </aside>
  );
}
