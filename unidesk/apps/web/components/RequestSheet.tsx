'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink placeholder:text-[#6B7794]';

type Result = { status: 'REQUESTED' | 'ALREADY_REQUESTED' | 'EXISTS'; paperId?: string };

// Bottom sheet: "Can't find your paper? Ask for it." Signed-out students are sent to sign in first.
export default function RequestSheet({ open, onClose, initialCode = '' }: { open: boolean; onClose: () => void; initialCode?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (open) { setCode(initialCode); setNote(''); setError(''); setResult(null); }
  }, [open, initialCode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push('/login?next=/papers?request=1'); return; }
    setBusy(true);
    setError('');
    try {
      setResult(await api<Result>('/paper-requests', 'POST', { unitCode: code, note: note || undefined }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center bg-navy-900/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Request a paper"
            className="w-full max-w-[480px] rounded-t-[28px] lg:rounded-[28px] bg-white p-5 shadow-card"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Request a paper</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-muted"><X size={22} aria-hidden /></button>
            </div>

            {result ? (
              <div className="py-6 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand"><Check size={28} aria-hidden /></span>
                <p className="mt-4 text-[15px] font-bold">
                  {result.status === 'REQUESTED' && 'Request sent. We will add it as soon as we get it.'}
                  {result.status === 'ALREADY_REQUESTED' && 'You already asked for this one. We are on it.'}
                  {result.status === 'EXISTS' && 'Good news, we already have this paper.'}
                </p>
                {result.status === 'EXISTS' && result.paperId && (
                  <button type="button" onClick={() => { onClose(); router.push(`/papers/${result.paperId}`); }} className="mt-4 h-12 rounded-2xl bg-brand px-6 font-bold text-white">View the paper</button>
                )}
                <button type="button" onClick={onClose} className="mt-3 block w-full text-sm font-bold text-brand">Close</button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-3 flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="req-code" className="text-[13px] font-bold">Unit code</label>
                  <input id="req-code" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. ICS2201" autoCapitalize="characters" required className={field} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="req-note" className="text-[13px] font-bold">Anything we should know? <span className="font-medium text-muted">(optional)</span></label>
                  <input id="req-note" value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="e.g. 2023 end of semester" className={field} />
                </div>
                {error && <p role="alert" className="rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
                <button type="submit" disabled={busy} className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-70">
                  {busy && <Loader2 size={20} className="animate-spin" aria-hidden />}
                  {user ? 'Send request' : 'Sign in to request'}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
