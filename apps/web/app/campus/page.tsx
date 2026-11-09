'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Megaphone, Plus, Search, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

type Club = { id: string; name: string; category: string | null; description: string | null; contact: string | null; meetingTimes: string | null; members: number };
type Ad = { id: string; title: string; description: string | null; price: number | null; image: boolean };
type Tab = 'clubs' | 'market';
const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink placeholder:text-[#6B7794]';

export default function Campus() {
  const [tab, setTab] = useState<Tab>('clubs');
  return (
    <main className="wide px-5 pt-[calc(24px+env(safe-area-inset-top))] pb-8">
      <h1 className="text-2xl font-extrabold">Campus</h1>
      <div role="tablist" className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-brand-soft p-1">
        {([['clubs', 'Clubs'], ['market', 'Marketplace']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`h-11 rounded-xl text-[15px] font-bold ${tab === k ? 'bg-white text-brand shadow-sm' : 'text-muted'}`}>{l}</button>
        ))}
      </div>
      {tab === 'clubs' ? <Clubs /> : <Market />}
    </main>
  );
}

function Clubs() {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState<Club[] | null>(null);
  const [mine, setMine] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: '', category: '', description: '', contact: '', meetingTimes: '' });
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api<Club[]>('/campus/clubs').then(setList).catch(e => setError(e.message));
    if (user) api<string[]>('/campus/clubs/mine').then(setMine).catch(() => {});
  }, [user]);
  useEffect(load, [load]);

  const toggle = async (c: Club) => {
    if (!user) { window.location.href = '/login?next=/campus'; return; }
    setBusy(c.id); setError('');
    try { const was = mine.includes(c.id); await api(`/campus/clubs/${c.id}/join`, was ? 'DELETE' : 'POST'); toast.ok(was ? `Left ${c.name}` : `Joined ${c.name}`); load(); } catch (e: any) { toast.error(e.message); } finally { setBusy(''); }
  };
  const suggest = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy('new'); setError('');
    try { await api('/campus/clubs', 'POST', f); setAdding(false); setF({ name: '', category: '', description: '', contact: '', meetingTimes: '' }); toast.ok('Sent. We will check it and add it to the list.'); }
    catch (err: any) { setError(err.message); } finally { setBusy(''); }
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <section className="mt-4">
      {error && <p role="alert" className="mb-3 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      {note && <p className="mb-3 rounded-xl bg-[#E3F6EA] px-3.5 py-2.5 text-sm font-medium text-[#116B35]">{note}</p>}
      {!list && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
      {list?.length === 0 && <p className="rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-6 text-center text-[15px] text-muted">No clubs yet. Know one? Suggest it below.</p>}
      <ul className="cols-lg flex flex-col gap-2.5">
        {list?.map(c => {
          const joined = mine.includes(c.id);
          return (
            <li key={c.id} className="rounded-[18px] border-[1.5px] border-line bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold">{c.name}</p>
                  <p className="text-[13px] text-muted">{[c.category, `${c.members} member${c.members === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</p>
                </div>
                <button type="button" disabled={busy === c.id} onClick={() => toggle(c)} className={`h-10 shrink-0 rounded-full px-4 text-[14px] font-bold ${joined ? 'border-[1.5px] border-edge bg-white text-ink' : 'bg-brand text-white'}`}>{joined ? 'Joined' : 'Join'}</button>
              </div>
              {c.description && <p className="mt-2 text-[14px]">{c.description}</p>}
              {(c.meetingTimes || c.contact) && <p className="mt-2 text-[13px] text-muted">{[c.meetingTimes && `Meets: ${c.meetingTimes}`, c.contact && `Contact: ${c.contact}`].filter(Boolean).join(' · ')}</p>}
            </li>
          );
        })}
      </ul>

      {!user ? null : adding ? (
        <form onSubmit={suggest} className="mt-4 flex flex-col gap-3 rounded-[20px] border-[1.5px] border-line bg-white p-4">
          <p className="text-[15px] font-extrabold">Suggest a club</p>
          <input value={f.name} onChange={set('name')} required maxLength={80} placeholder="Club or society name" aria-label="Name" className={field} />
          <input value={f.category} onChange={set('category')} maxLength={40} placeholder="Type, e.g. Sports, Faith, Academic" aria-label="Type" className={field} />
          <textarea value={f.description} onChange={set('description')} rows={3} maxLength={400} placeholder="What does it do?" aria-label="Description" className="w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] p-3 text-[15px]" />
          <input value={f.meetingTimes} onChange={set('meetingTimes')} maxLength={120} placeholder="When it meets (optional)" aria-label="Meeting times" className={field} />
          <input value={f.contact} onChange={set('contact')} required maxLength={120} placeholder="Contact: phone, email or Instagram" aria-label="Contact" className={field} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(false)} className="h-12 flex-1 rounded-2xl border-[1.5px] border-edge font-bold">Cancel</button>
            <button type="submit" disabled={busy === 'new'} className="h-12 flex-1 rounded-2xl bg-brand font-bold text-white disabled:opacity-60">Send</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => { setAdding(true); setNote(''); }} className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-brand font-bold text-brand"><Plus size={20} aria-hidden /> Suggest a club</button>
      )}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-muted"><Users size={14} aria-hidden /> Clubs are checked before they appear.</p>
    </section>
  );
}

function Market() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [list, setList] = useState<Ad[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { api<Ad[]>(`/campus/market?q=${encodeURIComponent(q.trim())}`).then(r => { setList(r); setError(''); }).catch(e => setError(e.message)); }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <section className="mt-4">
      <label className="relative block">
        <span className="sr-only">Search the marketplace</span>
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand" aria-hidden />
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search products and services" className="h-[52px] w-full rounded-2xl border-[1.5px] border-edge bg-white pl-12 pr-4 text-[15px] placeholder:text-muted" />
      </label>
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      {!list && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
      {list?.length === 0 && <p className="mt-4 rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-6 text-center text-[15px] text-muted">{q ? `Nothing found for “${q.trim()}”.` : 'No ads yet. Do you run a business near campus? Advertise here.'}</p>}
      <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {list?.map(a => (
          <li key={a.id}>
            <Link href={`/campus/market/${a.id}`} className="block overflow-hidden rounded-[18px] border-[1.5px] border-line bg-white">
              {a.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={`/api/v1/campus/market/${a.id}/image`} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                : <div className="flex aspect-square w-full items-center justify-center bg-brand-soft text-brand"><Megaphone size={32} aria-hidden /></div>}
              <div className="p-3"><p className="line-clamp-2 text-[14px] font-bold leading-snug">{a.title}</p>{a.price != null && <p className="mt-1 text-[14px] font-extrabold text-brand">KSh {a.price.toLocaleString()}</p>}</div>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={user ? '/campus/advertise' : '/login?next=/campus/advertise'} className="mt-5 flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white"><Megaphone size={20} aria-hidden /> Advertise your business</Link>
      {user && <Link href="/campus/ads" className="mt-2 flex h-12 items-center justify-center rounded-2xl border-[1.5px] border-edge bg-white font-bold">My ads</Link>}
    </section>
  );
}
