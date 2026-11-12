'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useToast } from '@/lib/toast';

type Report = { sessions: number; units: number; programmes?: number; examDays?: number; firstDate?: string; lastDate?: string; noVenue?: number; headings: string[]; warnings: string[]; unreadable: { row: number; text: string; count: number }[] };
type Source = { id: string; kind: 'CLASS' | 'EXAM'; label: string; published: boolean; active: boolean; parseReport: Report | null; createdAt: string };
const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink placeholder:text-[#6B7794]';

export default function AdminTimetables() {
  const ok = useRequireAdmin();
  const toast = useToast();
  const [list, setList] = useState<Source[] | null>(null);
  const [kind, setKind] = useState<'class' | 'exam'>('class');
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => { api<Source[]>('/admin/timetables').then(setList).catch(e => setError(e.message)); }, []);
  useEffect(() => { if (ok) load(); }, [ok, load]);
  if (!ok) return null;

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setError('');
    try {
      const f = new FormData(); f.append('kind', kind); f.append('label', label); f.append('file', file);
      await api('/admin/timetables', 'POST', f);
      toast.ok('Uploaded. Check the report, then publish.'); setLabel(''); setFile(null); (document.getElementById('tf') as HTMLInputElement).value = ''; load();
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  const act = async (path: string, method = 'POST', confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;
    setError('');
    try { await api(path, method); toast.ok(path.endsWith('/publish') ? 'Published: students can see it now' : path.endsWith('/unpublish') ? 'Hidden from students' : 'Deleted'); load(); } catch (err: any) { setError(err.message); }
  };

  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/admin" aria-label="Back to admin" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Timetables</h1>
      <p className="mt-1 text-sm text-muted">Upload the sheet saved from Google Sheets as “Web page (.html)”. Check the report, then publish. Students only see the published one.</p>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}

      <form onSubmit={upload} className="mt-5 flex flex-col gap-3.5 rounded-[20px] border-[1.5px] border-line bg-white p-4">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-brand-soft p-1">
          {(['class', 'exam'] as const).map(k => <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`h-11 rounded-xl text-[15px] font-bold ${kind === k ? 'bg-white text-brand shadow-sm' : 'text-muted'}`}>{k === 'class' ? 'Class' : 'Exam'}</button>)}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tl" className="text-[13px] font-bold">Name</label>
          <input id="tl" value={label} onChange={e => setLabel(e.target.value)} placeholder="Semester 1, 2026/2027" required maxLength={80} className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tf" className="text-[13px] font-bold">File (.html)</label>
          <input id="tf" type="file" accept=".html,.htm,text/html" required onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </div>
        <button type="submit" disabled={busy || !file} className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-60">
          {busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Upload size={20} aria-hidden />} Upload and check
        </button>
      </form>

      {!list && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
      <ul className="cols-lg mt-6 flex flex-col gap-3">
        {list?.map(s => {
          const r = s.parseReport;
          return (
            <li key={s.id} className="rounded-[18px] border-[1.5px] border-line bg-white p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold">{s.label}</p>
                  <p className="text-[13px] text-muted">{s.kind === 'CLASS' ? 'Class' : 'Exam'} · {new Date(s.createdAt).toLocaleDateString('en-GB')}</p>
                </div>
                {s.active && <span className="flex items-center gap-1 rounded-full bg-[#E3F6EA] px-2.5 py-1 text-[12px] font-bold text-[#116B35]"><Check size={14} aria-hidden /> Live</span>}
              </div>
              {r && (
                <div className="mt-2 text-[13px] text-ink">
                  <p>{r.sessions} {s.kind === 'CLASS' ? 'classes' : 'exams'} · {r.units} units{r.programmes ? ` · ${r.programmes} programmes` : ''}{r.examDays ? ` · ${r.examDays} days (${r.firstDate} to ${r.lastDate})` : ''}</p>
                  {r.headings.length > 0 && <p className="text-muted">{r.headings.join(' · ')}</p>}
                  {r.warnings.map(w => <p key={w} className="mt-1 font-bold text-[#9B1C1C]">{w}</p>)}
                  {r.unreadable.length > 0 && (
                    <details className="mt-1"><summary className="cursor-pointer font-bold">{r.unreadable.length} cells were not read</summary>
                      <ul className="mt-1 text-muted">{r.unreadable.map(u => <li key={u.text}>Row {u.row}: “{u.text}”{u.count > 1 ? ` ×${u.count}` : ''}</li>)}</ul>
                    </details>
                  )}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {s.active
                  ? <button type="button" onClick={() => act(`/admin/timetables/${s.id}/unpublish`, 'POST', 'Hide this from students?')} className="h-11 flex-1 rounded-xl border-[1.5px] border-edge font-bold">Unpublish</button>
                  : <button type="button" onClick={() => act(`/admin/timetables/${s.id}/publish`, 'POST', `Show “${s.label}” to students? It replaces the live ${s.kind === 'CLASS' ? 'class' : 'exam'} timetable.`)} className="h-11 flex-1 rounded-xl bg-brand font-bold text-white">Publish</button>}
                {!s.active && <button type="button" onClick={() => act(`/admin/timetables/${s.id}`, 'DELETE', `Delete “${s.label}”?`)} aria-label={`Delete ${s.label}`} className="flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] border-edge text-muted"><Trash2 size={18} aria-hidden /></button>}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
