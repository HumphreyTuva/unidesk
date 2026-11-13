'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMyRequests } from '@/lib/useMyRequests';
import { BookOpen, FileText, Home, LayoutGrid, MessageCircle } from 'lucide-react';

export const TABS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/papers', label: 'Papers', Icon: FileText },
  { href: '/guide', label: 'Guide', Icon: BookOpen },
  { href: '/chat', label: 'Chat', Icon: MessageCircle },
  { href: '/campus', label: 'Campus', Icon: LayoutGrid },
];

export default function BottomNav() {
  const path = usePathname();
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const { newCount } = useMyRequests();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto grid lg:hidden max-w-[480px] md:max-w-[640px] grid-cols-5 border-t border-line bg-white px-2 pt-2"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const on = active(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 text-[11px] font-bold ${on ? 'text-brand' : 'text-muted'}`}
          >
            <span className="relative flex h-8 w-[52px] items-center justify-center">
              {on && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-2xl bg-brand-soft" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
              <Icon className="relative" size={22} strokeWidth={2} aria-hidden />
              {href === '/papers' && newCount > 0 && <span className="absolute right-2 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E2574C] px-1 text-[11px] font-bold text-white" aria-label={`${newCount} paper${newCount > 1 ? 's' : ''} ready`}>{newCount}</span>}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
