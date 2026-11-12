'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Download, Loader2, Smartphone, X } from 'lucide-react';
import { api } from '@/lib/api';

type Phase = 'form' | 'waiting' | 'success' | 'failed' | 'timeout';
type Status = { status: 'PENDING' | 'SUCCESS' | 'FAILED'; reason?: string };

const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink placeholder:text-[#6B7794]';
const PHONE_KEY = 'unidesk-mpesa-phone';
const POLL_MS = 4000;
const GIVE_UP_MS = 2 * 60_000;

// Only ever opened when the server says this paper needs payment. Pays by M-Pesa STK push, waits for the result, then unlocks.
export default function PaymentSheet({ open, paperId, label, amount, onClose, onPaid }: {
  open: boolean; paperId: string; label: string; amount: number; onClose: () => void; onPaid: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('form');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = open;
    if (open) {
      setPhase('form'); setError('');
      try { setPhone(localStorage.getItem(PHONE_KEY) || ''); } catch {}
    }
    return () => { alive.current = false; };
  }, [open]);

  const wait = async (paymentId: string) => {
    const started = Date.now();
    while (alive.current) {
      await new Promise(r => setTimeout(r, POLL_MS));
      if (!alive.current) return;
      try {
        const s = await api<Status>(`/payments/${paymentId}/status`);
        if (s.status === 'SUCCESS') { setPhase('success'); onPaid(); return; }
        if (s.status === 'FAILED') { setError(s.reason || 'The payment was not completed.'); setPhase('failed'); return; }
      } catch { /* a network blip: keep waiting */ }
      if (Date.now() - started > GIVE_UP_MS) { setPhase('timeout'); return; }
    }
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api<{ paymentId: string }>('/payments/paper', 'POST', { paperId, phone });
      try { localStorage.setItem(PHONE_KEY, phone); } catch {}
      setPhase('waiting');
      wait(r.paymentId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const close = () => { alive.current = false; onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center bg-navy-900/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={phase === 'waiting' ? undefined : close}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Pay with M-Pesa"
            className="w-full max-w-[480px] rounded-t-[28px] lg:rounded-[28px] bg-white p-5 shadow-card"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
            initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Download {label}</h2>
              <button type="button" onClick={close} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-muted"><X size={22} aria-hidden /></button>
            </div>

            {phase === 'form' && (
              <form onSubmit={pay} className="mt-2 flex flex-col gap-3.5">
                <div className="flex items-baseline justify-between rounded-2xl bg-brand-soft px-4 py-3">
                  <span className="text-[13px] font-bold text-brand">Price</span>
                  <span className="text-2xl font-extrabold text-brand">KSh {amount}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="mpesa-phone" className="text-[13px] font-bold">M-Pesa number</label>
                  <input id="mpesa-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678" required className={field} />
                </div>
                {error && <p role="alert" className="rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
                <button type="submit" disabled={busy} className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-70">
                  {busy && <Loader2 size={20} className="animate-spin" aria-hidden />}
                  Pay KSh {amount} with M-Pesa
                </button>
                <p className="text-center text-[13px] text-muted">You will get a prompt on your phone. Enter your M-Pesa PIN to finish.</p>
              </form>
            )}

            {phase === 'waiting' && (
              <div className="py-8 text-center" role="status">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand"><Smartphone size={28} aria-hidden /></span>
                <p className="mt-4 text-[17px] font-extrabold">Check your phone</p>
                <p className="mt-1 text-[15px] text-muted">Enter your M-Pesa PIN to pay KSh {amount}.</p>
                <Loader2 className="mx-auto mt-5 animate-spin text-brand" aria-hidden />
              </div>
            )}

            {phase === 'success' && (
              <div className="py-6 text-center" role="status">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F6EC] text-[#14532D]"><Check size={28} aria-hidden /></span>
                <p className="mt-4 text-[17px] font-extrabold">Payment received</p>
                <a href={`/api/v1/papers/${paperId}/download`} onClick={close} className="mt-4 flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white"><Download size={20} aria-hidden /> Download PDF</a>
              </div>
            )}

            {phase === 'failed' && (
              <div className="py-6 text-center">
                <p role="alert" className="text-[17px] font-extrabold">Payment not completed</p>
                <p className="mt-1 text-[15px] text-muted">{error}</p>
                <button type="button" onClick={() => { setError(''); setPhase('form'); }} className="mt-5 h-[54px] w-full rounded-2xl bg-brand text-base font-bold text-white">Try again</button>
              </div>
            )}

            {phase === 'timeout' && (
              <div className="py-6 text-center">
                <p className="text-[17px] font-extrabold">Still waiting</p>
                <p className="mt-1 text-[15px] text-muted">If you already entered your PIN, the paper unlocks by itself within a minute or two. You can close this and come back to it.</p>
                <button type="button" onClick={close} className="mt-5 h-[54px] w-full rounded-2xl border-[1.5px] border-edge bg-white text-base font-bold">Close</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
