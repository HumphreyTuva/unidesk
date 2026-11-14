'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Copy, MapPin, Printer } from 'lucide-react';
import { CALL_OFF_OFFICE, CALL_OFF_STEPS } from '@/content/callOff';
import { REGISTRAR_ADDRESS } from '@/lib/letters';
import { useToast } from '@/lib/toast';
import { useSavedProfile } from '@/lib/useSavedProfile';

const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink placeholder:text-[#6B7794]';
const today = () => new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' });


// Academic year helper: typing 2026 fills in 2026/2027. Deleting does not refill, so it can still be edited.
function formatYear(raw: string, before: string) {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  const hadDigits = before.replace(/\D/g, '').length;
  if (d.length === 4 && hadDigits < 4) return `${d}/${Number(d) + 1}`;
  return d.length > 4 ? `${d.slice(0, 4)}/${d.slice(4)}` : d;
}

type Form = { name: string; adm: string; email: string; phone: string; school: string; course: string; semester: string; year: string; reason: string; resume: string };
const EMPTY: Form = { name: '', adm: '', email: '', phone: '', school: '', course: '', semester: 'ONE', year: '', reason: '', resume: '' };

// The letter in the format the Registrar expects (see content/callOff.ts). Used for the preview, Copy and Print.
function letterLines(f: Form, date: string): string[] {
  const reason = f.reason.trim().replace(/[.\s]+$/, '');
  const resume = f.resume.trim().replace(/[.\s]+$/, '');
  return [
    `NAME: ${f.name.trim()}`,
    `ADM NO: ${f.adm.trim().toUpperCase()}`,
    ...(f.email.trim() ? [`EMAIL: ${f.email.trim()}`] : []),
    `PHONE NUMBER: ${f.phone.trim()}`,
    `DATE: ${date}`,
    '',
    'TO:',
    ...REGISTRAR_ADDRESS,
    '',
    `REF: REQUEST TO CALL OFF SEMESTER ${f.semester} OF ACADEMIC YEAR ${f.year.trim()}`,
    '',
    `I, ${f.name.trim()}, of Admission Number ${f.adm.trim().toUpperCase()}, a student in the School of ${f.school.trim()}, taking ${f.course.trim()} course, hereby request permission to call off the semester due to ${reason}.`,
    '',
    `I intend to resume my studies in ${resume}.`,
    '',
    'Yours faithfully,',
    '',
    f.name.trim(),
    `Phone: ${f.phone.trim()}`,
  ];
}

export default function CallOff() {
  const [tab, setTab] = useState<'steps' | 'letter'>('steps');
  const [f, setF] = useState<Form>(EMPTY);
  const [lines, setLines] = useState<string[] | null>(null);
  const { save, loggedIn } = useSavedProfile(p => setF(prev => ({ ...prev, ...Object.fromEntries(Object.entries(p).filter(([k]) => !prev[k as keyof Form])) })));
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const letterRef = useRef<HTMLElement>(null);
  const [made, setMade] = useState(0);
  // After each "Write my letter", bring the letter into view once it has rendered.
  useEffect(() => { if (made) letterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [made]);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  const text = useMemo(() => (lines ? lines.join('\n') : ''), [lines]);

  const make = (e: React.FormEvent) => {
    e.preventDefault();
    save(f);
    setCopied(false);
    setLines(letterLines(f, today()));
    setMade(n => n + 1);
    toast.ok('Your letter is ready below');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.alert('Could not copy. Press and hold the letter to select it.'); }
  };

  return (
    <main className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-6">
      <Link href="/guide" aria-label="Back to guide" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full print:hidden"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold print:hidden">Call off a semester</h1>

      {/* Answer first, in plain words: this is the sentence a search or AI answer would quote. */}
      <p className="mt-2 text-[15px] leading-relaxed text-ink/80 print:hidden">
        To call off a semester at Kenyatta University, write a letter to the Registrar (Academic), take it to {CALL_OFF_OFFICE.where} and make sure it is stamped. Processing takes 2 to 3 days, and the reply is sent to your postal address within a week.
      </p>

      <div role="tablist" aria-label="Call off guide" className="mt-4 grid grid-cols-2 rounded-2xl bg-white p-1 print:hidden">
        {([['steps', 'Steps'], ['letter', 'My letter']] as const).map(([k, label]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`h-10 rounded-xl text-sm font-bold ${tab === k ? 'bg-brand text-white' : 'text-muted'}`}>{label}</button>
        ))}
      </div>

      {tab === 'steps' && (
        <div className="print:hidden">
          <ol className="mt-5 flex flex-col gap-3">
            {CALL_OFF_STEPS.map((s, i) => (
              <li key={s.title} id={`step-${i + 1}`} className="flex gap-3.5 rounded-[18px] border-[1.5px] border-line bg-white p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-extrabold text-brand">{i + 1}</span>
                <span>
                  <span className="block text-[15px] font-bold">{s.title}</span>
                  <span className="mt-0.5 block text-[14px] leading-relaxed text-muted">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-brand-soft p-4 text-[14px] font-bold text-brand">
            <MapPin size={18} className="mt-0.5 shrink-0" aria-hidden /> {CALL_OFF_OFFICE.where}
          </p>
          <button type="button" onClick={() => setTab('letter')} className="mt-4 h-[54px] w-full rounded-2xl bg-amber text-[15px] font-extrabold text-navy-900">Make my letter</button>
        </div>
      )}

      {tab === 'letter' && (
        <>
          <form onSubmit={make} className="mt-5 flex flex-col gap-3.5 print:hidden">
            <p className="text-[14px] text-muted">Fill this in and we will write the letter in the format the Registrar expects. {loggedIn ? 'Your details are remembered on this phone so the next letter is pre-filled.' : 'Log in and your details will be remembered for your next letter.'} Nothing is sent anywhere.</p>
            <Field id="co-name" label="Full name"><input id="co-name" value={f.name} onChange={set('name')} autoComplete="name" required className={field} /></Field>
            <Field id="co-adm" label="Admission number"><input id="co-adm" value={f.adm} onChange={set('adm')} autoCapitalize="characters" required className={field} /></Field>
            <Field id="co-phone" label="Phone number"><input id="co-phone" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" required className={field} /></Field>
            <Field id="co-email" label="Email" hint="optional"><input id="co-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" className={field} /></Field>
            <Field id="co-school" label="School"><input id="co-school" value={f.school} onChange={set('school')} placeholder="e.g. Pure and Applied Sciences" required className={field} /></Field>
            <Field id="co-course" label="Course"><input id="co-course" value={f.course} onChange={set('course')} placeholder="e.g. BSc Computer Science" required className={field} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="co-sem" label="Semester">
                <select id="co-sem" value={f.semester} onChange={set('semester')} className={field}>
                  <option value="ONE">One</option><option value="TWO">Two</option><option value="THREE">Three</option>
                </select>
              </Field>
              <Field id="co-year" label="Academic year"><input id="co-year" value={f.year} onChange={e => setF(prev => ({ ...prev, year: formatYear(e.target.value, prev.year) }))} inputMode="numeric" maxLength={9} pattern="\d{4}/\d{4}" title="Like 2026/2027" placeholder="2026/2027" required className={field} /></Field>
            </div>
            <Field id="co-reason" label="Reason for calling off">
              <textarea id="co-reason" value={f.reason} onChange={set('reason')} rows={3} maxLength={500} placeholder="Explain clearly, in your own words" required className="w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 py-3 text-[15px] text-ink placeholder:text-[#6B7794]" />
            </Field>
            <Field id="co-resume" label="When will you resume?"><input id="co-resume" value={f.resume} onChange={set('resume')} placeholder="e.g. January 2027" required className={field} /></Field>
            <button type="submit" className="h-[54px] rounded-2xl bg-brand text-base font-bold text-white">Write my letter</button>
          </form>

          {lines && (
            <section ref={letterRef} className="mt-6 scroll-mt-4" aria-label="Your letter">
              <article id="letter" className="print-area whitespace-pre-wrap rounded-[18px] border-[1.5px] border-line bg-white p-5 font-serif text-[15px] leading-relaxed text-ink">{text}</article>
              <div className="mt-4 grid grid-cols-2 gap-3 print:hidden">
                <button type="button" onClick={copy} className="flex h-[50px] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-edge bg-white font-bold">
                  {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />} {copied ? 'Copied' : 'Copy'}
                </button>
                <button type="button" onClick={() => window.print()} className="flex h-[50px] items-center justify-center gap-2 rounded-2xl bg-brand font-bold text-white">
                  <Printer size={18} aria-hidden /> Print or save PDF
                </button>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-muted print:hidden">Sign the printed letter, take it to {CALL_OFF_OFFICE.where}, and make sure it is stamped. Check the details before you print.</p>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-bold">{label}{hint && <span className="font-medium text-muted"> ({hint})</span>}</label>
      {children}
    </div>
  );
}
