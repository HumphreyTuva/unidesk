'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

type T = { id: string; who: string; last: string; at: string; waiting: boolean };

export default function Inbox() {
  const ok = useRequireAdmin(['ADMIN', 'SUPPORT']);
  const [list, setList] = useState<T[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ok) return;
    const load = () => { if (document.visibilityState === 'visible') api<T[]>('/admin/chat/threads').then(r => { setList(r); setError(''); }).catch(e => setError(e.message)); };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [ok]);
  if (!ok) return null;

  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/admin" aria-label="Back to admin" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Support inbox</h1>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      {!list && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
      {list?.length === 0 && <p className="mt-6 rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-6 text-center text-[15px] text-muted">No open conversations.</p>}
      <ul className="cols-lg mt-4 flex flex-col gap-2.5">
        {list?.map(t => (
          <li key={t.id}>
            <Link href={`/admin/chat/${t.id}`} className="flex items-center gap-3 rounded-[18px] border-[1.5px] border-line bg-white p-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{t.who}</span>
                <span className="block truncate text-[13px] text-muted">{t.last}</span>
              </span>
              {t.waiting && <span className="rounded-full bg-[#FFF4DB] px-2.5 py-1 text-[12px] font-bold text-[#6B4A00]">Waiting</span>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
