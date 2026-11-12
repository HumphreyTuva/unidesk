'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, FileUp, Loader2, Pencil, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { makePages, makePreview } from '@/lib/pdfPreview';

type Row = { id: string; unitCode: string; title: string; year: number; sitting: string | null; school: string | null; published: boolean; pageCount: number; downloads: number; hasPreview: boolean };

const field = 'h-12 w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-3.5 text-[15px] text-ink placeholder:text-[#6B7794]';
const btn = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-edge bg-white px-3 text-[13px] font-bold text-ink disabled:opacity-50';

export default function ManagePapers() {
  const ok = useRequireAdmin();
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ unitCode: '', title: '', year: '', sitting: '', school: '' });
  const pickFor = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<Row[]>(`/admin/papers${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`).then(setRows).catch(e => toast.error(e.message));
  }, [q, toast]);
  useEffect(() => { if (!ok) return; const t = setTimeout(load, 250); return () => clearTimeout(t); }, [ok, load]);

  if (!ok) return null;

  const startEdit = (r: Row) => {
    setConfirming(null);
    setEditing(r.id);
    setForm({ unitCode: r.unitCode, title: r.title, year: String(r.year), sitting: r.sitting ?? '', school: r.school ?? '' });
  };

  const save = async (id: string) => {
    setBusy(id);
    try {
      await api(`/admin/papers/${id}`, 'PUT', { unitCode: form.unitCode, title: form.title, year: Number(form.year), sitting: form.sitting, school: form.school });
      toast.ok('Saved');
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const toggle = async (r: Row) => {
    setBusy(r.id);
    try {
      await api(`/admin/papers/${r.id}`, 'PUT', { published: !r.published });
      toast.ok(r.published ? 'Hidden from students' : 'Visible to students again');
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const remove = async (r: Row) => {
    setBusy(r.id);
    try {
      await api(`/admin/papers/${r.id}`, 'DELETE');
      toast.ok(`${r.unitCode} ${r.year} deleted`);
      setConfirming(null);
      load();
    } catch (e: any) { toast.error(e.message); setConfirming(null); } finally { setBusy(null); }
  };

  const replace = async (id: string, file: File) => {
    setBusy(id);
    try {
      const form = new FormData();
      form.append('file', file);
      const preview = await makePreview(file);
      if (preview) form.append('preview', preview, 'preview.jpg');
      const pages = await makePages(file);
      pages.forEach((b, i) => form.append('pages', b, `${i + 1}.jpg`));
      await api(`/admin/papers/${id}/files`, 'POST', form);
      toast.ok(pages.length ? `Replaced, ${pages.length} readable page${pages.length === 1 ? '' : 's'}` : 'PDF replaced (pages could not be made)');
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-10">
      <Link href="/admin" aria-label="Back to admin" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <div className="mt-2 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Manage papers</h1>
        <Link href="/admin/papers" className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-[13px] font-bold text-white">Upload new</Link>
      </div>

      <div className="relative mt-4">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a unit code or title" aria-label="Search papers" className={`${field} pl-10`} />
      </div>

      <input ref={fileInput} type="file" accept="application/pdf" className="sr-only" onChange={e => {
        const f = e.target.files?.[0];
        const id = pickFor.current;
        e.target.value = '';
        if (f && id) replace(id, f);
      }} />

      {!rows ? (
        <div className="flex justify-center pt-16 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>
      ) : rows.length === 0 ? (
        <p className="mt-10 text-center text-muted">{q.trim() ? 'No paper matches that.' : 'No papers yet. Upload the first one.'}</p>
      ) : (
        <ul className="cols-lg mt-4 flex flex-col gap-3">
          {rows.map(r => (
            <li key={r.id} className={`rounded-[18px] border-[1.5px] bg-white p-4 ${r.published ? 'border-line' : 'border-dashed border-edge opacity-90'}`}>
              {editing === r.id ? (
                <div className="flex flex-col gap-2.5">
                  <input value={form.unitCode} onChange={e => setForm({ ...form, unitCode: e.target.value })} placeholder="Unit code" aria-label="Unit code" autoCapitalize="characters" className={field} />
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" aria-label="Title" className={field} />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} type="number" inputMode="numeric" placeholder="Year" aria-label="Year" className={field} />
                    <input value={form.sitting} onChange={e => setForm({ ...form, sitting: e.target.value })} placeholder="Sitting" aria-label="Sitting" className={field} />
                  </div>
                  <input value={form.school} onChange={e => setForm({ ...form, school: e.target.value })} placeholder="School" aria-label="School" className={field} />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => save(r.id)} disabled={busy === r.id} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand text-[14px] font-bold text-white disabled:opacity-60">{busy === r.id && <Loader2 size={16} className="animate-spin" aria-hidden />} Save</button>
                    <button type="button" onClick={() => setEditing(null)} className="h-11 rounded-xl border-[1.5px] border-edge px-5 text-[14px] font-bold">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-extrabold">{r.unitCode} <span className="font-medium text-muted">· {r.year}</span></p>
                      <p className="truncate text-[14px] text-muted">{r.title}</p>
                      <p className="mt-0.5 text-[12px] text-muted">{[r.sitting, r.school].filter(Boolean).join(' · ') || 'No sitting or school'}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {!r.published && <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-[11px] font-bold text-amber-ink">Hidden</span>}
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${r.pageCount ? 'bg-[#E7F6EC] text-[#14532D]' : 'bg-[#FDECEC] text-[#9B1C1C]'}`}>{r.pageCount ? `${r.pageCount} page${r.pageCount === 1 ? '' : 's'}` : 'No pages'}</span>
                      <span className="text-[11px] text-muted">{r.downloads} download{r.downloads === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  {confirming === r.id ? (
                    <div className="mt-3 rounded-xl bg-[#FDECEC] p-3">
                      <p className="text-[13px] font-semibold text-[#9B1C1C]">Delete {r.unitCode} {r.year} for good? The PDF and its pages are removed and this cannot be undone.</p>
                      <div className="mt-2.5 flex gap-2">
                        <button type="button" onClick={() => remove(r)} disabled={busy === r.id} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#B42318] text-[13px] font-bold text-white disabled:opacity-60">{busy === r.id && <Loader2 size={16} className="animate-spin" aria-hidden />} Yes, delete</button>
                        <button type="button" onClick={() => setConfirming(null)} className="h-10 rounded-xl border-[1.5px] border-edge bg-white px-4 text-[13px] font-bold">Keep it</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEdit(r)} disabled={busy === r.id} className={btn}><Pencil size={15} aria-hidden /> Edit</button>
                      <button type="button" onClick={() => toggle(r)} disabled={busy === r.id} className={btn}>{r.published ? <><EyeOff size={15} aria-hidden /> Hide</> : <><Eye size={15} aria-hidden /> Show</>}</button>
                      <button type="button" onClick={() => { pickFor.current = r.id; fileInput.current?.click(); }} disabled={busy === r.id} className={btn}>
                        {busy === r.id ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <FileUp size={15} aria-hidden />} Replace PDF
                      </button>
                      <button type="button" onClick={() => { setEditing(null); setConfirming(r.id); }} disabled={busy === r.id} className={`${btn} text-[#B42318]`}><Trash2 size={15} aria-hidden /> Delete</button>
                    </div>
                  )}
                  <Link href={`/papers/${r.id}`} className="mt-2.5 inline-block text-[12px] font-semibold text-brand">Open as a student sees it</Link>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-center text-[12px] text-muted">&ldquo;Replace PDF&rdquo; also rebuilds the readable pages. Use it on papers uploaded before the sharper, cropped reader.</p>
    </main>
  );
}
