'use client';
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import LetterForm from '@/components/LetterForm';
import type { Procedure } from '@/content/procedures';

// The steps (server-rendered, so search engines read them) and, for procedures that need a letter, a "My letter" tab.
export default function ProcedureTabs({ p }: { p: Procedure }) {
  const [tab, setTab] = useState<'steps' | 'letter'>('steps');
  const hasLetter = !!p.letterKind;

  return (
    <>
      {hasLetter && (
        <div role="tablist" aria-label={p.title} className="mt-4 grid grid-cols-2 rounded-2xl bg-white p-1 print:hidden lg:max-w-[820px]">
          {([['steps', 'Steps'], ['letter', 'My letter']] as const).map(([k, label]) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`h-10 rounded-xl text-sm font-bold ${tab === k ? 'bg-brand text-white' : 'text-muted'}`}>{label}</button>
          ))}
        </div>
      )}

      {tab === 'steps' && (
        <div className="print:hidden">
          <ol className="mt-5 flex flex-col gap-2.5 lg:max-w-[820px]">
            {p.steps.map((s, i) => (
              <li key={i} id={`step-${i + 1}`} className="flex gap-3 rounded-[18px] border-[1.5px] border-line bg-white p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[14px] font-extrabold text-brand" aria-hidden>{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold">{s.title}</span>
                  <span className="mt-0.5 block text-[14px] leading-relaxed text-muted">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
          {p.notes?.map((n, i) => <p key={i} className="mt-3 rounded-xl bg-amber-soft px-3.5 py-3 text-[14px] font-medium leading-relaxed text-amber-ink lg:max-w-[820px]">{n}</p>)}
          {p.link && (
            <a href={p.link.href} target="_blank" rel="noopener noreferrer" className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand font-bold text-white lg:max-w-[820px]">
              <ExternalLink size={18} aria-hidden /> {p.link.label}
            </a>
          )}
          {hasLetter && <button type="button" onClick={() => setTab('letter')} className="mt-4 h-[54px] w-full rounded-2xl bg-amber text-[15px] font-extrabold text-navy-900 lg:max-w-[820px]">Make my letter</button>}
        </div>
      )}

      {tab === 'letter' && p.letterKind && <div className="lg:max-w-[820px]"><LetterForm kind={p.letterKind} /></div>}
    </>
  );
}
