'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

type QuickLink = { id: string; title: string; url: string };
const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink placeholder:text-[#6B7794]';

export default function AdminLinks() {
  const ok = useRequireAdmin();
  const [links, setLinks] = useState<QuickLink[] | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('https://');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => { api<QuickLink[]>('/quick-links').then(setLinks).catch(e => setError(e.message)); }, []);
  useEffect(() => { if (ok) load(); }, [ok, load]);
  if (!ok) return null;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api('/admin/quick-links', 'POST', { title, url }); setTitle(''); setUrl('https://'); load(); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async (l: QuickLink) => {
    if (!window.confirm(`Remove “${l.title}”?`)) return;
    try { await api(`/admin/quick-links/${l.id}`, 'DELETE'); load(); } catch (err: any) { setError(err.message); }
  };

  return (
    <main className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/admin" aria-label="Back to admin" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Quick links</h1>
      <p className="mt-1 text-sm text-muted">Permanent shortcuts shown in the Guide. Keep them to official pages that do not go out of date.</p>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      {!links && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}

      <ul className="mt-4 flex flex-col gap-2">
        {links?.map(l => (
          <li key={l.id} className="flex items-center gap-3 rounded-[16px] border-[1.5px] border-line bg-white px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">{l.title}</span>
              <span className="block truncate text-[13px] text-muted">{l.url}</span>
            </span>
            <button type="button" onClick={() => remove(l)} aria-label={`Remove ${l.title}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-edge text-muted"><Trash2 size={18} aria-hidden /></button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-6 flex flex-col gap-3.5 rounded-[20px] border-[1.5px] border-line bg-white p-4">
        <p className="text-[15px] font-extrabold">Add a link</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lt" className="text-[13px] font-bold">Name</label>
          <input id="lt" value={title} onChange={e => setTitle(e.target.value)} placeholder="Hostel application" required maxLength={60} className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lu" className="text-[13px] font-bold">Link</label>
          <input id="lu" type="url" inputMode="url" autoCapitalize="none" value={url} onChange={e => setUrl(e.target.value)} required className={field} />
        </div>
        <button type="submit" disabled={busy} className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-70">
          {busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Plus size={20} aria-hidden />} Add link
        </button>
      </form>
    </main>
  );
}
