'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink placeholder:text-[#6B7794]';

export default function Forgot() {
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api('/auth/forgot-password', 'POST', { identifier: id }); setSent(true); }
    catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <main className="mx-auto w-full max-w-[480px] px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/login" aria-label="Back to sign in" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Forgot your password?</h1>

      {sent ? (
        <div className="mt-6 rounded-[20px] border-[1.5px] border-line bg-white p-5 text-center" role="status">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand"><Check size={28} aria-hidden /></span>
          <p className="mt-4 text-[17px] font-extrabold">Check your email</p>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">If an account exists for that email or username, we have sent a link to choose a new password. It works for 30 minutes. Look in Spam or Promotions if you do not see it.</p>
          <Link href="/login" className="mt-5 flex h-12 items-center justify-center rounded-2xl bg-brand font-bold text-white">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3.5">
          <p className="text-[15px] leading-relaxed text-muted">Enter the email you signed up with (or your username) and we will email you a link to set a new password.</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fp-id" className="text-[13px] font-bold">Email or username</label>
            <input id="fp-id" value={id} onChange={e => setId(e.target.value)} autoComplete="username" autoCapitalize="none" required minLength={3} className={field} />
          </div>
          {error && <p role="alert" className="rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
          <button type="submit" disabled={busy} className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-70">
            {busy && <Loader2 size={20} className="animate-spin" aria-hidden />} Send reset link
          </button>
          <p className="text-[13px] leading-relaxed text-muted">Accounts made with only a username have no email on file, so a link cannot be sent. Signed up with Google? Use “Continue with Google” on the sign-in page.</p>
        </form>
      )}
    </main>
  );
}
