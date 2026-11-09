'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Search } from 'lucide-react';
import { OFFICES } from '@/content/offices';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

export default function Offices() {
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const words = norm(q).split(' ').filter(Boolean);
    if (!words.length) return OFFICES;
    // Every word the student typed must match a word in the office's name, room, building or keywords.
    // Letters match from the start of a word ("defer" finds "deferment"); numbers must match exactly, so "12" does not find room 112.
    return OFFICES.filter(o => {
      const hay = norm([o.name, o.room, o.building, ...o.keywords].join(' ')).split(' ');
      return words.every(w => (/^\d+$/.test(w) ? hay.includes(w) : hay.some(h => h.startsWith(w))));
    });
  }, [q]);

  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))]">
      <Link href="/guide" aria-label="Back to guide" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Important KU offices</h1>

      <label className="relative mt-4 block">
        <span className="sr-only">Search offices</span>
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand" aria-hidden />
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Try “fees”, “transcript” or “password”" className="h-[52px] w-full rounded-2xl border-[1.5px] border-edge bg-white pl-12 pr-4 text-[15px] placeholder:text-muted" />
      </label>

      <ul className="cols-lg mt-4 flex flex-col gap-2.5">
        {shown.map(o => (
          <li key={o.id} className="rounded-[18px] border-[1.5px] border-line bg-white p-4">
            <p className="text-[15px] font-bold leading-snug">{o.name}</p>
            <p className="mt-2 flex items-center gap-1.5 text-[14px] font-bold text-brand">
              <MapPin size={16} aria-hidden /> {o.building}, {o.room}
            </p>
          </li>
        ))}
      </ul>

      {shown.length === 0 && (
        <p className="mt-6 rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-6 text-center text-[15px] text-muted">
          No office matches “{q.trim()}”. Try another word, or ask in Chat.
        </p>
      )}
    </main>
  );
}
