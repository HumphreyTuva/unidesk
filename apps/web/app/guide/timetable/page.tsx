'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Loader2, Plus, Printer, X } from 'lucide-react';
import { api } from '@/lib/api';

type Kind = 'class' | 'exam';
type ClassRow = { id: string; code: string; day: string; startHour: number; endHour: number; venue: string | null; elearning: boolean };
type ExamRow = { id: string; code: string; date: string; slot: string; students: number | null; venues: string[] };
type ClassResult = { label: string; resolved: ClassRow[]; ambiguous: { key: string; code: string; day: string; options: ClassRow[] }[]; clashes: { day: string; a: ClassRow; b: ClassRow }[]; notFound: string[] };
type ExamResult = { label: string; exams: ExamRow[]; clashes: { date: string; a: ExamRow; b: ExamRow }[]; notFound: string[] };

const hr = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? 'PM' : 'AM'}`;
const niceDate = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const store = (k: Kind) => `unidesk_units_${k}`;

export default function Timetable() {
  const [kind, setKind] = useState<Kind>('class');
  const [units, setUnits] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [sugg, setSugg] = useState<string[]>([]);
  const [info, setInfo] = useState<{ class: { label: string } | null; exam: { label: string } | null } | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [res, setRes] = useState<ClassResult | ExamResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  useEffect(() => { api('/timetable/info').then(setInfo).catch(() => setInfo({ class: null, exam: null })); }, []);
  // Remember each student's units on this phone only.
  useEffect(() => {
    setRes(null); setChoices({}); setQ(''); setSugg([]); setError('');
    try { setUnits(JSON.parse(localStorage.getItem(store(kind)) || '[]')); } catch { setUnits([]); }
  }, [kind]);
  useEffect(() => { try { localStorage.setItem(store(kind), JSON.stringify(units)); } catch {} }, [units, kind]);

  useEffect(() => {
    const n = ++seq.current;
    if (q.trim().length < 2) { setSugg([]); return; }
    const t = setTimeout(() => {
      api<{ codes: string[] }>(`/timetable/${kind}/units?q=${encodeURIComponent(q)}`).then(r => { if (n === seq.current) setSugg(r.codes.filter(c => !units.includes(c))); }).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q, kind, units]);

  const add = (c: string) => { setUnits(u => (u.includes(c) || u.length >= 30 ? u : [...u, c])); setQ(''); setSugg([]); setRes(null); };
  const remove = (c: string) => { setUnits(u => u.filter(x => x !== c)); setRes(null); };

  const generate = async (ch = choices) => {
    setBusy(true); setError('');
    try { setRes(await api(`/timetable/${kind}`, 'POST', kind === 'class' ? { codes: units, choices: ch } : { codes: units })); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const pick = (key: string, id: string) => { const ch = { ...choices, [key]: id }; setChoices(ch); generate(ch); };

  const available = info ? (kind === 'class' ? info.class : info.exam) : undefined;
  const cls = kind === 'class' ? (res as ClassResult | null) : null;
  const exm = kind === 'exam' ? (res as ExamResult | null) : null;
  const days = cls ? [...new Set(cls.resolved.map(r => r.day))] : [];
  const dates = exm ? [...new Set(exm.exams.map(r => r.date))] : [];

  return (
    <main className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/guide" aria-label="Back to guide" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full print:hidden"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Timetable</h1>

      <div role="tablist" className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-brand-soft p-1 print:hidden">
        {(['class', 'exam'] as Kind[]).map(k => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={`h-11 rounded-xl text-[15px] font-bold ${kind === k ? 'bg-white text-brand shadow-sm' : 'text-muted'}`}>{k === 'class' ? 'Classes' : 'Exams'}</button>
        ))}
      </div>

      {info && !available ? (
        <p className="mt-6 rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-6 text-center text-[15px] text-muted">The {kind === 'class' ? 'class' : 'exam'} timetable is not here yet. Check back soon.</p>
      ) : (
        <>
          {available && <p className="mt-3 text-[13px] text-muted print:hidden">{available.label}</p>}

          <label className="relative mt-3 block print:hidden">
            <span className="sr-only">Add a unit code</span>
            <input value={q} onChange={e => setQ(e.target.value)} autoCapitalize="characters" autoComplete="off" placeholder="Type a unit code, e.g. SBC101" className="h-[52px] w-full rounded-2xl border-[1.5px] border-edge bg-white px-4 text-[15px] uppercase placeholder:normal-case placeholder:text-muted" />
          </label>
          {sugg.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2 print:hidden">
              {sugg.map(c => <li key={c}><button type="button" onClick={() => add(c)} className="flex h-10 items-center gap-1 rounded-full border-[1.5px] border-brand bg-white px-3.5 text-[14px] font-bold text-brand"><Plus size={16} aria-hidden />{c}</button></li>)}
            </ul>
          )}
          {q.trim().length >= 2 && sugg.length === 0 && <p className="mt-2 text-[13px] text-muted print:hidden">No unit starting with “{q.trim().toUpperCase()}”.</p>}

          {units.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {units.map(c => (
                <li key={c} className="flex h-10 items-center gap-1 rounded-full bg-brand pl-3.5 pr-1 text-[14px] font-bold text-white">{c}
                  <button type="button" onClick={() => remove(c)} aria-label={`Remove ${c}`} className="flex h-8 w-8 items-center justify-center rounded-full print:hidden"><X size={16} aria-hidden /></button>
                </li>
              ))}
            </ul>
          )}

          {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
          <button type="button" disabled={!units.length || busy} onClick={() => generate()} className="mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-50 print:hidden">
            {busy && <Loader2 size={20} className="animate-spin" aria-hidden />} Make my {kind === 'class' ? 'class' : 'exam'} timetable
          </button>

          {res && (
            <section className="print-area mt-6" aria-live="polite">
              {res.notFound.length > 0 && <p className="mb-3 rounded-xl bg-[#FFF4DB] px-3.5 py-2.5 text-sm font-medium text-[#6B4A00]">Not found in this timetable: {res.notFound.join(', ')}. Check the code.</p>}

              {res.clashes.length > 0 && (
                <div className="mb-3 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">
                  <p className="flex items-center gap-1.5 font-bold"><AlertTriangle size={16} aria-hidden /> {res.clashes.length} clash{res.clashes.length > 1 ? 'es' : ''}</p>
                  <ul className="mt-1">
                    {cls?.clashes.map((c, i) => <li key={i}>{c.day}: {c.a.code} and {c.b.code} overlap ({hr(c.a.startHour)}-{hr(c.a.endHour)} / {hr(c.b.startHour)}-{hr(c.b.endHour)})</li>)}
                    {exm?.clashes.map((c, i) => <li key={i}>{niceDate(c.date)}: {c.a.code} and {c.b.code} are at the same time</li>)}
                  </ul>
                </div>
              )}

              {cls?.ambiguous.map(a => (
                <div key={a.key} className="mb-3 rounded-xl border-[1.5px] border-line bg-white p-3.5 print:hidden">
                  <p className="text-sm font-bold">{a.code} has more than one {a.day} class. Which is yours?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {a.options.map(o => {
                      const on = (choices[a.key] ?? cls.resolved.find(r => r.code === a.code && r.day === a.day)?.id) === o.id;
                      return <button key={o.id} type="button" onClick={() => pick(a.key, o.id)} className={`h-10 rounded-full border-[1.5px] px-3.5 text-[14px] font-bold ${on ? 'border-brand bg-brand text-white' : 'border-edge bg-white'}`}>{hr(o.startHour)}-{hr(o.endHour)}{o.venue ? ` · ${o.venue}` : ''}</button>;
                    })}
                  </div>
                </div>
              ))}

              {days.map(d => (
                <div key={d} className="mb-4">
                  <h2 className="mb-2 text-[15px] font-extrabold">{d}</h2>
                  <ul className="flex flex-col gap-2">
                    {cls!.resolved.filter(r => r.day === d).map(r => (
                      <li key={r.id} className="flex items-center gap-3 rounded-[16px] border-[1.5px] border-line bg-white px-4 py-3">
                        <span className="w-[74px] shrink-0 text-[13px] font-bold text-brand">{hr(r.startHour)}-{hr(r.endHour)}</span>
                        <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{r.code}</span><span className="block text-[13px] text-muted">{r.elearning ? 'E-learning (online)' : r.venue ? <Link href={`/guide/venues?q=${encodeURIComponent(r.venue)}`} className="font-semibold text-brand underline print:no-underline">{r.venue}</Link> : 'Venue not listed'}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {dates.map(d => (
                <div key={d} className="mb-4">
                  <h2 className="mb-2 text-[15px] font-extrabold">{niceDate(d)}</h2>
                  <ul className="flex flex-col gap-2">
                    {exm!.exams.filter(r => r.date === d).map(r => (
                      <li key={r.id} className="rounded-[16px] border-[1.5px] border-line bg-white px-4 py-3">
                        <p className="text-[13px] font-bold text-brand">{r.slot}</p>
                        <p className="text-[15px] font-bold">{r.code}</p>
                        <p className="text-[13px] text-muted">{r.venues.length ? r.venues.join(', ') : 'Venue not listed'}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {(cls?.resolved.length || exm?.exams.length) ? (
                <button type="button" onClick={() => window.print()} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-edge bg-white font-bold print:hidden"><Printer size={18} aria-hidden /> Print / Save as PDF</button>
              ) : null}
              <p className="mt-3 text-[12px] text-muted">Made from the published sheet. Always confirm on the official notice.</p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
