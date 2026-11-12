'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';

// Pages without the bottom bar.
const BARE = ['/login', '/admin'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const bare = BARE.some(p => path.startsWith(p));

  // Desktop shortcut: Ctrl+Shift+A opens the admin area. (The server still checks the role; this only navigates.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        router.push('/admin');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return (
    <>
      {!bare && <Sidebar />}
      {/* Phones and tablets: one centred app column with a bottom bar. Desktop (lg): sidebar on the left, wide content on the right. */}
      <div className={`shell-content mx-auto min-h-screen w-full max-w-[480px] bg-surface md:max-w-[640px] lg:max-w-none ${bare ? '' : 'pb-nav lg:pb-0 lg:pl-[260px]'}`}>
        {children}
        {!bare && <BottomNav />}
      </div>
    </>
  );
}
