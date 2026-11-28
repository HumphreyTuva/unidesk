'use client';
import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';

// Shown when UniDesk's server keeps failing, so students see a friendly upgrade message instead of broken pages. It goes away by itself once a request works.
export default function ServerDownBanner() {
  const [down, setDown] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setDown(!!(e as CustomEvent).detail?.down);
    window.addEventListener('unidesk:server', on);
    return () => window.removeEventListener('unidesk:server', on);
  }, []);
  if (!down) return null;
  return (
    <div role="alert" className="fixed inset-x-3 top-[calc(10px+env(safe-area-inset-top))] z-[80] mx-auto flex max-w-[520px] items-start gap-3 rounded-2xl bg-[#0E1B33] px-4 py-3.5 text-white shadow-lg">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15"><Wrench size={18} aria-hidden /></span>
      <div className="min-w-0 flex-1 text-[14px] leading-snug">
        <p className="text-[15px] font-bold">We are upgrading UniDesk</p>
        <p className="mt-0.5 text-white/85">We are making UniDesk better and faster for you. We will be back very soon. Your account and everything you saved are safe. Thank you for your patience!</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-2.5 h-9 rounded-full bg-white px-4 text-[13px] font-bold text-[#0E1B33]">Check again</button>
      </div>
    </div>
  );
}
