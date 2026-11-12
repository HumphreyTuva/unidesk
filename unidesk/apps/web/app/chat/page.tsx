'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Thread from '@/components/Thread';
import AiChat from '@/components/AiChat';

type Mode = 'ai' | 'support';

export default function Chat() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>('support');

  useEffect(() => { if (ready && !user) router.replace('/login?next=/chat'); }, [ready, user, router]);
  // The assistant tab only exists when the server has it switched on, so students never see a dead button.
  useEffect(() => { api<{ enabled: boolean }>('/ai/status').then(r => { setAiOn(r.enabled); if (r.enabled) setMode('ai'); }).catch(() => setAiOn(false)); }, []);
  if (!ready || !user || aiOn === null) return null;

  return (
    // The page already leaves 88px plus the safe area for the bottom bar; the chat fills the space above it.
    <main className="wide flex h-[calc(100dvh-88px-env(safe-area-inset-bottom))] flex-col lg:h-dvh pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="px-5 pb-2">
        <h1 className="text-2xl font-extrabold">{aiOn ? 'Help' : 'Support chat'}</h1>
        {aiOn && (
          <div role="tablist" className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-brand-soft p-1">
            {([['ai', 'Ask AI'], ['support', 'Talk to a person']] as [Mode, string][]).map(([m, label]) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`h-11 rounded-xl text-[15px] font-bold ${mode === m ? 'bg-white text-brand shadow-sm' : 'text-muted'}`}>{label}</button>
            ))}
          </div>
        )}
        {mode === 'support' && <p className="mt-2 text-sm text-muted">Ask us anything about UniDesk. A person replies, usually within a few hours.</p>}
      </header>
      {mode === 'ai'
        ? <AiChat />
        : <Thread loadPath="/chat" sendPath="/chat/messages" mine="student" empty="Say hello and tell us what you need. For KU offices and procedures, check the Guide first." />}
      {user.role !== 'STUDENT' && <Link href="/admin/chat" className="border-t border-line bg-white py-2 text-center text-sm font-bold text-brand">Open the support inbox</Link>}
    </main>
  );
}
