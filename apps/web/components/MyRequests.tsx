'use client';
import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';
import { useMyRequests } from '@/lib/useMyRequests';

// Shown on the Papers page for signed-in students who have asked for a paper.
export default function MyRequests() {
  const { items, isNew, markSeen } = useMyRequests();
  const shown = items.slice(0, 8);
  if (!shown.length) return null;

  return (
    <section className="mt-4" aria-labelledby="my-requests">
      <h2 id="my-requests" className="text-[15px] font-extrabold">Your requests</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {shown.map(r => {
          const ready = r.status === 'FULFILLED' && r.paperId && r.paper?.published;
          return (
            <li key={r.id} className={`flex items-center gap-3 rounded-[16px] border-[1.5px] bg-white px-4 py-3 ${isNew(r) ? 'border-brand' : 'border-line'}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ready ? 'bg-[#DFF0E4] text-[#2F6B45]' : 'bg-brand-soft text-brand'}`}>
                {ready ? <CheckCircle2 size={20} aria-hidden /> : <Clock size={20} aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{r.unitCode}{isNew(r) && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">New</span>}</span>
                <span className="block truncate text-[13px] text-muted">{ready ? `${r.paper?.title} (${r.paper?.year}) is ready` : r.status === 'FULFILLED' ? 'This paper is not available right now' : 'Waiting. We will add it when we have it.'}</span>
              </span>
              {ready && <Link href={`/papers/${r.paperId}`} onClick={() => markSeen(r.id)} className="flex h-10 shrink-0 items-center rounded-xl bg-brand px-4 text-[14px] font-bold text-white">Open</Link>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
