'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

// A letter template the student can copy, then paste into a document and fill in the [brackets].
export default function CopyLetter({ title, lines }: { title: string; lines: string[] }) {
  const [done, setDone] = useState(false);
  const text = lines.join('\n');
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }
    catch { window.alert('Could not copy. Press and hold the letter to select it.'); }
  };
  return (
    <section className="mt-6" aria-labelledby="letter-h">
      <h2 id="letter-h" className="text-[17px] font-extrabold">{title}</h2>
      <p className="mt-1 text-[13px] text-muted">Fill in the parts in [square brackets].</p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-[18px] border-[1.5px] border-line bg-white p-4 font-sans text-[14px] leading-relaxed">{text}</pre>
      <button type="button" onClick={copy} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-edge bg-white font-bold">
        {done ? <><Check size={18} aria-hidden /> Copied</> : <><Copy size={18} aria-hidden /> Copy letter</>}
      </button>
    </section>
  );
}
