'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { User, useAuth } from '@/lib/auth';
import GoogleButton from '@/components/GoogleButton';

type Mode = 'signin' | 'signup';

const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink placeholder:text-[#6B7794]';

export default function Login() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');

  // After signing in, go back to where the student was heading (e.g. a paper), but only to a page inside this app.
  const done = (user: User) => {
    setUser(user);
    const next = new URLSearchParams(window.location.search).get('next');
    router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r =
        mode === 'signin'
          ? await api<{ user: User }>('/auth/login', 'POST', { identifier, password })
          : await api<{ user: User }>('/auth/register', 'POST', {
              name: name || undefined,
              email: email || undefined,
              username: username || undefined,
              password,
            });
      done(r.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const google = async (credential: string) => {
    setError('');
    setBusy(true);
    try {
      done((await api<{ user: User }>('/auth/google', 'POST', { credential })).user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <header className="relative h-[270px] overflow-hidden bg-gradient-to-br from-navy-900 to-brand px-7 pt-14">
        <div className="absolute -right-14 -top-10 h-[220px] w-[220px] rounded-full bg-amber/20" />
        <div className="absolute right-10 top-[120px] h-[90px] w-[90px] rotate-[18deg] rounded-3xl bg-white/10" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="UniDesk" width={52} height={52} className="relative rounded-2xl" />
        <h1 className="relative mt-5 text-[30px] font-extrabold leading-tight text-white">Student<br />Help Center</h1>
        <p className="relative mt-2 text-[15px] text-[#DCE4F7]">Past papers, guidance and campus help in one place.</p>
      </header>

      <section className="relative -mt-9 mx-5 rounded-3xl bg-white p-5 shadow-card">
        <GoogleButton onCredential={google} />

        <div className="my-4 flex items-center gap-3 text-[13px] text-muted">
          <span className="h-px flex-1 bg-line" /> or use email or username <span className="h-px flex-1 bg-line" />
        </div>

        <div role="tablist" aria-label="Sign in or create account" className="mb-4 grid grid-cols-2 rounded-2xl bg-surface p-1">
          {(['signin', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setError(''); }}
              className={`h-10 rounded-xl text-sm font-bold ${mode === m ? 'bg-white text-brand shadow-sm' : 'text-muted'}`}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <AnimatePresence mode="wait" initial={false}>
            {mode === 'signin' ? (
              <motion.div key="in" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="identifier" className="text-[13px] font-bold">Email or username</label>
                  <input id="identifier" value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="username" autoCapitalize="none" placeholder="e.g. jane or jane@mail.com" required className={field} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="up" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="text-[13px] font-bold">Your name</label>
                  <input id="name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Jane Wanjiru" className={field} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="username" className="text-[13px] font-bold">Username</label>
                  <input id="username" value={username} onChange={e => setUsername(e.target.value)} autoCapitalize="none" autoComplete="username" placeholder="Not case sensitive" className={field} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-[13px] font-bold">Email <span className="font-medium text-muted">(optional if you set a username)</span></label>
                  <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@mail.com" className={field} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-bold">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder={mode === 'signin' ? 'Your password' : 'At least 8 characters'}
                required
                className={`${field} pr-14`}
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                aria-pressed={showPw}
                className="absolute right-1 top-[3px] flex h-11 w-11 items-center justify-center text-brand"
              >
                {showPw ? <EyeOff size={22} aria-hidden /> : <Eye size={22} aria-hidden />}
              </button>
            </div>
          </div>

          {error && <p role="alert" className="rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}

          <button type="submit" disabled={busy} className="mt-1 flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-70">
            {busy && <Loader2 size={20} className="animate-spin" aria-hidden />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </section>

      <p className="mx-9 mt-5 pb-8 text-center text-[13px] leading-relaxed text-muted">
        No Google account? Create one with an email or just a username. Usernames are not case sensitive.
      </p>
    </main>
  );
}
