'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Printer } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { useSavedProfile } from '@/lib/useSavedProfile';
import { LETTERS, formatYear, today, type FieldDef, type LetterKind } from '@/lib/letters';

const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink placeholder:text-[#6B7794]';

// Asks a few questions and writes the letter in the Registrar's format, with Copy and Print. Nothing is saved or sent anywhere.
export default function LetterForm({ kind }: { kind: LetterKind }) {
  const spec = LETTERS[kind];
  const initial = useMemo(() => Object.fromEntries(spec.fields.map(f => [f.id, f.type === 'select' ? f.options![0][0] : ''])) as Record<string, string>, [spec]);
  const [v, setV] = useState<Record<string, string>>(initial);
  const [lines, setLines] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const letterRef = useRef<HTMLElement>(null);
  const [made, setMade] = useState(0);
  // After each "Write my letter", bring the letter into view once it has rendered.
  useEffect(() => { if (made) letterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [made]);
  const { save, loggedIn } = useSavedProfile(p => setV(prev => Object.fromEntries(Object.entries(prev).map(([k, x]) => [k, x || (p as Record<string, string>)[k] || '']))));
  const text = lines ? lines.join('\n') : '';

  const make = (e: React.FormEvent) => { e.preventDefault(); save(v); setCopied(false); setLines(spec.lines(v, today())); setMade(n => n + 1); toast.ok('Your letter is ready below'); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.alert('Could not copy. Press and hold the letter to select it.'); }
  };

  const input = (f: FieldDef) => {
    const id = `lt-${f.id}`;
    const val = v[f.id] ?? '';
    const on = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV(p => ({ ...p, [f.id]: e.target.value }));
    if (f.type === 'select') return <select id={id} value={val} onChange={on} className={field}>{f.options!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
    if (f.type === 'textarea') return <textarea id={id} value={val} onChange={on} rows={3} maxLength={500} placeholder={f.placeholder} required={!f.optional} className="w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 py-3 text-[15px] text-ink placeholder:text-[#6B7794]" />;
    if (f.type === 'year') return <input id={id} value={val} onChange={e => setV(p => ({ ...p, [f.id]: formatYear(e.target.value, p[f.id] ?? '') }))} inputMode="numeric" maxLength={9} pattern="\d{4}/\d{4}" title="Like 2026/2027" placeholder="2026/2027" required className={field} />;
    const type = f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : 'text';
    return <input id={id} type={type} inputMode={f.type === 'tel' ? 'tel' : undefined} value={val} onChange={on} placeholder={f.placeholder} required={!f.optional} autoCapitalize={f.id === 'adm' ? 'characters' : undefined} autoComplete={f.id === 'name' ? 'name' : f.id === 'phone' ? 'tel' : f.id === 'email' ? 'email' : 'off'} className={field} />;
  };

  const rows: FieldDef[][] = [];
  for (let i = 0; i < spec.fields.length; i++) {
    const f = spec.fields[i];
    if (f.half && spec.fields[i + 1]?.half) { rows.push([f, spec.fields[i + 1]]); i++; } else rows.push([f]);
  }

  return (
    <>
      <form onSubmit={make} className="mt-5 flex flex-col gap-3.5 print:hidden">
        <p className="text-[14px] text-muted">{spec.intro} {loggedIn ? 'Your details are remembered on this phone so the next letter is pre-filled.' : 'Log in and your details will be remembered for your next letter.'} Nothing is sent anywhere.</p>
        {rows.map((row, i) => (
          <div key={i} className={row.length > 1 ? 'grid grid-cols-2 gap-3' : ''}>
            {row.map(f => f.type === 'check' ? (
              <label key={f.id} className="flex items-start gap-3 rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] p-3.5 text-[14px] font-semibold">
                <input type="checkbox" required checked={v[f.id] === 'yes'} onChange={e => setV(p => ({ ...p, [f.id]: e.target.checked ? 'yes' : '' }))} className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{f.label}</span>
              </label>
            ) : (
              <div key={f.id} className="flex flex-col gap-1.5">
                <label htmlFor={`lt-${f.id}`} className="text-[13px] font-bold">{f.label}{f.hint && <span className="font-medium text-muted"> ({f.hint})</span>}</label>
                {input(f)}
              </div>
            ))}
          </div>
        ))}
        <button type="submit" className="h-[54px] rounded-2xl bg-brand text-base font-bold text-white">Write my letter</button>
      </form>

      {lines && (
        <section ref={letterRef} className="mt-6 scroll-mt-4" aria-label="Your letter">
          <article className="print-area whitespace-pre-wrap rounded-[18px] border-[1.5px] border-line bg-white p-5 font-serif text-[15px] leading-relaxed text-ink">{text}</article>
          <div className="mt-4 grid grid-cols-2 gap-3 print:hidden">
            <button type="button" onClick={copy} className="flex h-[50px] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-edge bg-white font-bold">
              {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />} {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" onClick={() => window.print()} className="flex h-[50px] items-center justify-center gap-2 rounded-2xl bg-brand font-bold text-white">
              <Printer size={18} aria-hidden /> Print or save PDF
            </button>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted print:hidden">{spec.submit} Check the details before you print.</p>
        </section>
      )}
    </>
  );
}
