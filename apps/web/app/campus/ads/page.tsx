'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

type Mine = { id: string; title: string; price: number | null; image: boolean; status: 'DRAFT' | 'PENDING_REVIEW' | 'LIVE' | 'EXPIRED' | 'REJECTED'; expiresAt: string | null; rejectReason: string | null };
const LABEL: Record<Mine['status'], [string, string]> = {
  DRAFT: ['Not paid yet', 'bg-[#FFF4DB] text-[#6B4A00]'],
  PENDING_REVIEW: ['Being checked', 'bg-brand-soft text-brand'],
  LIVE: ['Live', 'bg-[#E3F6EA] text-[#116B35]'],
  EXPIRED: ['Ended', 'bg-[#EEF1F7] text-muted'],
  REJECTED: ['Not approved', 'bg-[#FDECEC] text-[#9B1C1C]'],
};
const PHONE_KEY = 'unidesk_phone';

export default function MyAds() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<Mine[] | null>(null);
  const [info, setInfo] = useState<{ fee: number; days: number } | null>(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState<'form' | 'waiting'>('form');
  const alive = useRef(true);

  const load = useCallback(() => { api<Mine[]>('/campus/market/mine').then(setList).catch(e => setError(e.message)); }, []);
  useEffect(() => { if (ready && !user) router.replace('/login?next=/campus/ads'); }, [ready, user, router]);
  useEffect(() => { if (user) { load(); api('/campus/market/info').then(setInfo).catch(() => {}); try { setPhone(localStorage.getItem(PHONE_KEY) || ''); } catch {} } }, [user, load]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  if (!ready || !user) return null;

  const wait = async (paymentId: string) => {
    const started = Date.now();
    while (alive.current && Date.now() - started < 120_000) {
      await new Promise(r => setTimeout(r, 4000));
      try {
        const s = await api<{ status: string; reason?: string }>(`/payments/${paymentId}/status`);
        if (s.status === 'SUCCESS') { toast.ok('Payment received. We will check your ad soon.'); setPaying(null); setPhase('form'); load(); return; }
        if (s.status === 'FAILED') { setError(s.reason || 'The payment was not completed.'); setPhase('form'); return; }
      } catch { /* keep waiting */ }
    }
    if (alive.current) { setPhase('form'); setError('We did not see the payment yet. If M-Pesa took your money, it will show here shortly. Refresh in a minute.'); load(); }
  };

  const pay = async (id: string) => {
    setError('');
    try {
      if (info && info.fee < 1) { await api(`/campus/market/${id}/submit`, 'POST'); setPaying(null); load(); return; }
      const r = await api<{ paymentId: string }>('/payments/listing', 'POST', { listingId: id, phone });
      try { localStorage.setItem(PHONE_KEY, phone); } catch {}
      setPhase('waiting'); wait(r.paymentId);
    } catch (e: any) { setError(e.message); }
  };
  const remove = async (m: Mine) => {
    if (!window.confirm(`Remove “${m.title}”?`)) return;
    try { await api(`/campus/market/${m.id}`, 'DELETE'); load(); } catch (e: any) { setError(e.message); }
  };

  return (
    <main className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/campus" aria-label="Back to Campus" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">My ads</h1>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      {!list && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
      {list?.length === 0 && <p className="mt-6 rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-6 text-center text-[15px] text-muted">You have no ads yet.</p>}
      <ul className="mt-4 flex flex-col gap-3">
        {list?.map((m: Mine) => {
          const [label, tone] = LABEL[m.status];
          const needsPay = m.status === 'DRAFT' || m.status === 'EXPIRED';
          return (
            <li key={m.id} className="rounded-[18px] border-[1.5px] border-line bg-white p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1"><p className="text-[15px] font-bold">{m.title}</p>{m.price != null && <p className="text-[13px] text-muted">KSh {m.price.toLocaleString()}</p>}</div>
                <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${tone}`}>{label}</span>
              </div>
              {m.status === 'LIVE' && m.expiresAt && <p className="mt-1 text-[13px] text-muted">Shows until {new Date(m.expiresAt).toLocaleDateString('en-GB')}</p>}
              {m.status === 'PENDING_REVIEW' && <p className="mt-1 text-[13px] text-muted">Paid. We check ads within a day, then it goes live.</p>}
              {m.status === 'REJECTED' && <p className="mt-1 text-[13px] text-[#9B1C1C]">{m.rejectReason}. If you paid, contact support for a refund.</p>}

              {paying === m.id ? (
                phase === 'waiting' ? (
                  <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-brand-soft p-3 text-sm font-semibold"><Loader2 size={18} className="animate-spin" aria-hidden /> Check your phone and enter your M-Pesa PIN.</p>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); pay(m.id); }} className="mt-3 flex flex-col gap-2">
                    {info && info.fee > 0 && <p className="text-[13px] font-bold">Pay KSh {info.fee} for {info.days} days</p>}
                    {info && info.fee > 0 && <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" required placeholder="M-Pesa number, e.g. 0712 345 678" aria-label="M-Pesa number" className="h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px]" />}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setPaying(null)} className="h-11 flex-1 rounded-xl border-[1.5px] border-edge font-bold">Cancel</button>
                      <button type="submit" className="h-11 flex-1 rounded-xl bg-brand font-bold text-white">{info && info.fee > 0 ? 'Send M-Pesa prompt' : 'Submit'}</button>
                    </div>
                  </form>
                )
              ) : (
                <div className="mt-3 flex gap-2">
                  {needsPay && <button type="button" onClick={() => { setPaying(m.id); setPhase('form'); setError(''); }} className="h-11 flex-1 rounded-xl bg-brand font-bold text-white">{m.status === 'EXPIRED' ? 'Renew' : info && info.fee > 0 ? 'Pay and submit' : 'Submit'}</button>}
                  {m.status === 'LIVE' && <Link href={`/campus/market/${m.id}`} className="flex h-11 flex-1 items-center justify-center rounded-xl border-[1.5px] border-edge font-bold">View</Link>}
                  <button type="button" onClick={() => remove(m)} aria-label={`Remove ${m.title}`} className="flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] border-edge text-muted"><Trash2 size={18} aria-hidden /></button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
