'use client';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type Toast = { id: number; kind: 'ok' | 'error'; text: string };
type Api = { ok: (text: string) => void; error: (text: string) => void };
const Ctx = createContext<Api>({ ok: () => {}, error: () => {} });
export const useToast = () => useContext(Ctx);

// Small confirmation that appears above the bottom bar and fades after a few seconds, so every action visibly "did something".
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const n = useRef(0);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++n.current;
    setItems(l => [...l.slice(-2), { id, kind, text }]);
    setTimeout(() => setItems(l => l.filter(t => t.id !== id)), kind === 'error' ? 5000 : 3000);
  }, []);
  const api = useRef<Api>({ ok: t => push('ok', t), error: t => push('error', t) }).current;

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-[480px] flex-col items-center gap-2 px-4 md:max-w-[640px] lg:bottom-6 lg:max-w-none lg:pl-[276px]" role="status" aria-live="polite">
        {items.map(t => (
          <div key={t.id} className={`pointer-events-auto flex max-w-full animate-[toastIn_.2s_ease-out] items-center gap-2 rounded-2xl px-4 py-3 text-[14px] font-semibold text-white shadow-lg ${t.kind === 'ok' ? 'bg-[#116B35]' : 'bg-[#9B1C1C]'}`}>
            {t.kind === 'ok' ? <CheckCircle2 size={18} aria-hidden /> : <XCircle size={18} aria-hidden />}{t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
