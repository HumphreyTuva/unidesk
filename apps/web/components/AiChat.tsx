'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, History, Loader2, Plus, Send, Sparkles, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

type Turn = { role: 'user' | 'assistant'; content: string };
type Saved = { id: string; title: string; updatedAt: string };
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' });
const IDEAS = ['How do I call off a semester?', 'Where do I fix my portal password?', 'Where is room SOE6?', 'How do I find a past paper?'];

// The assistant answers from KU guide content on the server. Each chat is saved, so the student can come back to it from History.
export default function AiChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const [cid, setCid] = useState<string | null>(null);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [saved, setSaved] = useState<Saved[] | null>(null);
  const loadSaved = () => api<Saved[]>('/ai/conversations').then(setSaved).catch(() => setSaved([]));
  const openHistory = () => { setView('history'); setSaved(null); loadSaved(); };
  const openChat = async (id: string) => {
    setError('');
    try {
      const c = await api<{ id: string; messages: Turn[] }>(`/ai/conversations/${id}`);
      setTurns(c.messages.map(m => ({ role: m.role, content: m.content }))); setCid(c.id); setView('chat');
    } catch (e: any) { setError(e.message); }
  };
  const newChat = () => { setTurns([]); setCid(null); setError(''); setView('chat'); };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this chat? It cannot be brought back.')) return;
    try { await api(`/ai/conversations/${id}`, 'DELETE'); setSaved(l => (l ?? []).filter(c => c.id !== id)); if (cid === id) newChat(); } catch (e: any) { setError(e.message); }
  };
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [turns.length, busy]);

  const ask = async (q: string) => {
    const content = q.trim();
    if (!content || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content }];
    setTurns(next); setText(''); setBusy(true); setError('');
    try {
      const r = await api<{ reply: string; conversationId?: string | null }>('/ai/ask', 'POST', { messages: next, conversationId: cid ?? undefined });
      setTurns([...next, { role: 'assistant', content: r.reply }]);
      if (r.conversationId) setCid(r.conversationId);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (view === 'history') {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-5 py-2">
          <button type="button" onClick={() => setView('chat')} className="flex h-10 items-center gap-1.5 text-[14px] font-bold text-brand-ink"><ArrowLeft size={18} aria-hidden /> Back to chat</button>
          <button type="button" onClick={newChat} className="flex h-10 items-center gap-1.5 rounded-full border-[1.5px] border-brand bg-card px-3.5 text-[14px] font-bold text-brand-ink"><Plus size={16} aria-hidden /> New chat</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <h2 className="text-[17px] font-extrabold">Your past chats</h2>
          {error && <p role="alert" className="mt-2 rounded-xl bg-danger-soft px-3.5 py-2 text-sm font-medium text-danger">{error}</p>}
          {saved === null && <div className="flex justify-center py-8 text-brand-ink"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
          {saved?.length === 0 && <p className="mt-3 rounded-[18px] border-[1.5px] border-dashed border-edge bg-card p-5 text-center text-[14px] text-muted">No saved chats yet. Ask a question and it will appear here.</p>}
          <ul className="mt-3 flex flex-col gap-2">
            {saved?.map(c => (
              <li key={c.id} className="flex items-center gap-1 rounded-2xl border-[1.5px] border-line bg-card pl-4 pr-1">
                <button type="button" onClick={() => openChat(c.id)} className="min-w-0 flex-1 py-3 text-left"><span className="block truncate text-[15px] font-bold">{c.title}</span><span className="block text-[12px] text-muted">{day(c.updatedAt)}</span></button>
                <button type="button" onClick={() => remove(c.id)} aria-label={`Delete chat: ${c.title}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-danger"><Trash2 size={17} aria-hidden /></button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-5 pb-1">
        <button type="button" onClick={openHistory} className="flex h-10 items-center gap-1.5 text-[14px] font-bold text-brand-ink"><History size={17} aria-hidden /> History</button>
        {turns.length > 0 && <button type="button" onClick={newChat} className="flex h-10 items-center gap-1.5 text-[14px] font-bold text-brand-ink"><Plus size={16} aria-hidden /> New chat</button>}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-3" aria-live="polite">
        {turns.length === 0 && (
          <div className="mt-2">
            <p className="flex items-center gap-2 text-[15px] font-bold"><Sparkles size={18} className="text-brand-ink" aria-hidden /> Ask me about KU</p>
            <p className="mt-1 text-sm text-muted">I know the offices, the call-off steps and the venues in this app. I can make mistakes, so check anything important with the office.</p>
            <p className="mt-2 text-[12px] text-muted">Your chats are saved so you can read them again under History. The UniDesk team reads them to improve the app, so please do not share passwords or ID numbers.</p>
            <ul className="mt-4 flex flex-col gap-2">
              {IDEAS.map(i => <li key={i}><button type="button" onClick={() => ask(i)} className="w-full rounded-2xl border-[1.5px] border-line bg-card px-4 py-3 text-left text-[15px] font-semibold">{i}</button></li>)}
            </ul>
          </div>
        )}
        <ul className="flex flex-col gap-2">
          {turns.map((t, i) => (
            <li key={i} className={`max-w-[86%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug ${t.role === 'user' ? 'self-end bg-brand text-white' : 'self-start border-[1.5px] border-line bg-card text-ink'}`}>{t.content}</li>
          ))}
          {busy && <li className="self-start rounded-2xl border-[1.5px] border-line bg-card px-3.5 py-3 text-brand-ink" aria-label="Thinking"><Loader2 size={18} className="animate-spin" aria-hidden /></li>}
        </ul>
        <div ref={end} />
      </div>
      {error && <p role="alert" className="mx-5 mb-2 rounded-xl bg-danger-soft px-3.5 py-2 text-sm font-medium text-danger">{error}</p>}
      <form onSubmit={e => { e.preventDefault(); ask(text); }} className="flex items-end gap-2 border-t border-line bg-card px-4 py-3">
        <label className="flex-1"><span className="sr-only">Your question</span>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={1} maxLength={800} placeholder="Ask a question"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 768px)').matches) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            className="max-h-28 min-h-[48px] w-full resize-none rounded-2xl border-[1.5px] border-edge bg-field px-4 py-3 text-[15px] placeholder:text-muted" />
        </label>
        <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-50"><Send size={20} aria-hidden /></button>
      </form>
    </div>
  );
}
