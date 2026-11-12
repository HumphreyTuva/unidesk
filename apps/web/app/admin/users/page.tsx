'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ban, Loader2, RotateCcw, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

type Role = 'STUDENT' | 'SUPPORT' | 'ADMIN';
type Summary = { total: number; today: number; last7: number; last30: number; blocked: number; staff: number; google: number; password: number; byDay: { date: string; count: number }[] };
type Row = { id: string; name: string | null; email: string | null; username: string | null; role: Role; joined: string; blocked: boolean; via: string; requests: number; downloads: number; payments: number; chats: number };
type Filter = 'all' | 'staff' | 'blocked';

const PAGE = 30;
const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' });

export default function Users() {
  const ok = useRequireAdmin(['ADMIN']);
  const { user: me } = useAuth();
  const [sum, setSum] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (skip: number, replace: boolean) => {
    const n = ++seq.current;
    setBusy(true); setError('');
    try {
      const r = await api<{ total: number; items: Row[] }>(`/admin/users?take=${PAGE}&skip=${skip}&filter=${filter}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`);
      if (n !== seq.current) return;
      setTotal(r.total); setRows(prev => (replace ? r.items : [...prev, ...r.items]));
    } catch (e: any) { if (n === seq.current) setError(e.message); } finally { if (n === seq.current) setBusy(false); }
  }, [q, filter]);

  useEffect(() => { if (ok) api<Summary>('/admin/users/summary').then(setSum).catch(e => setError(e.message)); }, [ok]);
  useEffect(() => { if (!ok) return; const t = setTimeout(() => load(0, true), 250); return () => clearTimeout(t); }, [ok, load]);

  if (!ok) return null;

  const act = async (fn: () => Promise<unknown>) => {
    try { await fn(); await load(0, true); api<Summary>('/admin/users/summary').then(setSum).catch(() => {}); } catch (e: any) { setError(e.message); }
  };
  const setRole = (r: Row, role: Role) => {
    if (role === r.role) return;
    if (!window.confirm(`Change ${r.email || r.username || 'this account'} to ${role}?`)) return;
    act(() => api(`/admin/users/${r.id}/role`, 'PUT', { role }));
  };
  const toggleBlock = (r: Row) => {
    const label = r.email || r.username || 'this account';
    if (!window.confirm(r.blocked ? `Let ${label} sign in again?` : `Block ${label}? They will be signed out and cannot sign in. Nothing is deleted.`)) return;
    act(() => api(`/admin/users/${r.id}/${r.blocked ? 'unblock' : 'block'}`, 'POST'));
  };

  const max = Math.max(1, ...(sum?.byDay.map(d => d.count) ?? [1]));
  const chip = (on: boolean) => `h-10 rounded-full border-[1.5px] px-4 text-[14px] font-bold ${on ? 'border-brand bg-brand text-white' : 'border-edge bg-white'}`;

  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-10">
      <Link href="/admin" aria-label="Back to admin" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Users</h1>
      <p className="mt-1 text-sm text-muted">Everyone who has signed up. Only admins can see this. Downloads are papers a student has unlocked or downloaded.</p>

      {sum && (
        <>
          <section className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[['Total', sum.total], ['Today', sum.today], ['Last 7 days', sum.last7], ['Last 30 days', sum.last30]].map(([k, v]) => (
              <div key={k as string} className="rounded-[18px] border-[1.5px] border-line bg-white p-3.5"><p className="text-[24px] font-extrabold leading-none">{v}</p><p className="mt-1 text-[12px] font-semibold text-muted">{k}</p></div>
            ))}
          </section>
          <p className="mt-2 text-[12px] text-muted">{sum.google} with Google, {sum.password} with a password (some have both) · {sum.staff} staff · {sum.blocked} blocked</p>
          <section className="mt-3 rounded-[18px] border-[1.5px] border-line bg-white p-3.5" aria-label="Signups in the last 14 days">
            <p className="text-[13px] font-bold">Signups, last 14 days</p>
            <div className="mt-2 flex h-24 items-end gap-1">
              {sum.byDay.map(d => (
                <div key={d.date} className="flex flex-1 flex-col items-center justify-end" title={`${d.date}: ${d.count}`}>
                  <span className="mb-0.5 text-[10px] font-bold text-muted">{d.count || ''}</span>
                  <div className="w-full rounded-t bg-brand" style={{ height: `${Math.max(d.count ? 6 : 2, (d.count / max) * 64)}px`, opacity: d.count ? 1 : 0.2 }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted"><span>{fmt(sum.byDay[0].date)}</span><span>Today</span></div>
          </section>
        </>
      )}

      <label className="relative mt-4 block">
        <span className="sr-only">Search users</span>
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email or username" className="h-[52px] w-full rounded-2xl border-[1.5px] border-edge bg-white pl-11 pr-4 text-[15px]" />
      </label>
      <div className="mt-3 flex gap-2">
        {(['all', 'staff', 'blocked'] as Filter[]).map(f => <button key={f} type="button" className={chip(filter === f)} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'staff' ? 'Staff' : 'Blocked'}</button>)}
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      <p className="mt-4 text-[13px] text-muted">{total} {total === 1 ? 'account' : 'accounts'}</p>

      <ul className="cols-lg mt-2 flex flex-col gap-2.5">
        {rows.map(r => {
          const self = r.id === me?.id;
          return (
            <li key={r.id} className={`rounded-[18px] border-[1.5px] bg-white p-4 ${r.blocked ? 'border-[#E2574C]/50 opacity-80' : 'border-line'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-extrabold">{r.name || r.username || r.email || 'No name'}{self && <span className="ml-2 text-[12px] font-bold text-brand">You</span>}</p>
                  <p className="truncate text-[13px] text-muted">{r.email || (r.username ? `@${r.username}` : '')}</p>
                  <p className="mt-0.5 text-[12px] text-muted">Joined {fmt(r.joined)} · {r.via}{r.blocked ? ' · Blocked' : ''}</p>
                </div>
                {!self && (
                  <button type="button" onClick={() => toggleBlock(r)} className={`flex h-10 shrink-0 items-center gap-1.5 rounded-xl border-[1.5px] px-3 text-[13px] font-bold ${r.blocked ? 'border-brand text-brand' : 'border-edge text-[#9B1C1C]'}`}>
                    {r.blocked ? <><RotateCcw size={15} aria-hidden /> Unblock</> : <><Ban size={15} aria-hidden /> Block</>}
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                <span><b>{r.requests}</b> requests</span><span><b>{r.downloads}</b> downloads</span><span><b>{r.payments}</b> payments</span><span><b>{r.chats}</b> chats</span>
                <label className="ml-auto flex items-center gap-2"><span className="text-muted">Role</span>
                  <select value={r.role} disabled={self} onChange={e => setRole(r, e.target.value as Role)} className="h-10 rounded-xl border-[1.5px] border-edge bg-white px-2 text-[14px] font-semibold disabled:opacity-50">
                    <option value="STUDENT">Student</option><option value="SUPPORT">Support</option><option value="ADMIN">Admin</option>
                  </select>
                </label>
              </div>
            </li>
          );
        })}
      </ul>
      {!busy && rows.length === 0 && !error && <p className="mt-4 rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-6 text-center text-[15px] text-muted">No accounts match.</p>}
      {busy && <div className="flex justify-center py-6 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
      {!busy && rows.length < total && <button type="button" onClick={() => load(rows.length, false)} className="mt-4 h-12 w-full rounded-2xl border-[1.5px] border-edge bg-white font-bold">Load more</button>}
    </main>
  );
}
