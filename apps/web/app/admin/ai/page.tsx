'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

type Item = { id: string; title: string; updatedAt: string; messages: number; who: string; contact: string; school: string | null };
type Msg = { role: 'user' | 'assistant'; content: string; createdAt: string };
type Detail = { id: string; messages: Msg[] };
const PAGE = 30;
const when = (d: string) => new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Nairobi' });

export default function AdminAi() {
  const ok = useRequireAdmin(['ADMIN']);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const seq = useRef(0);

  const load = useCallback(async (skip: number, replace: boolean) => {
    const n = ++seq.current;
    setBusy(true); setError('');
    try {
      const r = await api<{ total: number; items: Item[] }>(`/admin/ai/conversations?take=${PAGE}&skip=${skip}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`);
      if (n !== seq.current) return;
      setTotal(r.total); setItems(prev => (replace ? r.items : [...prev, ...r.items]));
    } catch (e: any) { if (n === seq.current) setError(e.message); } finally { if (n === seq.current) setBusy(false); }
  }, [q]);
  useEffect(() => { if (!ok) return; const t = setTimeout(() => load(0, true), 250); return () => clearTimeout(t); }, [ok, load]);

  if (!ok) return null;

  const toggle = async (id: string) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id); setDetail(null);
    try { setDetail(await api<Detail>(`/admin/ai/conversations/${id}`)); } catch (e: any) { setError(e.message); }
  };

  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-10">
      <Link href="/admin" aria-label="Back to admin" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">AI questions</h1>
      <p className="mt-1 text-sm text-muted">What students ask the assistant, newest first. Look for questions it could not answer, then add that to the Guide. Only admins can see this. Students are told their chats are saved.</p>

      <label className="relative mt-4 block">
        <span className="sr-only">Search questions</span>
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a word in the questions or answers" className="h-[52px] w-full rounded-2xl border-[1.5px] border-edge bg-card pl-11 pr-4 text-[15px]" />
      </label>
      {error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}
      <p className="mt-4 text-[13px] text-muted">{total} {total === 1 ? 'chat' : 'chats'}</p>

      <ul className="cols-lg mt-2 flex flex-col gap-2.5">
        {items.map(c => (
          <li key={c.id} className="rounded-[18px] border-[1.5px] border-line bg-card p-4">
            <button type="button" onClick={() => toggle(c.id)} aria-expanded={open === c.id} className="w-full text-left">
              <p className="text-[15px] font-bold">{c.title}</p>
              <p className="mt-0.5 text-[12px] text-muted">{c.who}{c.school ? ` · ${c.school}` : ''} · {c.messages / 2} {c.messages / 2 === 1 ? 'question' : 'questions'} · {when(c.updatedAt)}</p>
            </button>
            {open === c.id && (
              <div className="mt-3 border-t border-line pt-3">
                {!detail && <Loader2 size={18} className="animate-spin text-brand-ink" aria-label="Loading" />}
                <ul className="flex flex-col gap-2">
                  {detail?.messages.map((m, i) => (
                    <li key={i} className={`max-w-[92%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug ${m.role === 'user' ? 'self-end bg-brand text-white' : 'self-start border-[1.5px] border-line bg-field'}`}>{m.content}</li>
                  ))}
                </ul>
                {c.contact && <p className="mt-2 break-all text-[12px] text-muted">{c.contact}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {!busy && items.length === 0 && !error && <p className="mt-4 rounded-[18px] border-[1.5px] border-dashed border-edge bg-card p-6 text-center text-[15px] text-muted">No chats yet.</p>}
      {busy && <div className="flex justify-center py-6 text-brand-ink"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
      {!busy && items.length < total && <button type="button" onClick={() => load(items.length, false)} className="mt-4 h-12 w-full rounded-2xl border-[1.5px] border-edge bg-card font-bold">Load more</button>}
    </main>
  );
}
