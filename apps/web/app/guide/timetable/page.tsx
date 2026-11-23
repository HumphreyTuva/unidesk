'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Bell, CalendarPlus, Download, ImageIcon, Loader2, Pencil, Plus, Printer, RotateCcw, StickyNote, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { currentSubscription, enablePush, isIos, isStandalone, pushSupported } from '@/lib/pushReminders';
import { REMIND_CHOICES, WEEK_CHOICES, buildIcs } from '@/lib/timetableIcs';
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
const NOTES_KEY = 'unidesk_class_notes';
const REMIND_KEY = 'unidesk_class_reminders';
const noteKeyOf = (r: { code: string; day: string; startHour: number }) => `${r.code}|${r.day}|${r.startHour}`;
type Remind = { mins: number; weeks: number; custom: boolean };
type Push = { ready: boolean; supported: boolean; needsInstall: boolean; publicKey: string | null; on: boolean; busy: boolean };
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


type Draft = { note: string; noteKey: string; id: string; isNew: boolean; code: string; day: string; start: string; end: string; venue: string; elearning: boolean; date: string; slot: string };

export default function Timetable() {
  const [kind, setKind] = useState<Kind>('class');
  const toast = useToast();
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
  const [remOpen, setRemOpen] = useState(false);
  const [allUnits, setAllUnits] = useState(false);
  // Floating buttons: show while the person swipes up the screen (reading further down), hide when they swipe back down.
  const [barOn, setBarOn] = useState(false); // hidden until the person scrolls
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY, dy = y - last;
      if (Math.abs(dy) < 8) return;
      setBarOn(dy > 0); // finger swipes up (page moves down) = show; swipes down = hide
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const seq = useRef(0);
  // Notes on classes and the reminder choice stay on this phone. Reminders are on by default.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [remind, setRemind] = useState<Remind>({ mins: 30, weeks: 10, custom: false });
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [customText, setCustomText] = useState('30');
  useEffect(() => { setCustomText(String(remind.mins)); }, [prefsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    try { const n = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); if (n && typeof n === 'object') setNotes(n); } catch {}
    try { const r = JSON.parse(localStorage.getItem(REMIND_KEY) || 'null'); if (r && typeof r === 'object') { const m = Number.isInteger(r.mins) && r.mins >= 1 && r.mins <= 1440 ? r.mins : 30; setRemind({ mins: m, weeks: WEEK_CHOICES.includes(r.weeks) ? r.weeks : 10, custom: !REMIND_CHOICES.includes(m) }); } } catch {}
    setPrefsLoaded(true);
  }, []);
  useEffect(() => { if (prefsLoaded) try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); } catch {} }, [notes, prefsLoaded]);
  useEffect(() => { if (prefsLoaded) try { localStorage.setItem(REMIND_KEY, JSON.stringify(remind)); } catch {} }, [remind, prefsLoaded]);

  // Push reminders: logged-in students only. `push.on` means this phone is subscribed and the server has reminders enabled.
  const { user } = useAuth();
  const [push, setPush] = useState<Push>({ ready: false, supported: false, needsInstall: false, publicKey: null, on: false, busy: false });
  useEffect(() => {
    let live = true;
    (async () => {
      const supported = pushSupported();
      const needsInstall = !supported && isIos() && !isStandalone();
      let publicKey: string | null = null;
      try { publicKey = (await api<{ publicKey: string | null }>('/reminders/key')).publicKey; } catch {}
      let on = false;
      if (supported && user && publicKey && Notification.permission === 'granted') {
        try {
          const [sub, me] = await Promise.all([currentSubscription(), api<{ enabled: boolean }>('/reminders/me')]);
          on = !!sub && me.enabled;
        } catch {}
      }
      if (live) setPush(p => ({ ...p, ready: true, supported, needsInstall, publicKey, on }));
    })();
    return () => { live = false; };
  }, [user]);

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

  const add = (c: string) => { if (units.length >= 30 && !units.includes(c)) { toast.error('You can add up to 30 units.'); return; } if (!units.includes(c)) toast.ok(`Added ${c}`); setUnits(u => (u.includes(c) || u.length >= 30 ? u : [...u, c])); setQ(''); setSugg([]); setRes(null); };
  const [ask, setAsk] = useState<{ title: string; body: string; label: string; run: () => void } | null>(null);
  const remove = (c: string) => setAsk({ title: `Remove ${c}?`, body: 'It will be taken out of your units. Your timetable will need to be made again.', label: 'Remove', run: () => { setUnits(u => u.filter(x => x !== c)); setRes(null); toast.ok(`${c} removed from your units`); } });

  const generate = async (ch = choices, scroll = false) => {
    setBusy(true); setError('');
    try {
      setRes(await api(`/timetable/${kind}`, 'POST', kind === 'class' ? { codes: units, choices: ch } : { codes: units }));
      if (scroll) setTimeout(() => document.getElementById('tt-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const pick = (key: string, id: string) => { const ch = { ...choices, [key]: id }; setChoices(ch); generate(ch); };

  const available = info ? (kind === 'class' ? info.class : info.exam) : undefined;
  // On a tab switch the old result is still here for one render, so check its shape, not just the tab.
  const cls = kind === 'class' && res && 'resolved' in res ? (res as ClassResult) : null;
  const exm = kind === 'exam' && res && 'exams' in res ? (res as ExamResult) : null;
  const shown = cls ?? exm;

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
    const base: Draft = { note: '', noteKey: '', id: '', isNew: !r, code: '', day: 'Monday', start: '8', end: '10', venue: '', elearning: false, date: new Date().toISOString().slice(0, 10), slot: '' };
    if (r && 'day' in r) setDraft({ ...base, note: notes[noteKeyOf(r)] ?? '', noteKey: noteKeyOf(r), id: r.id, code: r.code, day: r.day, start: String(r.startHour), end: String(r.endHour), venue: r.venue ?? '', elearning: r.elearning });
    else if (r) setDraft({ ...base, id: r.id, code: r.code, date: r.date, slot: r.slot, venue: r.venues.join(', ') });
    else setDraft(base);
  };
  const del = (id: string, code = '') => {
    toast.ok(`${code ? `${code} removed` : 'Removed'}. Tap “Undo my changes” to bring it back.`);
    if (kind === 'class') setCEdits(e => e.add.some(a => a.id === id) ? { ...e, add: e.add.filter(a => a.id !== id) } : { ...e, del: [...e.del, id] });
    else setEEdits(e => e.add.some(a => a.id === id) ? { ...e, add: e.add.filter(a => a.id !== id) } : { ...e, del: [...e.del, id] });
  };
  const resetEdits = () => setAsk({ title: 'Undo all your changes?', body: 'This puts the original timetable back and removes everything you added, changed or deleted.', label: 'Undo changes', run: () => { if (kind === 'class') setCEdits(noEdits()); else setEEdits(noEdits()); toast.ok('Back to the original timetable'); } });
  const saveDraft = () => {
    if (!draft) return;
    const code = draft.code.replace(/\s+/g, '').toUpperCase();
    if (!code) return;
    if (kind === 'class') {
      const s = Number(draft.start), e = Number(draft.end);
      if (!(e > s)) { setError('The end time must be after the start time.'); return; }
      const row: ClassRow = { id: draft.isNew ? `x${Date.now()}` : draft.id, code, day: draft.day, startHour: s, endHour: e, venue: draft.elearning ? null : draft.venue.trim() || null, elearning: draft.elearning };
      const nk = noteKeyOf(row), text = draft.note.trim().slice(0, 200);
      setNotes(n => { const m = { ...n }; if (draft.noteKey && draft.noteKey !== nk) delete m[draft.noteKey]; if (text) m[nk] = text; else delete m[nk]; return m; });
      setCEdits(ed => draft.isNew ? { ...ed, add: [...ed.add, row] } : ed.add.some(a => a.id === row.id) ? { ...ed, add: ed.add.map(a => (a.id === row.id ? row : a)) } : { ...ed, mod: { ...ed.mod, [row.id]: row } });
    } else {
      const row: ExamRow = { id: draft.isNew ? `x${Date.now()}` : draft.id, code, date: draft.date, slot: draft.slot.trim() || 'Time not set', students: null, venues: draft.venue.split(',').map(v => v.trim()).filter(Boolean) };
      setEEdits(ed => draft.isNew ? { ...ed, add: [...ed.add, row] } : ed.add.some(a => a.id === row.id) ? { ...ed, add: ed.add.map(a => (a.id === row.id ? row : a)) } : { ...ed, mod: { ...ed.mod, [row.id]: row } });
    }
    setError(''); setDraft(null);
    toast.ok(draft.isNew ? `${code} added to your timetable` : `Changes to ${code} saved`);
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
      <button type="button" onClick={() => setAsk({ title: `Remove ${r.code}?`, body: kind === 'class' ? `${r.code} will be taken off your timetable. You can bring it back with “Undo my changes”.` : `${r.code} will be taken off your exam list. You can bring it back with “Undo my changes”.`, label: 'Remove', run: () => del(id, r.code) })} aria-label={`Remove ${r.code}`} className="flex h-10 w-10 items-center justify-center rounded-full text-danger"><Trash2 size={17} aria-hidden /></button>
    </span>
  );

  const schedulePayload = (enabled: boolean) => ({
    enabled, minsBefore: remind.mins, weeks: remind.weeks,
    classes: classes.map(r => ({ code: r.code, day: r.day, start: r.startHour, end: r.endHour, venue: r.venue, online: r.elearning, note: notes[noteKeyOf(r)] ?? '' })),
  });
  const turnOnPush = async () => {
    if (!user) { toast.error('Log in to get class reminders.'); return; }
    if (!push.publicKey) { toast.error('Reminders are not switched on yet. Please try again later.'); return; }
    setPush(p => ({ ...p, busy: true }));
    try {
      await enablePush(push.publicKey);
      await api('/reminders/schedule', 'PUT', schedulePayload(true));
      setPush(p => ({ ...p, on: true }));
      toast.ok(`Reminders are on. You will be notified ${remind.mins} minutes before each class.`);
    } catch (e: any) {
      toast.error(e?.message === 'blocked' ? 'Notifications are blocked. Allow them for UniDesk in your browser settings, then try again.' : e?.message || 'Could not turn on reminders.');
    } finally { setPush(p => ({ ...p, busy: false })); }
  };
  const turnOffPush = async () => {
    setPush(p => ({ ...p, busy: true }));
    try { await api('/reminders/schedule', 'PUT', schedulePayload(false)); setPush(p => ({ ...p, on: false })); toast.ok('Reminders are off.'); }
    catch (e: any) { toast.error(e?.message || 'Could not turn off reminders.'); }
    finally { setPush(p => ({ ...p, busy: false })); }
  };
  const sendTest = async () => {
    try { await api('/reminders/test', 'POST'); toast.ok('Sent. It should arrive in a few seconds.'); }
    catch (e: any) { toast.error(e?.message || 'Could not send a test.'); }
  };
  // Keep the server's copy in step with edits, notes and the reminder time (only while reminders are on and a timetable is showing).
  const lastSync = useRef<string | null>(null);
  const syncKey = JSON.stringify([classes.map(r => [r.code, r.day, r.startHour, r.endHour, r.venue, r.elearning, notes[noteKeyOf(r)] ?? '']), remind.mins, remind.weeks]);
  useEffect(() => {
    if (!push.on || !cls || classes.length === 0) return;
    const t = setTimeout(() => {
      api('/reminders/schedule', 'PUT', schedulePayload(true))
        .then(() => { if (lastSync.current !== null && lastSync.current !== syncKey) toast.ok('Reminders updated'); lastSync.current = syncKey; })
        .catch(() => toast.error('Could not save your reminder changes. Check your connection.'));
    }, 1500);
    return () => clearTimeout(t);
  }, [syncKey, push.on]); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadCalendar = () => {
    const rows = classes.map(r => ({ code: r.code, day: r.day, startHour: r.startHour, endHour: r.endHour, venue: r.venue, elearning: r.elearning, note: notes[noteKeyOf(r)] }));
    const blob = new Blob([buildIcs(rows, { remindMins: remind.mins, weeks: remind.weeks })], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    const t = new Date(); const tag = `${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}${String(t.getSeconds()).padStart(2, '0')}`;
    a.href = URL.createObjectURL(blob); a.download = `unidesk-classes-${tag}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast.ok('Calendar file downloaded. Open it (tap the download notice) and choose Calendar to add your classes.');
  };

  const hasRows = kind === 'class' ? classes.length > 0 : exams.length > 0;
  const clashCount = kind === 'class' ? cClash.length : eClash.length;

  return (
    <main className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/guide" aria-label="Back to guide" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full print:hidden"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Timetable</h1>

      <div role="tablist" className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-brand-soft p-1 print:hidden">
        {(['class', 'exam'] as Kind[]).map(k => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={`h-11 rounded-xl text-[15px] font-bold ${kind === k ? 'bg-card text-brand-ink shadow-sm' : 'text-muted'}`}>{k === 'class' ? 'Classes' : 'Exams'}</button>
        ))}
      </div>

      {info && !available ? (
        <p className="mt-6 rounded-[18px] border-[1.5px] border-dashed border-edge bg-card p-6 text-center text-[15px] text-muted">The {kind === 'class' ? 'class' : 'exam'} timetable is not here yet. Check back soon.</p>
      ) : (
        <>
          {available && <p className="mt-3 text-[13px] text-muted print:hidden">{available.label}</p>}

          <label className="relative mt-3 block print:hidden">
            <span className="sr-only">Add a unit code</span>
            <input value={q} onChange={e => setQ(e.target.value)} autoCapitalize="characters" autoComplete="off" placeholder="Type a unit code, e.g. SBC101" className="h-[52px] w-full rounded-2xl border-[1.5px] border-edge bg-card px-4 text-[15px] uppercase placeholder:normal-case placeholder:text-muted" />
          </label>
          {sugg.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2 print:hidden">
              {sugg.map(c => <li key={c}><button type="button" onClick={() => add(c)} className="flex h-10 items-center gap-1 rounded-full border-[1.5px] border-brand bg-card px-3.5 text-[14px] font-bold text-brand-ink"><Plus size={16} aria-hidden />{c}</button></li>)}
            </ul>
          )}
          {q.trim().length >= 2 && sugg.length === 0 && <p className="mt-2 text-[13px] text-muted print:hidden">No unit starting with “{q.trim().toUpperCase()}”.</p>}

          {units.length > 0 && (
            <div className="mt-4 print:hidden">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[13px] font-bold text-muted">Your units ({units.length})</p>
                {units.length > 3 && <button type="button" onClick={() => setAllUnits(v => !v)} aria-expanded={allUnits} className="h-8 px-1 text-[13px] font-bold text-brand-ink">{allUnits ? 'Show less' : 'Show all'}</button>}
              </div>
              <ul className={allUnits ? 'flex flex-wrap gap-2' : 'flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'}>
                {units.map(c => (
                  <li key={c} className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-brand pl-3.5 pr-1 text-[14px] font-bold text-white">{c}
                    <button type="button" onClick={() => remove(c)} aria-label={`Remove ${c}`} className="flex h-8 w-8 items-center justify-center rounded-full"><X size={16} aria-hidden /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}
          <button type="button" disabled={!units.length || busy} onClick={() => generate(choices, true)} className="mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-50 print:hidden">
            {busy && <Loader2 size={20} className="animate-spin" aria-hidden />} Make my {kind === 'class' ? 'class' : 'exam'} timetable
          </button>

          {shown && (
            <section id="tt-results" className="print-area mt-6 scroll-mt-4" aria-live="polite">
              {shown.notFound.length > 0 && <p className="mb-3 rounded-xl bg-amber-soft px-3.5 py-2.5 text-sm font-medium text-amber-ink">Not found in this timetable: {shown.notFound.join(', ')}. Check the code.</p>}

              {clashCount > 0 && (
                <div className="mb-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
                  <p className="flex items-center gap-1.5 font-bold"><AlertTriangle size={16} aria-hidden /> {clashCount} clash{clashCount > 1 ? 'es' : ''}</p>
                  <ul className="mt-1">
                    {cClash.map((c, i) => <li key={i}>{c.day}: {c.a.code} and {c.b.code} overlap ({hr(c.a.startHour)}-{hr(c.a.endHour)} / {hr(c.b.startHour)}-{hr(c.b.endHour)})</li>)}
                    {eClash.map((c, i) => <li key={i}>{niceDate(c.date)}: {c.a.code} and {c.b.code} are at the same time</li>)}
                  </ul>
                </div>
              )}

              {cls?.ambiguous.map(a => (
                <div key={a.key} className="mb-3 rounded-xl border-[1.5px] border-line bg-card p-3.5 print:hidden">
                  <p className="text-sm font-bold">{a.code} has more than one {a.day} class. Which is yours?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {a.options.map(o => {
                      const on = (choices[a.key] ?? cls.resolved.find(r => r.code === a.code && r.day === a.day)?.id) === o.id;
                      return <button key={o.id} type="button" onClick={() => pick(a.key, o.id)} className={`h-10 rounded-full border-[1.5px] px-3.5 text-[14px] font-bold ${on ? 'border-brand bg-brand text-white' : 'border-edge bg-card'}`}>{hr(o.startHour)}-{hr(o.endHour)}{o.venue ? ` · ${o.venue}` : ''}</button>;
                    })}
                  </div>
                </div>
              ))}

              <div className="mb-4 flex gap-2 print:hidden">
                <button type="button" onClick={() => openEdit()} className="flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-brand bg-card px-4 text-[14px] font-bold text-brand-ink"><Plus size={16} aria-hidden /> Add {kind === 'class' ? 'a class' : 'an exam'}</button>
                {changed && <button type="button" onClick={resetEdits} className="flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-edge bg-card px-4 text-[14px] font-bold text-muted"><RotateCcw size={16} aria-hidden /> Undo my changes</button>}
              </div>

              {cls && classes.length > 0 && (
                <div className="mb-5 hidden md:block print:hidden">
                  <div className="overflow-x-auto rounded-2xl border-[1.5px] border-line bg-card p-2">
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
                                  <button key={r.id} type="button" onClick={() => openEdit(r)} aria-label={`Edit ${r.code}`} className="pastel absolute overflow-hidden rounded-lg border-2 px-2 py-1 text-left"
                                    style={{ left: `${((r.startHour - gridFrom) / gridCols) * 100}%`, width: `${((r.endHour - r.startHour) / gridCols) * 100}%`, top: lane * 58 + 3, height: 52, ['--p-bg' as string]: c.bg, ['--p-dbg' as string]: c.dbg, borderColor: c.border }}>
                                    <span className="block truncate text-[13px] font-extrabold leading-tight">{r.code}</span>
                                    <span className="block truncate text-[11px] font-semibold text-muted">{notes[noteKeyOf(r)] ? '📝 ' : ''}{r.elearning ? 'Online' : r.venue ?? 'Venue not listed'}</span>
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
                    {[...new Set(classes.map(catOf))].map(k => <li key={k} className="flex items-center gap-1.5"><span className="pastel h-3 w-3 rounded border-2" style={{ ['--p-bg' as string]: CAT[k].bg, ['--p-dbg' as string]: CAT[k].dbg, borderColor: CAT[k].border }} />{CAT[k].label}</li>)}
                    {cClash.length > 0 && <li className="flex items-center gap-1.5"><span className="pastel h-3 w-3 rounded border-2" style={{ ['--p-bg' as string]: CLASH.bg, ['--p-dbg' as string]: CLASH.dbg, borderColor: CLASH.border }} />Clash</li>}
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
                          <li key={r.id} className="flex items-center gap-2 rounded-[16px] border-[1.5px] bg-card py-2 pl-4 pr-1" style={{ borderColor: c.border, borderLeftWidth: 6 }}>
                            <span className="w-[74px] shrink-0 text-[13px] font-bold text-brand-ink">{hr(r.startHour)}-{hr(r.endHour)}</span>
                            <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{r.code}</span><span className="block text-[13px] text-muted">{r.elearning ? 'E-learning (online)' : r.venue ? <Link href={`/guide/venues?q=${encodeURIComponent(r.venue)}`} className="font-semibold text-brand-ink underline print:no-underline">{r.venue}</Link> : 'Venue not listed'}</span>{notes[noteKeyOf(r)] && <span className="mt-0.5 flex items-start gap-1 text-[13px] font-medium text-ink"><StickyNote size={13} className="mt-[3px] shrink-0 text-muted" aria-hidden /><span className="min-w-0 break-words">{notes[noteKeyOf(r)]}</span></span>}</span>
                            {rowButtons(r.id, r)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              {cls && classes.length > 0 && (
                <div className="mb-4 mt-2 rounded-2xl border-[1.5px] border-line bg-card p-3.5 print:hidden">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink"><Bell size={19} aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold">Class reminders</span>
                      <span className="block text-[13px] text-muted">{push.on ? `We notify you ${remind.mins === 1 ? '1 minute' : `${remind.mins} minutes`} before each class.` : 'Get a notification before each class.'}</span>
                      <button type="button" onClick={() => setRemOpen(v => !v)} aria-expanded={remOpen} className="mt-0.5 h-8 text-[13px] font-bold text-brand-ink">{remOpen ? 'Hide options' : 'Options'}</button>
                    </span>
                    {user && push.supported && push.publicKey && (
                      <button type="button" role="switch" aria-checked={push.on} aria-label="Class reminders" disabled={push.busy} onClick={() => (push.on ? turnOffPush() : turnOnPush())} className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors disabled:opacity-60 ${push.on ? 'bg-brand' : 'bg-edge'}`}><span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${push.on ? 'left-[24px]' : 'left-1'}`} /></button>
                    )}
                  </div>

                  {!user && <p className="mt-3 rounded-xl bg-brand-soft px-3.5 py-2.5 text-[13px] font-medium text-brand-ink">Log in to get reminders. <Link href="/login" className="font-bold underline">Log in</Link></p>}
                  {user && push.ready && push.needsInstall && <p className="mt-3 rounded-xl bg-amber-soft px-3.5 py-2.5 text-[13px] font-medium text-amber-ink">On iPhone, first add UniDesk to your Home Screen: tap Share, then Add to Home Screen. Open UniDesk from there and turn reminders on.</p>}
                  {user && push.ready && !push.supported && !push.needsInstall && <p className="mt-3 rounded-xl bg-amber-soft px-3.5 py-2.5 text-[13px] font-medium text-amber-ink">This browser cannot show reminders. Use Chrome on Android, or add your classes to your calendar below.</p>}
                  {user && push.ready && push.supported && !push.publicKey && <p className="mt-3 rounded-xl bg-brand-soft px-3.5 py-2.5 text-[13px] font-medium text-brand-ink">Notification reminders are coming soon. You can add your classes to your calendar below.</p>}
                  {remOpen && <>
                  {user && push.on && <button type="button" onClick={sendTest} className="mt-3 h-10 rounded-full border-[1.5px] border-edge bg-card px-4 text-[14px] font-bold">Send me a test notification</button>}

                  <div className="mt-3">
                    <p className="mb-1.5 text-[13px] font-bold text-muted">Remind me before class</p>
                    <div className="flex flex-wrap gap-2">
                      {REMIND_CHOICES.map(m => <button key={m} type="button" onClick={() => setRemind(r => ({ ...r, mins: m, custom: false }))} className={`h-10 rounded-full border-[1.5px] px-3.5 text-[14px] font-bold ${!remind.custom && remind.mins === m ? 'border-brand bg-brand text-white' : 'border-edge bg-card'}`}>{m === 60 ? '1 hour' : `${m} min`}</button>)}
                      <button type="button" onClick={() => setRemind(r => ({ ...r, custom: true }))} className={`h-10 rounded-full border-[1.5px] px-3.5 text-[14px] font-bold ${remind.custom ? 'border-brand bg-brand text-white' : 'border-edge bg-card'}`}>Custom</button>
                    </div>
                    {remind.custom && (
                      <label className="mt-2 flex items-center gap-2 text-[14px] font-semibold">
                        <input className="h-11 w-24 rounded-xl border-[1.5px] border-edge bg-card px-3 text-center text-[15px]" inputMode="numeric" aria-label="Minutes before class" value={customText} onChange={e => { const t = e.target.value.replace(/\D/g, '').slice(0, 4); setCustomText(t); const n = Number(t); if (n >= 1 && n <= 1440) setRemind(r => ({ ...r, mins: n })); }} onBlur={() => setCustomText(String(remind.mins))} />
                        minutes before class (1 to 1440)
                      </label>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="mb-1.5 text-[13px] font-bold text-muted">Keep reminding me for</p>
                    <div className="flex flex-wrap gap-2">
                      {WEEK_CHOICES.map(w => <button key={w} type="button" onClick={() => setRemind(r => ({ ...r, weeks: w }))} className={`h-10 rounded-full border-[1.5px] px-3.5 text-[14px] font-bold ${remind.weeks === w ? 'border-brand bg-brand text-white' : 'border-edge bg-card'}`}>{w} weeks</button>)}
                    </div>
                  </div>
                  <p className="mt-2 text-[12px] text-muted">Tap a class to write a note. It shows in the reminder.</p>

                  <details className="mt-3 border-t border-line pt-3">
                    <summary className="cursor-pointer text-[14px] font-bold text-brand-ink">More ways: add to your calendar</summary>
                    <p className="mt-2 text-[13px] text-muted">Downloads a calendar file. Open it and your phone's calendar adds your classes, with a reminder, even offline. If you change the timetable, add it again.</p>
                    <button type="button" onClick={downloadCalendar} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-brand bg-card text-[14px] font-bold text-brand-ink"><CalendarPlus size={18} aria-hidden /> Add to my calendar</button>
                  </details>
                  </>}
                </div>
              )}

              {dates.map(d => (
                <div key={d} className="mb-4">
                  <h2 className="mb-2 text-[15px] font-extrabold">{niceDate(d)}</h2>
                  <ul className="flex flex-col gap-2">
                    {exams.filter(r => r.date === d).map(r => (
                      <li key={r.id} className="flex items-center gap-2 rounded-[16px] border-[1.5px] bg-card py-2 pl-4 pr-1" style={{ borderColor: clashIds.has(r.id) ? CLASH.border : 'rgb(var(--c-line))', borderLeftWidth: 6 }}>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold text-brand-ink">{r.slot}</span>
                          <span className="block text-[15px] font-bold">{r.code}</span>
                          <span className="block text-[13px] text-muted">{r.venues.length ? r.venues.join(', ') : 'Venue not listed'}</span>
                        </span>
                        {rowButtons(r.id, r)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {!hasRows && <p className="mb-3 rounded-xl border-[1.5px] border-dashed border-edge bg-card p-5 text-center text-[14px] text-muted">Nothing here. Use Add to put a {kind === 'class' ? 'class' : 'exam'} back, or Undo my changes.</p>}
              {hasRows && (
                <>
                  <div className="h-20 md:hidden print:hidden" aria-hidden />
                  <div className={`fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom)+8px)] z-30 px-4 transition-all duration-200 md:static md:translate-y-0 md:px-0 md:opacity-100 print:hidden ${barOn ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}>
                    <div className="mx-auto flex max-w-[560px] gap-2 md:max-w-none">
                      <button type="button" onClick={() => window.print()} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-edge bg-card text-[14px] font-bold shadow-[0_8px_24px_rgba(0,0,0,0.32),0_0_0_1px_rgba(0,0,0,0.08)] md:shadow-none"><Printer size={18} aria-hidden /> Save PDF</button>
                      <button type="button" onClick={() => setExporting(true)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand text-[14px] font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.32),0_0_0_1px_rgba(0,0,0,0.08)] md:shadow-none"><ImageIcon size={18} aria-hidden /> Save as image</button>
                    </div>
                  </div>
                </>
              )}
              <p className="mt-3 text-[12px] text-muted">Made from the published sheet{changed ? ' with your changes' : ''}. Always confirm on the official notice.</p>
            </section>
          )}
        </>
      )}

      {ask && (
        <Modal title={ask.title} onClose={() => setAsk(null)}>
          <p className="text-[15px] text-muted">{ask.body}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setAsk(null)} className="h-12 rounded-2xl border-[1.5px] border-edge bg-card text-[15px] font-bold">Keep it</button>
            <button type="button" onClick={() => { const run = ask.run; setAsk(null); run(); }} className="h-12 rounded-2xl bg-danger text-[15px] font-bold text-white">{ask.label}</button>
          </div>
        </Modal>
      )}
      {draft && <EditDialog kind={kind} draft={draft} setDraft={setDraft} onSave={saveDraft} />}
      {exporting && <ExportDialog days={exportDays} kind={kind} onClose={() => setExporting(false)} />}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0"><span className="mb-1 block text-[13px] font-bold text-muted">{label}</span>{children}</label>;
}
const inputCls = 'h-12 w-full rounded-xl border-[1.5px] border-edge bg-card px-3 text-[15px]';

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center print:hidden" role="dialog" aria-modal="true" aria-label={title} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`max-h-[92vh] w-full min-w-0 overflow-x-hidden overflow-y-auto rounded-t-3xl bg-card p-5 pb-[calc(20px+env(safe-area-inset-bottom))] sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'}`}>
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
            <Field label="Note (optional)"><textarea className={`${inputCls} !h-auto min-h-[76px] py-3`} value={draft.note} maxLength={200} onChange={e => set({ note: e.target.value })} placeholder="e.g. Bring calculator. CAT today." /></Field>
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
  const chip = (on: boolean) => `h-10 rounded-full border-[1.5px] px-3.5 text-[14px] font-bold ${on ? 'border-brand bg-brand text-white' : 'border-edge bg-card'}`;
  const [pane, setPane] = useState<'size' | 'design' | 'text'>('size');

  return (
    <Modal title="Save as image" onClose={onClose} wide>
      <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div role="tablist" className="grid grid-cols-3 gap-1 rounded-2xl bg-brand-soft p-1">
            {([['size', 'Size'], ['design', 'Design'], ['text', 'Text']] as const).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={pane === k} onClick={() => setPane(k)} className={`h-11 rounded-xl text-[15px] font-bold ${pane === k ? 'bg-card text-brand-ink shadow-sm' : 'text-muted'}`}>{label}</button>
            ))}
          </div>
          {pane === 'size' ? (
            <div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>button]:shrink-0 [&>button]:whitespace-nowrap">
                {SIZE_PRESETS.map(p => <button key={p.id} type="button" className={chip(preset === p.id)} onClick={() => { setPreset(p.id); setW(String(p.width)); setH(String(p.height)); }}>{p.label}</button>)}
                <button type="button" className={chip(preset === 'custom')} onClick={() => setPreset('custom')}>Custom</button>
              </div>
              <div className="mt-3 grid min-w-0 grid-cols-2 gap-3">
                <Field label="Width (px)"><input className={inputCls} inputMode="numeric" value={w} onChange={e => { setW(e.target.value.replace(/\D/g, '')); setPreset('custom'); }} /></Field>
                <Field label="Height (px)"><input className={inputCls} inputMode="numeric" value={h} onChange={e => { setH(e.target.value.replace(/\D/g, '')); setPreset('custom'); }} /></Field>
              </div>
              <p className="mt-1 text-[12px] text-muted">{width} × {height}. Allowed {MIN_SIDE} to {MAX_SIDE}.</p>
            </div>
          ) : pane === 'design' ? (
            <div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>button]:shrink-0 [&>button]:whitespace-nowrap">{DESIGNS.filter(d => kind === 'class' || d.id !== 'grid').map(d => <button key={d.id} type="button" className={chip(design === d.id)} onClick={() => setDesign(d.id)}>{d.label}</button>)}</div>
              <p className="mt-2 text-[12px] text-muted">{DESIGNS.find(d => d.id === design)?.note}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
          <Field label="Title"><input className={inputCls} value={text.title} maxLength={40} onChange={e => setText({ ...text, title: e.target.value })} /></Field>
          <Field label="Subtitle"><input className={inputCls} value={text.subtitle} maxLength={50} onChange={e => setText({ ...text, subtitle: e.target.value })} /></Field>
          <Field label="Footer line"><input className={inputCls} value={text.footer} maxLength={70} onChange={e => setText({ ...text, footer: e.target.value })} /></Field>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-h-[200px] min-w-0 items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-line bg-brand-soft p-2">
            {url ? <img src={url} alt="Preview of your timetable image" className="h-auto max-h-[60vh] w-auto max-w-full rounded-lg object-contain" /> : <Loader2 className="animate-spin text-muted" aria-hidden />}
          </div>
          {err && <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{err}</p>}
          <button type="button" onClick={download} disabled={busy || !url} className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-50"><Download size={18} aria-hidden /> Download PNG</button>
        </div>
      </div>
    </Modal>
  );
}
