'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';

type Settings = { paymentsEnabled: boolean; paperPrice: number; listingFee: number; listingDays: number; readingMode: 'full' | 'first' | 'preview'; freePages: number; mpesaMode: 'live' | 'mock' };
type Item = { id: string; status: 'PENDING' | 'SUCCESS' | 'FAILED'; amount: number; phone: string; receipt: string | null; reason: string | null; what: string; createdAt: string };
type Recent = { totals: { amount: number; count: number; todayAmount: number; todayCount: number }; items: Item[] };

const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink';
const tone = { SUCCESS: 'bg-[#E7F6EC] text-[#14532D]', PENDING: 'bg-amber-soft text-amber-ink', FAILED: 'bg-[#FDECEC] text-[#9B1C1C]' } as const;
const mask = (p: string) => { const l = p.startsWith('254') ? '0' + p.slice(3) : p; return `${l.slice(0, 4)} *** ${l.slice(-3)}`; };

export default function AdminPayments() {
  const ok = useRequireAdmin();
  const [s, setS] = useState<Settings | null>(null);
  const [price, setPrice] = useState('');
  const [recent, setRecent] = useState<Recent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const load = useCallback(() => {
    api<Settings>('/admin/settings').then(r => { setS(r); setPrice(String(r.paperPrice)); }).catch(e => setError(e.message));
    api<Recent>('/admin/payments').then(setRecent).catch(() => {});
  }, []);
  useEffect(() => { if (ok) load(); }, [ok, load]);

  if (!ok) return null;

  const save = async (patch: Partial<{ paymentsEnabled: boolean; paperPrice: number; readingMode: 'full' | 'first' | 'preview'; freePages: number }>) => {
    setBusy(true); setError(''); setSaved('');
    try {
      const r = await api<Settings>('/admin/settings', 'PUT', patch);
      setS(r); setPrice(String(r.paperPrice)); setSaved('Saved');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const toggle = () => {
    if (!s) return;
    const turningOn = !s.paymentsEnabled;
    const msg = turningOn
      ? `Switch payments ON? Students will be asked to pay KSh ${price || s.paperPrice} to download any paper they have not already downloaded.`
      : 'Switch payments OFF? Every paper becomes free to download, and students will not see any payment option.';
    if (window.confirm(msg)) save({ paymentsEnabled: turningOn, ...(turningOn ? { paperPrice: Number(price) || s.paperPrice } : {}) });
  };

  return (
    <main className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/admin" aria-label="Back to admin" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Payments</h1>

      {s?.mpesaMode === 'mock' && (
        <p className="mt-3 rounded-xl bg-amber-soft px-3.5 py-3 text-sm font-medium text-amber-ink">Test mode: M-Pesa is not connected, so no real money moves and every payment is approved automatically.</p>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      {!s && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}

      {s && (
        <section className="mt-4 rounded-[20px] border-[1.5px] border-line bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[15px] font-extrabold">Charge for downloads</p>
              <p className="text-[13px] text-muted">{s.paymentsEnabled ? 'On: students pay to download.' : 'Off: downloads are free and payment is never mentioned.'}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={s.paymentsEnabled}
              aria-label="Charge for downloads"
              disabled={busy}
              onClick={toggle}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${s.paymentsEnabled ? 'bg-brand' : 'bg-edge'}`}
            >
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${s.paymentsEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="price" className="text-[13px] font-bold">Price per paper (KSh)</label>
            <div className="flex gap-2">
              <input id="price" type="number" inputMode="numeric" min={1} max={5000} value={price} onChange={e => setPrice(e.target.value)} className={field} />
              <button type="button" disabled={busy || !Number(price) || Number(price) === s.paperPrice} onClick={() => save({ paperPrice: Number(price) })} className="h-[50px] shrink-0 rounded-2xl bg-brand px-5 font-bold text-white disabled:opacity-50">Save</button>
            </div>
            {saved && <p role="status" className="text-[13px] font-medium text-[#14532D]">{saved}</p>}
          </div>
        </section>
      )}

      {s && (
        <section className="mt-4 rounded-[20px] border-[1.5px] border-line bg-white p-4">
          <p className="text-[15px] font-extrabold">Reading papers in the app</p>
          <p className="text-[13px] text-muted">What students can read before downloading. This only applies once payments are on. While payments are off, students can read every page.</p>
          <div role="radiogroup" aria-label="Reading mode" className="mt-3 flex flex-col gap-2">
            {([['full', 'The whole paper', 'Every page. Downloading gets them the PDF.'], ['first', 'The first pages only', 'The rest opens when they download.'], ['preview', 'Page 1 only', 'A single-page preview, the rest opens on download.']] as const).map(([k, title, sub]) => (
              <button key={k} type="button" role="radio" aria-checked={s.readingMode === k} disabled={busy} onClick={() => save({ readingMode: k })} className={`rounded-2xl border-[1.5px] p-3 text-left ${s.readingMode === k ? 'border-brand bg-brand-soft' : 'border-edge bg-white'}`}>
                <span className="block text-[15px] font-bold">{title}</span><span className="block text-[13px] text-muted">{sub}</span>
              </button>
            ))}
          </div>
          {s.readingMode === 'first' && (
            <div className="mt-3 flex items-center gap-3">
              <label htmlFor="fp" className="text-[13px] font-bold">Free pages</label>
              <input id="fp" type="number" min={1} max={10} defaultValue={s.freePages} onBlur={e => { const n = Number(e.target.value); if (n >= 1 && n <= 10 && n !== s.freePages) save({ freePages: n }); }} className="h-11 w-24 rounded-xl border-[1.5px] border-edge bg-[#F8FAFE] px-3 text-[15px]" />
            </div>
          )}
        </section>
      )}

      {recent && (
        <>
          <section className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-[18px] border-[1.5px] border-line bg-white p-4"><p className="text-[13px] text-muted">Today</p><p className="text-xl font-extrabold">KSh {recent.totals.todayAmount}</p><p className="text-[13px] text-muted">{recent.totals.todayCount} payments</p></div>
            <div className="rounded-[18px] border-[1.5px] border-line bg-white p-4"><p className="text-[13px] text-muted">All time</p><p className="text-xl font-extrabold">KSh {recent.totals.amount}</p><p className="text-[13px] text-muted">{recent.totals.count} payments</p></div>
          </section>

          <h2 className="mt-6 text-[17px] font-extrabold">Recent</h2>
          {recent.items.length === 0 && <p className="mt-2 text-[15px] text-muted">No payments yet.</p>}
          <ul className="mt-2 flex flex-col gap-2">
            {recent.items.map((p: Item) => (
              <li key={p.id} className="rounded-[16px] border-[1.5px] border-line bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-bold">{p.what}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone[p.status]}`}>{p.status === 'SUCCESS' ? 'Paid' : p.status === 'PENDING' ? 'Waiting' : 'Failed'}</span>
                </div>
                <p className="mt-0.5 text-[13px] text-muted">KSh {p.amount} · {mask(p.phone)}{p.receipt ? ` · ${p.receipt}` : ''} · {new Date(p.createdAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                {p.status === 'FAILED' && p.reason && <p className="mt-0.5 text-[13px] text-[#9B1C1C]">{p.reason}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
