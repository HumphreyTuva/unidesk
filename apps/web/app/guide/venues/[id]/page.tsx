'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Navigation } from 'lucide-react';
import { api } from '@/lib/api';
import type { Venue } from '../page';

type Detail = Venue & { steps: { id: string; caption: string; photo: boolean }[] };

export default function VenueDetail() {
  const { id } = useParams<{ id: string }>();
  const [v, setV] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [at, setAt] = useState(0);
  const rail = useRef<HTMLUListElement>(null);

  useEffect(() => { api<Detail>(`/venues/${id}`).then(setV).catch(e => setError(e.message)); }, [id]);

  const maps = v && v.lat != null && v.lng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}&travelmode=walking`
    : null;

  return (
    <main className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/guide/venues" aria-label="Back to venues" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      {!v && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
      {v && (
        <>
          <h1 className="mt-2 text-2xl font-extrabold">{v.name}</h1>
          {v.zone && <p className="mt-1 text-sm text-muted">{v.zone}</p>}
          {v.landmark && <p className="mt-3 rounded-2xl bg-brand-soft px-4 py-3 text-[15px] font-semibold">{v.landmark}</p>}

          {maps
            ? <a href={maps} target="_blank" rel="noopener noreferrer" className="mt-4 flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white"><Navigation size={20} aria-hidden /> Walk there with Google Maps</a>
            : <p className="mt-4 rounded-2xl border-[1.5px] border-dashed border-edge bg-white p-4 text-sm text-muted">The map pin for this building is not added yet.</p>}

          {v.steps.length > 0 && (
            <section className="mt-6" aria-label="Inside the building">
              <h2 className="text-[15px] font-extrabold">Once you are inside</h2>
              <ul
                ref={rail}
                onScroll={e => { const el = e.currentTarget; setAt(Math.round(el.scrollLeft / (el.clientWidth * 0.86))); }}
                className="mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none]"
              >
                {v.steps.map((s, i) => (
                  <li key={s.id} className="w-[86%] shrink-0 snap-center overflow-hidden rounded-[18px] border-[1.5px] border-line bg-white">
                    {s.photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/v1/venues/steps/${s.id}/photo`} alt={`Step ${i + 1}: ${s.caption}`} loading={i < 2 ? 'eager' : 'lazy'} className="aspect-[4/3] w-full object-cover" />
                    )}
                    <p className="p-3.5 text-[15px] font-semibold"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">{i + 1}</span>{s.caption}</p>
                  </li>
                ))}
              </ul>
              <div className="flex justify-center gap-1.5" aria-hidden>
                {v.steps.map((s, i) => <span key={s.id} className={`h-2 rounded-full transition-all ${i === at ? 'w-5 bg-brand' : 'w-2 bg-edge'}`} />)}
              </div>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-[15px] font-extrabold">Rooms here</h2>
            <ul className="mt-2 flex flex-wrap gap-2">{v.rooms.map(r => <li key={r} className="rounded-full border-[1.5px] border-edge bg-white px-3 py-1.5 text-[14px] font-bold">{r}</li>)}</ul>
          </section>
        </>
      )}
    </main>
  );
}
