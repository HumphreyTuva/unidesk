'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import Thread from '@/components/Thread';

export default function Conversation() {
  const ok = useRequireAdmin(['ADMIN', 'SUPPORT']);
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [who, setWho] = useState('');
  const [closed, setClosed] = useState(false);
  const onLoaded = useCallback((d: any) => { if (d.who) setWho(d.who); setClosed(!!d.closed); }, []);
  if (!ok) return null;

  const close = async () => {
    if (!window.confirm('Close this conversation? The student can start a new one any time.')) return;
    try { await api(`/admin/chat/threads/${id}/close`, 'POST'); router.replace('/admin/chat'); } catch { /* the thread list will show it is still open */ }
  };

  return (
    <main className="flex h-[100dvh] flex-col pt-[calc(8px+env(safe-area-inset-top))]">
      <header className="flex items-center gap-2 px-3 pb-2">
        <Link href="/admin/chat" aria-label="Back to inbox" className="flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-extrabold">{who || 'Conversation'}</h1>
        <button type="button" onClick={close} disabled={closed} className="h-10 rounded-xl border-[1.5px] border-edge px-3.5 text-sm font-bold disabled:opacity-50">Close</button>
      </header>
      <Thread loadPath={`/admin/chat/threads/${id}`} sendPath={`/admin/chat/threads/${id}/messages`} mine="staff" empty="No messages yet." disabled={closed} onLoaded={onLoaded} />
    </main>
  );
}
