'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Download, ImageIcon, Loader2, Pencil, Plus, Printer, RotateCcw, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { CAT, CLASH, DESIGNS, MAX_SIDE, MIN_SIDE, SIZE_PRESETS, clampSide, hourLabel, renderTimetablePng, type Cat, type Design, type ExDay, type ExText } from '@/lib/timetableExport';

type Kind = 'class' | 'exam';
type ClassRow = { id: string; code: string; day: string; startHour: number; endHour: number; venue: string | null; elearning: boolean };
type ExamRow = { id: string; code: string; date: string; slot: string; students: number | null; venues: string[] };
type ClassResult = { label: string; resolved: ClassRow[]; ambiguous: { key: string; code: string; day: string; options: ClassRow[] }[]; clashes: { day: string; a: ClassRow; b: ClassRow }[]; notFound: string[] };
type ExamResult = { label: string; exams: ExamRow[]; clashes: { date: string; a: ExamRow; b: ExamRow }[]; notFound: string[] };

const hr = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? 'PM' : 'AM'}`;
const niceDate = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const store = (k: Kind) => `unidesk_units_${k}`;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 16 }, (_, i) => 6 + i);
type Edits<T> = { del: string[]; mod: Record<string, Partial<T>>; add: T[] };
const noEdits = <T,>(): Edits<T> => ({ del: [], mod: {}, add: [] });
const editKey = (k: Kind) => `unidesk_edits_${k}`;
const catOf = (r: ClassRow): Cat => (r.elearning ? 'elearning' : !r.venue ? 'other' : /LAB/i.test(r.venue) ? 'lab' : 'campus');
const applyEdits = <T extends { id: string }>(base: T[], e: Edits<T>): T[] => [...base.filter(r => !e.del.includes(r.id)).map(r => ({ ...r, ...(e.mod[r.id] ?? {}) })), ...e.add];
const classClashes = (rows: ClassRow[]) => {
  const out: { day: string; a: ClassRow; b: ClassRow }[] = [];
  rows.forEach((a, i) => rows.slice(i + 1).forEach(b => { if (!a.elearning && !b.elearning && a.day === b.day && a.startHour < b.endHour && b.startHour < a.endHour) out.push({ day: a.day, a, b }); }));
  return out;
};
const examClashes = (rows: ExamRow[]) => {
  const out: { date: string; a: ExamRow; b: ExamRow }[] = [];
  rows.forEach((a, i) => rows.slice(i + 1).forEach(b => { if (a.date === b.date && a.slot.trim().toLowerCase() === b.slot.trim().toLowerCase()) out.push({ date: a.date, a, b }); }));
  return out;
};
const dayIdx = (d: string) => { const i = DAYS.indexOf(d); return i < 0 ? 99 : i; };


type Draft = { id: string; isNew: boolean; code: string; day: string; start: string; end: string; venue: string; elearning: boolean; date: string; slot: string };

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
  const [cEdits, setCEdits] = useState<Edits<ClassRow>>(noEdits());
  const [eEdits, setEEdits] = useState<Edits<ExamRow>>(noEdits());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [exporting, setExporting] = useState(false);
  const seq = useRef(0);

  useEffect(() => { api('/timetable/info').then(setInfo).catch(() => setInfo({ class: null, exam: null })); }, []);
  // Remember each student's units and changes on this phone only.
  useEffect(() => {
    setRes(null); setChoices({}); setQ(''); setSugg([]); setError('');
    try { setUnits(JSON.parse(localStorage.getItem(store(kind)) || '[]')); } catch { setUnits([]); }
    try {
      const e = JSON.parse(localStorage.getItem(editKey(kind)) || 'null');
      if (e && Array.isArray(e.del) && Array.isArray(e.add) && e.mod) (kind === 'class' ? setCEdits : setEEdits)(e);
    } catch {}
  }, [kind]);
  useEffect(() => { try { localStorage.setItem(store(kind), JSON.stringify(units)); } catch {} }, [units, kind]);
  useEffect(() => { try { localStorage.setItem(editKey('class'), JSON.stringify(cEdits)); } catch {} }, [cEdits]);
  useEffect(() => { try { localStorage.setItem(editKey('exam'), JSON.stringify(eEdits)); } catch {} }, [eEdits]);

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

  // The sheet's rows with this student's own changes on top.
  const classes = useMemo(() => (cls ? applyEdits(cls.resolved, cEdits).sort((a, b) => dayIdx(a.day) - dayIdx(b.day) || a.startHour - b.startHour) : []), [cls, cEdits]);
  const exams = useMemo(() => (exm ? applyEdits(exm.exams, eEdits).sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot)) : []), [exm, eEdits]);
  const cClash = useMemo(() => classClashes(classes), [classes]);
  const eClash = useMemo(() => examClashes(exams), [exams]);
  const clashIds = new Set([...cClash.flatMap(c => [c.a.id, c.b.id]), ...eClash.flatMap(c => [c.a.id, c.b.id])]);
  const days = [...new Set(classes.map(r => r.day))];
  const dates = [...new Set(exams.map(r => r.date))];
  const changed = kind === 'class' ? cEdits.del.length + cEdits.add.length + Object.keys(cEdits.mod).length > 0 : eEdits.del.length + eEdits.add.length + Object.keys(eEdits.mod).length > 0;

  const openEdit = (r?: ClassRow | ExamRow) => {
    const base: Draft = { id: '', isNew: !r, code: '', day: 'Monday', start: '8', end: '10', venue: '', elearning: false, date: new Date().toISOString().slice(0, 10), slot: '' };
    if (r && 'day' in r) setDraft({ ...base, id: r.id, code: r.code, day: r.day, start: String(r.startHour), end: String(r.endHour), venue: r.venue ?? '', elearning: r.elearning });
    else if (r) setDraft({ ...base, id: r.id, code: r.code, date: r.date, slot: r.slot, venue: r.venues.join(', ') });
    else setDraft(base);
  };
  const del = (id: string) => {
    if (kind === 'class') setCEdits(e => e.add.some(a => a.id === id) ? { ...e, add: e.add.filter(a => a.id !== id) } : { ...e, del: [...e.del, id] });
    else setEEdits(e => e.add.some(a => a.id === id) ? { ...e, add: e.add.filter(a => a.id !== id) } : { ...e, del: [...e.del, id] });
  };
  const resetEdits = () => { if (kind === 'class') setCEdits(noEdits()); else setEEdits(noEdits()); };
  const saveDraft = () => {
    if (!draft) return;
    const code = draft.code.replace(/\s+/g, '').toUpperCase();
    if (!code) return;
    if (kind === 'class') {
      const s = Number(draft.start), e = Number(draft.end);
      if (!(e > s)) { setError('The end time must be after the start time.'); return; }
      const row: ClassRow = { id: draft.isNew ? `x${Date.now()}` : draft.id, code, day: draft.day, startHour: s, endHour: e, venue: draft.elearning ? null : draft.venue.trim() || null, elearning: draft.elearning };
      setCEdits(ed => draft.isNew ? { ...ed, add: [...ed.add, row] } : ed.add.some(a => a.id === row.id) ? { ...ed, add: ed.add.map(a => (a.id === row.id ? row : a)) } : { ...ed, mod: { ...ed.mod, [row.id]: row } });
    } else {
      const row: ExamRow = { id: draft.isNew ? `x${Date.now()}` : draft.id, code, date: draft.date, slot: draft.slot.trim() || 'Time not set', students: null, venues: draft.venue.split(',').map(v => v.trim()).filter(Boolean) };
      setEEdits(ed => draft.isNew ? { ...ed, add: [...ed.add, row] } : ed.add.some(a => a.id === row.id) ? { ...ed, add: ed.add.map(a => (a.id === row.id ? row : a)) } : { ...ed, mod: { ...ed.mod, [row.id]: row } });
    }
    setError(''); setDraft(null);
  };

  // What the picture is drawn from.
  const exportDays: ExDay[] = kind === 'class'
    ? days.map(d => ({ title: d, items: classes.filter(r => r.day === d).map(r => ({ code: r.code, time: `${hourLabel(r.startHour)} – ${hourLabel(r.endHour)}`, meta: r.elearning ? 'Online' : r.venue ?? '', cat: catOf(r), clash: clashIds.has(r.id), start: r.startHour, end: r.endHour })) }))
    : dates.map(d => ({ title: niceDate(d), items: exams.filter(r => r.date === d).map(r => ({ code: r.code, time: r.slot, meta: r.venues.join(', '), cat: 'exam' as Cat, clash: clashIds.has(r.id) })) }));

  const lanesFor = (rows: ClassRow[]) => {
    const ends: number[] = [];
    return rows.map(r => { let l = ends.findIndex(e => e <= r.startHour); if (l < 0) { l = ends.length; ends.push(0); } ends[l] = r.endHour; return { r, lane: l }; });
  };
  const gridFrom = classes.length ? Math.min(...classes.map(r => r.startHour)) : 8;
  const gridTo = classes.length ? Math.max(...classes.map(r => r.endHour)) : 17;
  const gridCols = Math.max(1, gridTo - gridFrom);

  const rowButtons = (id: string, r: ClassRow | ExamRow) => (
    <span className="flex shrink-0 print:hidden">
      <button type="button" onClick={() => openEdit(r)} aria-label={`Edit ${r.code}`} className="flex h-10 w-10 items-center justify-center rounded-full text-muted"><Pencil size={17} aria-hidden /></button>
      <button type="button" onClick={() => del(id)} aria-label={`Remove ${r.code}`} className="flex h-10 w-10 items-center justify-center rounded-full text-[#9B1C1C]"><Trash2 size={17} aria-hidden /></button>
    </span>
  );

  const hasRows = kind === 'class' ? classes.length > 0 : exams.length > 0;
  const clashCount = kind === 'class' ? cClash.length : eClash.length;

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
            <ul className="mt-4 flex flex-wrap gap-2 print:hidden">
              {units.map(c => (
                <li key={c} className="flex h-10 items-center gap-1 rounded-full bg-brand pl-3.5 pr-1 text-[14px] font-bold text-white">{c}
                  <button type="button" onClick={() => remove(c)} aria-label={`Remove ${c}`} className="flex h-8 w-8 items-center justify-center rounded-full"><X size={16} aria-hidden /></button>
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

              {clashCount > 0 && (
                <div className="mb-3 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">
                  <p className="flex items-center gap-1.5 font-bold"><AlertTriangle size={16} aria-hidden /> {clashCount} clash{clashCount > 1 ? 'es' : ''}</p>
                  <ul className="mt-1">
                    {cClash.map((c, i) => <li key={i}>{c.day}: {c.a.code} and {c.b.code} overlap ({hr(c.a.startHour)}-{hr(c.a.endHour)} / {hr(c.b.startHour)}-{hr(c.b.endHour)})</li>)}
                    {eClash.map((c, i) => <li key={i}>{niceDate(c.date)}: {c.a.code} and {c.b.code} are at the same time</li>)}
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

              <div className="mb-4 flex flex-wrap gap-2 print:hidden">
                <button type="button" onClick={() => openEdit()} className="flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-brand bg-white px-4 text-[14px] font-bold text-brand"><Plus size={16} aria-hidden /> Add {kind === 'class' ? 'a class' : 'an exam'}</button>
                {hasRows && <button type="button" onClick={() => setExporting(true)} className="flex h-11 items-center gap-1.5 rounded-full bg-brand px-4 text-[14px] font-bold text-white"><ImageIcon size={16} aria-hidden /> Save as image</button>}
                {changed && <button type="button" onClick={resetEdits} className="flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-edge bg-white px-4 text-[14px] font-bold text-muted"><RotateCcw size={16} aria-hidden /> Undo my changes</button>}
              </div>

              {cls && classes.length > 0 && (
                <div className="mb-5 hidden md:block print:hidden">
                  <div className="overflow-x-auto rounded-2xl border-[1.5px] border-line bg-white p-2">
                    <div style={{ minWidth: 96 + gridCols * 84 }}>
                      <div className="flex">
                        <div className="w-[96px] shrink-0" />
                        <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
                          {Array.from({ length: gridCols }, (_, i) => <span key={i} className="pb-1 text-center text-[11px] font-bold text-muted">{hourLabel(gridFrom + i)}</span>)}
                        </div>
                      </div>
                      {days.map(d => {
                        const placed = lanesFor(classes.filter(r => r.day === d));
                        const n = Math.max(1, ...placed.map(p => p.lane + 1));
                        return (
                          <div key={d} className="flex border-t border-line">
                            <div className="flex w-[96px] shrink-0 items-center px-2 text-[13px] font-extrabold">{d}</div>
                            <div className="relative flex-1" style={{ height: n * 58 }}>
                              {placed.map(({ r, lane }) => {
                                const c = clashIds.has(r.id) ? CLASH : CAT[catOf(r)];
                                return (
                                  <button key={r.id} type="button" onClick={() => openEdit(r)} aria-label={`Edit ${r.code}`} className="absolute overflow-hidden rounded-lg border-2 px-2 py-1 text-left"
                                    style={{ left: `${((r.startHour - gridFrom) / gridCols) * 100}%`, width: `${((r.endHour - r.startHour) / gridCols) * 100}%`, top: lane * 58 + 3, height: 52, background: c.bg, borderColor: c.border }}>
                                    <span className="block truncate text-[13px] font-extrabold leading-tight">{r.code}</span>
                                    <span className="block truncate text-[11px] font-semibold text-muted">{r.elearning ? 'Online' : r.venue ?? 'Venue not listed'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-semibold text-muted">
                    {[...new Set(classes.map(catOf))].map(k => <li key={k} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border-2" style={{ background: CAT[k].bg, borderColor: CAT[k].border }} />{CAT[k].label}</li>)}
                    {cClash.length > 0 && <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border-2" style={{ background: CLASH.bg, borderColor: CLASH.border }} />Clash</li>}
                  </ul>
                </div>
              )}

              <div className="md:hidden print:block">
                {days.map(d => (
                  <div key={d} className="mb-4">
                    <h2 className="mb-2 text-[15px] font-extrabold">{d}</h2>
                    <ul className="flex flex-col gap-2">
                      {classes.filter(r => r.day === d).map(r => {
                        const c = clashIds.has(r.id) ? CLASH : CAT[catOf(r)];
                        return (
                          <li key={r.id} className="flex items-center gap-2 rounded-[16px] border-[1.5px] bg-white py-2 pl-4 pr-1" style={{ borderColor: c.border, borderLeftWidth: 6 }}>
                            <span className="w-[74px] shrink-0 text-[13px] font-bold text-brand">{hr(r.startHour)}-{hr(r.endHour)}</span>
                            <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{r.code}</span><span className="block text-[13px] text-muted">{r.elearning ? 'E-learning (online)' : r.venue ? <Link href={`/guide/venues?q=${encodeURIComponent(r.venue)}`} className="font-semibold text-brand underline print:no-underline">{r.venue}</Link> : 'Venue not listed'}</span></span>
                            {rowButtons(r.id, r)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              {dates.map(d => (
                <div key={d} className="mb-4">
                  <h2 className="mb-2 text-[15px] font-extrabold">{niceDate(d)}</h2>
                  <ul className="flex flex-col gap-2">
                    {exams.filter(r => r.date === d).map(r => (
                      <li key={r.id} className="flex items-center gap-2 rounded-[16px] border-[1.5px] bg-white py-2 pl-4 pr-1" style={{ borderColor: clashIds.has(r.id) ? CLASH.border : '#DDE3F0', borderLeftWidth: 6 }}>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold text-brand">{r.slot}</span>
                          <span className="block text-[15px] font-bold">{r.code}</span>
                          <span className="block text-[13px] text-muted">{r.venues.length ? r.venues.join(', ') : 'Venue not listed'}</span>
                        </span>
                        {rowButtons(r.id, r)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {!hasRows && <p className="mb-3 rounded-xl border-[1.5px] border-dashed border-edge bg-white p-5 text-center text-[14px] text-muted">Nothing here. Use Add to put a {kind === 'class' ? 'class' : 'exam'} back, or Undo my changes.</p>}
              {hasRows && <button type="button" onClick={() => window.print()} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-edge bg-white font-bold print:hidden"><Printer size={18} aria-hidden /> Print / Save as PDF</button>}
              <p className="mt-3 text-[12px] text-muted">Made from the published sheet{changed ? ' with your changes' : ''}. Always confirm on the official notice.</p>
            </section>
          )}
        </>
      )}

      {draft && <EditDialog kind={kind} draft={draft} setDraft={setDraft} onSave={saveDraft} />}
      {exporting && <ExportDialog days={exportDays} kind={kind} onClose={() => setExporting(false)} />}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[13px] font-bold text-muted">{label}</span>{children}</label>;
}
const inputCls = 'h-12 w-full rounded-xl border-[1.5px] border-edge bg-white px-3 text-[15px]';

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center print:hidden" role="dialog" aria-modal="true" aria-label={title} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom))] sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full"><X size={20} aria-hidden /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditDialog({ kind, draft, setDraft, onSave }: { kind: Kind; draft: Draft; setDraft: (d: Draft | null) => void; onSave: () => void }) {
  const set = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
  return (
    <Modal title={`${draft.isNew ? 'Add' : 'Edit'} ${kind === 'class' ? 'class' : 'exam'}`} onClose={() => setDraft(null)}>
      <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); onSave(); }}>
        <Field label="Unit code"><input className={`${inputCls} uppercase`} value={draft.code} onChange={e => set({ code: e.target.value })} autoCapitalize="characters" required /></Field>
        {kind === 'class' ? (
          <>
            <Field label="Day"><select className={inputCls} value={draft.day} onChange={e => set({ day: e.target.value })}>{DAYS.map(d => <option key={d}>{d}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts"><select className={inputCls} value={draft.start} onChange={e => set({ start: e.target.value })}>{HOURS.map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}</select></Field>
              <Field label="Ends"><select className={inputCls} value={draft.end} onChange={e => set({ end: e.target.value })}>{HOURS.concat(22).map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}</select></Field>
            </div>
            <label className="flex items-center gap-2 text-[15px] font-semibold"><input type="checkbox" className="h-5 w-5" checked={draft.elearning} onChange={e => set({ elearning: e.target.checked })} /> E-learning (online)</label>
            {!draft.elearning && <Field label="Venue"><input className={inputCls} value={draft.venue} onChange={e => set({ venue: e.target.value })} placeholder="e.g. SOE6" /></Field>}
          </>
        ) : (
          <>
            <Field label="Date"><input type="date" className={inputCls} value={draft.date} onChange={e => set({ date: e.target.value })} required /></Field>
            <Field label="Time"><input className={inputCls} value={draft.slot} onChange={e => set({ slot: e.target.value })} placeholder="e.g. 8:00 AM - 10:00 AM" /></Field>
            <Field label="Venue (separate several with commas)"><input className={inputCls} value={draft.venue} onChange={e => set({ venue: e.target.value })} /></Field>
          </>
        )}
        <p className="text-[12px] text-muted">Changes stay on this phone. The official timetable is not changed.</p>
        <button type="submit" className="h-[52px] rounded-2xl bg-brand text-base font-bold text-white">Save</button>
      </form>
    </Modal>
  );
}

function ExportDialog({ days, kind, onClose }: { days: ExDay[]; kind: Kind; onClose: () => void }) {
  const [preset, setPreset] = useState('wide');
  const [w, setW] = useState('2400');
  const [h, setH] = useState('1200');
  const [design, setDesign] = useState<Design>('auto');
  const [text, setText] = useState<ExText>({ title: kind === 'class' ? 'My class timetable' : 'My exam timetable', subtitle: 'Semester timetable', footer: 'Made with UniDesk · unidesk.co.ke' });
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const blobRef = useRef<Blob | null>(null);
  const width = clampSide(Number(w)), height = clampSide(Number(h));

  useEffect(() => {
    let live = true; let made = '';
    const t = setTimeout(async () => {
      setBusy(true); setErr('');
      try {
        try { await document.fonts.ready; } catch {}
        const blob = await renderTimetablePng(days, { width, height, design, text, font: getComputedStyle(document.body).fontFamily || 'sans-serif' });
        if (!live) return;
        blobRef.current = blob; made = URL.createObjectURL(blob); setUrl(made);
      } catch (e: any) { if (live) setErr(e?.message || 'Could not make the image. Try a smaller size.'); }
      finally { if (live) setBusy(false); }
    }, 300);
    return () => { live = false; clearTimeout(t); if (made) URL.revokeObjectURL(made); };
  }, [days, width, height, design, text]);

  const download = () => {
    if (!blobRef.current) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blobRef.current);
    a.download = `unidesk-${kind}-timetable-${width}x${height}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const chip = (on: boolean) => `h-10 rounded-full border-[1.5px] px-3.5 text-[14px] font-bold ${on ? 'border-brand bg-brand text-white' : 'border-edge bg-white'}`;

  return (
    <Modal title="Save as image" onClose={onClose} wide>
      <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1 text-[13px] font-bold text-muted">Size</p>
            <div className="flex flex-wrap gap-2">
              {SIZE_PRESETS.map(p => <button key={p.id} type="button" className={chip(preset === p.id)} onClick={() => { setPreset(p.id); setW(String(p.width)); setH(String(p.height)); }}>{p.label}</button>)}
              <button type="button" className={chip(preset === 'custom')} onClick={() => setPreset('custom')}>Custom</button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Field label="Width (px)"><input className={inputCls} inputMode="numeric" value={w} onChange={e => { setW(e.target.value.replace(/\D/g, '')); setPreset('custom'); }} /></Field>
              <Field label="Height (px)"><input className={inputCls} inputMode="numeric" value={h} onChange={e => { setH(e.target.value.replace(/\D/g, '')); setPreset('custom'); }} /></Field>
            </div>
            <p className="mt-1 text-[12px] text-muted">{width} × {height}. Allowed {MIN_SIDE} to {MAX_SIDE}.</p>
          </div>
          <div>
            <p className="mb-1 text-[13px] font-bold text-muted">Design</p>
            <div className="flex flex-wrap gap-2">{DESIGNS.filter(d => kind === 'class' || d.id !== 'grid').map(d => <button key={d.id} type="button" title={d.note} className={chip(design === d.id)} onClick={() => setDesign(d.id)}>{d.label}</button>)}</div>
          </div>
          <Field label="Title"><input className={inputCls} value={text.title} maxLength={40} onChange={e => setText({ ...text, title: e.target.value })} /></Field>
          <Field label="Subtitle"><input className={inputCls} value={text.subtitle} maxLength={50} onChange={e => setText({ ...text, subtitle: e.target.value })} /></Field>
          <Field label="Footer line"><input className={inputCls} value={text.footer} maxLength={70} onChange={e => setText({ ...text, footer: e.target.value })} /></Field>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-line bg-brand-soft p-2">
            {url ? <img src={url} alt="Preview of your timetable image" className="max-h-[60vh] w-auto max-w-full rounded-lg" /> : <Loader2 className="animate-spin text-muted" aria-hidden />}
          </div>
          {err && <p role="alert" className="rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{err}</p>}
          <button type="button" onClick={download} disabled={busy || !url} className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-50"><Download size={18} aria-hidden /> Download PNG</button>
        </div>
      </div>
    </Modal>
  );
}
