'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useToast } from '@/lib/toast';

type Club = { id: string; name: string; category: string | null; description: string | null; contact: string | null; meetingTimes: string | null; members: number; approved: boolean };
type Listing = { id: string; title: string; description: string | null; price: number | null; image: boolean; phone: string; status: string; expiresAt: string | null; paid: { amount: number; mpesaReceipt: string | null } | null };
type Tab = 'ads' | 'clubs';

export default function AdminCampus() {
  const ok = useRequireAdmin();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('ads');
  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [ads, setAds] = useState<Listing[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<Club[]>('/admin/campus/clubs').then(setClubs).catch(e => setError(e.message));
    api<Listing[]>('/admin/campus/listings?status=PENDING_REVIEW').then(setAds).catch(e => setError(e.message));
  }, []);
  useEffect(() => { if (ok) load(); }, [ok, load]);
  if (!ok) return null;

  const act = async (fn: () => Promise<any>, done = 'Done') => { setError(''); try { await fn(); toast.ok(done); load(); } catch (e: any) { toast.error(e.message); } };
  const pendingClubs = clubs?.filter(c => !c.approved).length ?? 0;

  return (
    <main className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/admin" aria-label="Back to admin" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Campus</h1>
      <div role="tablist" className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-brand-soft p-1">
        <button role="tab" aria-selected={tab === 'ads'} onClick={() => setTab('ads')} className={`h-11 rounded-xl text-[15px] font-bold ${tab === 'ads' ? 'bg-white text-brand shadow-sm' : 'text-muted'}`}>Ads to check{ads?.length ? ` (${ads.length})` : ''}</button>
        <button role="tab" aria-selected={tab === 'clubs'} onClick={() => setTab('clubs')} className={`h-11 rounded-xl text-[15px] font-bold ${tab === 'clubs' ? 'bg-white text-brand shadow-sm' : 'text-muted'}`}>Clubs{pendingClubs ? ` (${pendingClubs})` : ''}</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      {(!ads || !clubs) && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}

      {tab === 'ads' && (
        <ul className="mt-4 flex flex-col gap-3">
          {ads?.length === 0 && <li className="rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-6 text-center text-[15px] text-muted">No paid ads waiting.</li>}
          {ads?.map(l => (
            <li key={l.id} className="rounded-[18px] border-[1.5px] border-line bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {l.image && <img src={`/api/v1/campus/market/${l.id}/image`} alt="" className="mb-3 aspect-[4/3] w-full rounded-xl object-cover" />}
              <p className="text-[15px] font-bold">{l.title}{l.price != null ? ` · KSh ${l.price.toLocaleString()}` : ''}</p>
              {l.description && <p className="mt-1 whitespace-pre-wrap text-[14px]">{l.description}</p>}
              <p className="mt-2 text-[13px] text-muted">Phone {l.phone}{l.paid ? ` · Paid KSh ${l.paid.amount}${l.paid.mpesaReceipt ? ` (${l.paid.mpesaReceipt})` : ''}` : ' · No payment on record'}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => act(() => api(`/admin/campus/listings/${l.id}/approve`, 'POST'), 'Ad approved and live')} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand font-bold text-white"><Check size={18} aria-hidden /> Approve</button>
                <button type="button" onClick={() => { const reason = window.prompt('Why is it not approved? The business will see this. If they paid, refund them by M-Pesa from your Till.'); if (reason?.trim()) act(() => api(`/admin/campus/listings/${l.id}/reject`, 'POST', { reason }), 'Ad rejected'); }} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-edge font-bold"><X size={18} aria-hidden /> Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'clubs' && (
        <ul className="mt-4 flex flex-col gap-3">
          {clubs?.length === 0 && <li className="rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-6 text-center text-[15px] text-muted">No clubs yet.</li>}
          {clubs?.map(c => (
            <li key={c.id} className="rounded-[18px] border-[1.5px] border-line bg-white p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1"><p className="text-[15px] font-bold">{c.name}</p><p className="text-[13px] text-muted">{[c.category, `${c.members} members`, c.contact].filter(Boolean).join(' · ')}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${c.approved ? 'bg-[#E3F6EA] text-[#116B35]' : 'bg-[#FFF4DB] text-[#6B4A00]'}`}>{c.approved ? 'Listed' : 'Waiting'}</span>
              </div>
              {c.description && <p className="mt-2 text-[14px]">{c.description}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => act(() => api(`/admin/campus/clubs/${c.id}`, 'PUT', { approved: !c.approved }))} className={`h-11 flex-1 rounded-xl font-bold ${c.approved ? 'border-[1.5px] border-edge' : 'bg-brand text-white'}`}>{c.approved ? 'Hide' : 'Approve'}</button>
                <button type="button" aria-label={`Delete ${c.name}`} onClick={() => window.confirm(`Delete ${c.name}? Members are removed too.`) && act(() => api(`/admin/campus/clubs/${c.id}`, 'DELETE'))} className="flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] border-edge text-muted"><Trash2 size={18} aria-hidden /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
