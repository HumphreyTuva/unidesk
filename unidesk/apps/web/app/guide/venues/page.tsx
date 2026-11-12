'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Loader2, MapPin, Search } from 'lucide-react';
import { api } from '@/lib/api';

export type Venue = { id: string; name: string; zone: string | null; landmark: string | null; lat: number | null; lng: number | null; rooms: string[]; hasSteps: boolean };

export default function Venues() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Venue[] | null>(null);
  const [error, setError] = useState('');
  const seq = useRef(0);
  // /guide/venues?q=SOE6 (linked from the timetable) opens with that room already searched.
  useEffect(() => { const p = new URLSearchParams(window.location.search).get('q'); if (p) setQ(p.slice(0, 40)); }, []);

  useEffect(() => {
    const n = ++seq.current;
    const t = setTimeout(() => {
      api<Venue[]>(`/venues?q=${encodeURIComponent(q.trim())}`)
        .then(r => { if (n === seq.current) { setList(r); setError(''); } })
        .catch(e => { if (n === seq.current) setError(e.message); });
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q]);

  const code = q.trim().toUpperCase().replace(/[\s-]+/g, '');
  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/guide" aria-label="Back to guide" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Find a venue</h1>
      <p className="mt-1 text-sm text-muted">Type the room on your timetable, like OML5 or SOE6.</p>

      <label className="relative mt-4 block">
        <span className="sr-only">Room code or building</span>
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand" aria-hidden />
        <input type="search" value={q} onChange={e => setQ(e.target.value)} autoCapitalize="characters" autoComplete="off" placeholder="Room code or building" className="h-[52px] w-full rounded-2xl border-[1.5px] border-edge bg-white pl-12 pr-4 text-[15px] placeholder:text-muted" />
      </label>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      {!list && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}

      <ul className="cols-lg mt-4 flex flex-col gap-2.5">
        {list?.map(v => {
          const hit = code ? v.rooms.find(r => r.startsWith(code)) : undefined;
          return (
            <li key={v.id}>
              <Link href={`/guide/venues/${v.id}`} className="flex items-center gap-3.5 rounded-[18px] border-[1.5px] border-line bg-white p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><MapPin size={22} aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">{v.name}</span>
                  <span className="block truncate text-[13px] text-muted">{hit ? `${hit} is here` : v.zone || v.rooms.slice(0, 4).join(', ')}</span>
                </span>
                <ChevronRight size={20} className="text-muted" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>

      {list && list.length === 0 && (
        <p className="mt-6 rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-6 text-center text-[15px] text-muted">
          {q.trim() ? <>No venue found for “{q.trim()}”. Check the code, or ask in Chat.</> : 'Venues are being added. Check back soon.'}
        </p>
      )}
    </main>
  );
}
