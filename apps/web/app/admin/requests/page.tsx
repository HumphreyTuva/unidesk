'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

type Group = { unitCode: string; count: number; latest: string; notes: string[] };

export default function Requests() {
  const ok = useRequireAdmin(['ADMIN', 'SUPPORT']);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<Group[]>('/admin/paper-requests').then(setGroups).catch(e => setError(e.message));
  }, []);
  useEffect(() => { if (ok) load(); }, [ok, load]);

  if (!ok) return null;

  const dismiss = async (unitCode: string) => {
    if (!window.confirm(`Dismiss all requests for ${unitCode}?`)) return;
    try { await api(`/admin/paper-requests/${encodeURIComponent(unitCode)}/reject`, 'POST'); load(); } catch (e: any) { setError(e.message); }
  };

  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/admin" aria-label="Back to admin" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Paper requests</h1>
      <p className="mt-1 text-sm text-muted">Most wanted first. Uploading the paper closes its requests.</p>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      {!groups && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
      {groups?.length === 0 && <p className="mt-6 rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-6 text-center text-[15px] text-muted">No open requests.</p>}

      <ul className="cols-lg mt-4 flex flex-col gap-2.5">
        {groups?.map(g => (
          <li key={g.unitCode} className="rounded-[18px] border-[1.5px] border-line bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[17px] font-extrabold">{g.unitCode}</p>
                <p className="text-[13px] text-muted">{g.count} {g.count === 1 ? 'student' : 'students'}</p>
              </div>
              <div className="flex gap-2">
                <Link href="/admin/papers" className="flex h-11 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-bold text-white"><Upload size={16} aria-hidden /> Upload</Link>
                <button type="button" onClick={() => dismiss(g.unitCode)} aria-label={`Dismiss requests for ${g.unitCode}`} className="flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] border-edge text-muted"><X size={18} aria-hidden /></button>
              </div>
            </div>
            {g.notes.length > 0 && <ul className="mt-2 list-disc pl-5 text-[13px] text-muted">{g.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
          </li>
        ))}
      </ul>
    </main>
  );
}
