'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

type Sort = 'most' | 'newest' | 'oldest';
type Who = { name: string; contact: string; school: string | null; at: string; note: string | null };
type Group = { unitCode: string; count: number; latest: string; earliest?: string; notes: string[]; who: Who[] };
const when = (d: string) => new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Nairobi' });

// The upload form opens with this unit and the school most of the requesters gave.
function uploadHref(g: Group) {
  const count: Record<string, number> = {};
  for (const w of g.who) if (w.school?.trim()) count[w.school.trim()] = (count[w.school.trim()] || 0) + 1;
  const school = Object.entries(count).sort((x, y) => y[1] - x[1])[0]?.[0];
  const qs = new URLSearchParams({ unit: g.unitCode });
  if (school) qs.set('school', school);
  return `/admin/papers?${qs}`;
}

export default function Requests() {
  const ok = useRequireAdmin(['ADMIN', 'SUPPORT']);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('most');
  const [find, setFind] = useState('');

  const load = useCallback(() => {
    api<Group[]>('/admin/paper-requests').then(setGroups).catch(e => setError(e.message));
  }, []);
  useEffect(() => { if (ok) load(); }, [ok, load]);

  if (!ok) return null;

  const term = find.trim().toUpperCase().replace(/\s+/g, '');
  const list = (groups ?? [])
    .filter(g => !term || g.unitCode.replace(/\s+/g, '').toUpperCase().includes(term))
    .sort((a, b) => sort === 'newest' ? +new Date(b.latest) - +new Date(a.latest)
      : sort === 'oldest' ? +new Date(a.earliest ?? a.latest) - +new Date(b.earliest ?? b.latest)
      : b.count - a.count || +new Date(b.latest) - +new Date(a.latest));

  const dismiss = async (unitCode: string) => {
    if (!window.confirm(`Dismiss all requests for ${unitCode}?`)) return;
    try { await api(`/admin/paper-requests/${encodeURIComponent(unitCode)}/reject`, 'POST'); load(); } catch (e: any) { setError(e.message); }
  };

  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/admin" aria-label="Back to admin" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Paper requests</h1>
      <p className="mt-1 text-sm text-muted">Uploading the paper closes its requests.</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input value={find} onChange={e => setFind(e.target.value)} placeholder="Find a unit code" autoCapitalize="characters" className="h-12 w-full rounded-2xl border-[1.5px] border-edge bg-card px-4 text-[15px] sm:flex-1" />
        <label className="flex items-center gap-3 sm:w-72">
          <span className="shrink-0 text-[13px] font-bold text-muted">Sort by</span>
          <select value={sort} onChange={e => setSort(e.target.value as Sort)} className="h-12 min-w-0 flex-1 rounded-2xl border-[1.5px] border-edge bg-card px-3 text-[15px] font-semibold">
            <option value="most">Most requested</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
      {sort === 'oldest' && <p className="mt-1.5 text-[12px] text-muted">Oldest first uses the date of each unit’s first request, so the ones waiting longest come first.</p>}

      {error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}
      {!groups && !error && <div className="flex justify-center py-8 text-brand-ink"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
      {groups && list.length === 0 && <p className="mt-6 rounded-[18px] border-[1.5px] border-dashed border-edge bg-card p-6 text-center text-[15px] text-muted">{groups.length === 0 ? 'No open requests.' : 'No unit matches.'}</p>}

      <ul className="cols-lg mt-4 flex flex-col gap-2.5">
        {list.map(g => (
          <li key={g.unitCode} className="rounded-[18px] border-[1.5px] border-line bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[17px] font-extrabold">{g.unitCode}</p>
                <p className="text-[13px] text-muted">{g.count} {g.count === 1 ? 'student' : 'students'} · latest {when(g.latest)}</p>
              </div>
              <div className="flex gap-2">
                <Link href={uploadHref(g)} className="flex h-11 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-bold text-white"><Upload size={16} aria-hidden /> Upload</Link>
                <button type="button" onClick={() => dismiss(g.unitCode)} aria-label={`Dismiss requests for ${g.unitCode}`} className="flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] border-edge text-muted"><X size={18} aria-hidden /></button>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(open === g.unitCode ? null : g.unitCode)} aria-expanded={open === g.unitCode} className="mt-2 text-[13px] font-bold text-brand-ink">{open === g.unitCode ? 'Hide who asked' : 'Who asked'}</button>
            {open === g.unitCode && (
              <ul className="mt-2 flex flex-col divide-y divide-line rounded-xl border-[1.5px] border-line">
                {g.who.map((w, i) => (
                  <li key={i} className="px-3 py-2.5">
                    <p className="text-[14px] font-bold">{w.name} <span className="font-medium text-muted">· {w.school || 'School not given'}</span></p>
                    <p className="break-all text-[13px] text-muted">{w.contact}</p>
                    <p className="text-[12px] text-muted">{when(w.at)}{w.note ? ` · “${w.note}”` : ''}</p>
                  </li>
                ))}
                {g.count > g.who.length && <li className="px-3 py-2 text-[12px] text-muted">and {g.count - g.who.length} more</li>}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
