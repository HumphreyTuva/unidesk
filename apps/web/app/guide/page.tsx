'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, CalendarDays, ChevronRight, ExternalLink, FileText, MapPin } from 'lucide-react';
import { api } from '@/lib/api';

type QuickLink = { id: string; title: string; url: string };

const ITEMS = [
  { href: '/guide/call-off', title: 'Call off a semester', sub: 'Steps and a ready letter', Icon: FileText },
  { href: '/guide/offices', title: 'Important KU offices', sub: 'Which office, which room', Icon: Building2 },
  { href: '/guide/timetable', title: 'Timetable', sub: 'Classes and exams', Icon: CalendarDays },
  { href: '/guide/venues', title: 'Find a venue', sub: 'Directions to rooms', Icon: MapPin },
];

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

export default function Guide() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  useEffect(() => { api<QuickLink[]>('/quick-links').then(setLinks).catch(() => {}); }, []); // no links is fine: the section just hides

  return (
    <main className="wide px-5 pt-[calc(24px+env(safe-area-inset-top))]">
      <h1 className="text-2xl font-extrabold">Guide</h1>

      <ul className="cols-lg mt-4 flex flex-col gap-2.5">
        {ITEMS.map(({ href, title, sub, Icon }) => (
          <li key={href}>
            <Link href={href} className="flex h-16 items-center gap-3.5 rounded-[18px] border-[1.5px] border-line bg-white px-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon size={22} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{title}</span>
                <span className="block text-[13px] text-muted">{sub}</span>
              </span>
              <ChevronRight size={20} className="text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      {links.length > 0 && (
        <section className="mt-7">
          <h2 className="text-[17px] font-extrabold">Quick links</h2>
          <ul className="cols-lg mt-3 flex flex-col gap-2.5">
            {links.map(l => (
              <li key={l.id}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex h-16 items-center gap-3.5 rounded-[18px] border-[1.5px] border-line bg-white px-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-soft text-amber-ink"><ExternalLink size={20} aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold">{l.title}</span>
                    <span className="block truncate text-[13px] text-muted">{host(l.url)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
