'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { User, useAuth } from '@/lib/auth';

const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 pr-14 text-[15px] text-ink placeholder:text-[#6B7794]';

export default function Reset() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setToken(new URLSearchParams(window.location.search).get('token') || ''); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pw !== pw2) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    try {
      const r = await api<{ user: User }>('/auth/reset-password', 'POST', { token, password: pw });
      setUser(r.user); // they are signed in straight away
      router.replace('/');
    } catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  };

  if (token === null) return null;

  return (
    <main className="mx-auto w-full max-w-[480px] px-5 pt-[calc(32px+env(safe-area-inset-top))] pb-8">
      <h1 className="text-2xl font-extrabold">Choose a new password</h1>
      {!token ? (
        <div className="mt-5 rounded-[20px] border-[1.5px] border-line bg-white p-5">
          <p className="text-[15px] text-muted">This link is not complete. Open the link from your email again, or ask for a new one.</p>
          <Link href="/forgot-password" className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-brand font-bold text-white">Get a new link</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rp-pw" className="text-[13px] font-bold">New password</label>
            <div className="relative">
              <input id="rp-pw" type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" required minLength={8} className={field} />
              <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="absolute right-1 top-[3px] flex h-11 w-11 items-center justify-center text-brand">{show ? <EyeOff size={22} aria-hidden /> : <Eye size={22} aria-hidden />}</button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rp-pw2" className="text-[13px] font-bold">Type it again</label>
            <input id="rp-pw2" type={show ? 'text' : 'password'} value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" required minLength={8} className={field} />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">
              {error} {/expired|invalid/i.test(error) && <Link href="/forgot-password" className="font-bold underline">Get a new link</Link>}
            </p>
          )}
          <button type="submit" disabled={busy} className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-70">
            {busy && <Loader2 size={20} className="animate-spin" aria-hidden />} Save password and sign in
          </button>
        </form>
      )}
    </main>
  );
}
