'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { api } from '@/lib/api';

export type Msg = { id: string; fromStaff: boolean; body: string; at: string };

// A conversation that refreshes itself. `mine` says which side is the viewer's: students send as not-staff, staff as staff.
// Polls every 3 s while the page is visible (and once when it becomes visible again), asking only for what is new.
export default function Thread({ loadPath, sendPath, mine, empty, disabled, onLoaded }: {
  loadPath: string; sendPath: string; mine: 'student' | 'staff'; empty: string; disabled?: boolean;
  onLoaded?: (data: any) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const last = useRef<string | undefined>(undefined);
  const end = useRef<HTMLDivElement>(null);
  const sep = loadPath.includes('?') ? '&' : '?';

  const poll = useCallback(async () => {
    try {
      const d = await api<{ messages: Msg[] }>(`${loadPath}${last.current ? `${sep}since=${encodeURIComponent(last.current)}` : ''}`);
      onLoaded?.(d);
      if (d.messages.length) {
        last.current = d.messages[d.messages.length - 1].at;
        setMsgs(m => { const have = new Set(m.map(x => x.id)); return [...m, ...d.messages.filter(x => !have.has(x.id))]; });
      }
      setError('');
    } catch (e: any) { setError(e.message); } finally { setReady(true); }
  }, [loadPath, sep, onLoaded]);

  useEffect(() => {
    last.current = undefined; setMsgs([]); setReady(false);
    poll();
    const t = setInterval(() => { if (document.visibilityState === 'visible') poll(); }, 3000);
    const vis = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [poll]);

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setError('');
    try { await api(sendPath, 'POST', { body }); setText(''); await poll(); } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  const isMine = (m: Msg) => (mine === 'staff' ? m.fromStaff : !m.fromStaff);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-3" aria-live="polite">
        {!ready && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
        {ready && msgs.length === 0 && <p className="mt-6 rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-5 text-center text-[15px] text-muted">{empty}</p>}
        <ul className="flex flex-col gap-2">
          {msgs.map(m => (
            <li key={m.id} className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug ${isMine(m) ? 'self-end bg-brand text-white' : 'self-start border-[1.5px] border-line bg-white text-ink'}`}>
              {m.body}
              <span className={`mt-1 block text-[11px] ${isMine(m) ? 'text-white/80' : 'text-muted'}`}>{new Date(m.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            </li>
          ))}
        </ul>
        <div ref={end} />
      </div>
      {error && <p role="alert" className="mx-5 mb-2 rounded-xl bg-[#FDECEC] px-3.5 py-2 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-line bg-white px-4 py-3">
        <label className="flex-1"><span className="sr-only">Message</span>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={1} maxLength={1000} disabled={disabled}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 768px)').matches) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            placeholder="Type a message" className="max-h-28 min-h-[48px] w-full resize-none rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 py-3 text-[15px] placeholder:text-muted" />
        </label>
        <button type="submit" disabled={busy || disabled || !text.trim()} aria-label="Send" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-50">
          {busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Send size={20} aria-hidden />}
        </button>
      </form>
    </div>
  );
}
