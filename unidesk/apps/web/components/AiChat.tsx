'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

type Turn = { role: 'user' | 'assistant'; content: string };
const IDEAS = ['How do I call off a semester?', 'Where do I fix my portal password?', 'Where is room SOE6?', 'How do I find a past paper?'];

// The assistant answers from KU guide content on the server. History lives only on this screen (gone when the app is closed).
export default function AiChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [turns.length, busy]);

  const ask = async (q: string) => {
    const content = q.trim();
    if (!content || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content }];
    setTurns(next); setText(''); setBusy(true); setError('');
    try {
      const r = await api<{ reply: string }>('/ai/ask', 'POST', { messages: next });
      setTurns([...next, { role: 'assistant', content: r.reply }]);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-3" aria-live="polite">
        {turns.length === 0 && (
          <div className="mt-2">
            <p className="flex items-center gap-2 text-[15px] font-bold"><Sparkles size={18} className="text-brand" aria-hidden /> Ask me about KU</p>
            <p className="mt-1 text-sm text-muted">I know the offices, the call-off steps and the venues in this app. I can make mistakes, so check anything important with the office.</p>
            <ul className="mt-4 flex flex-col gap-2">
              {IDEAS.map(i => <li key={i}><button type="button" onClick={() => ask(i)} className="w-full rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-left text-[15px] font-semibold">{i}</button></li>)}
            </ul>
          </div>
        )}
        <ul className="flex flex-col gap-2">
          {turns.map((t, i) => (
            <li key={i} className={`max-w-[86%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug ${t.role === 'user' ? 'self-end bg-brand text-white' : 'self-start border-[1.5px] border-line bg-white text-ink'}`}>{t.content}</li>
          ))}
          {busy && <li className="self-start rounded-2xl border-[1.5px] border-line bg-white px-3.5 py-3 text-brand" aria-label="Thinking"><Loader2 size={18} className="animate-spin" aria-hidden /></li>}
        </ul>
        <div ref={end} />
      </div>
      {error && <p role="alert" className="mx-5 mb-2 rounded-xl bg-[#FDECEC] px-3.5 py-2 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      <form onSubmit={e => { e.preventDefault(); ask(text); }} className="flex items-end gap-2 border-t border-line bg-white px-4 py-3">
        <label className="flex-1"><span className="sr-only">Your question</span>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={1} maxLength={800} placeholder="Ask a question"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 768px)').matches) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            className="max-h-28 min-h-[48px] w-full resize-none rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 py-3 text-[15px] placeholder:text-muted" />
        </label>
        <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-50"><Send size={20} aria-hidden /></button>
      </form>
    </div>
  );
}
