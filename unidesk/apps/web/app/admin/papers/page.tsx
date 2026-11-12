'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, FileUp, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { guessUnitCode, makePages, makePreview } from '@/lib/pdfPreview';

const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink placeholder:text-[#6B7794]';
const thisYear = new Date().getFullYear();

export default function UploadPaper() {
  const ok = useRequireAdmin();
  const [file, setFile] = useState<File | null>(null);
  const [unitCode, setUnitCode] = useState('');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState(String(thisYear));
  const [sitting, setSitting] = useState('');
  const [school, setSchool] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  if (!ok) return null;

  const pick = (f: File | null) => {
    setFile(f);
    setDone('');
    if (f) {
      if (!unitCode) setUnitCode(guessUnitCode(f.name));
      if (!title) setTitle(f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim());
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');
    setDone('');
    try {
      const form = new FormData();
      form.append('file', file);
      const preview = await makePreview(file); // null if it cannot be made; the paper still uploads
      if (preview) form.append('preview', preview, 'preview.jpg');
      const pages = await makePages(file); // every page as an image, so students can read it in the app
      pages.forEach((b, i) => form.append('pages', b, `${i + 1}.jpg`));
      form.append('unitCode', unitCode);
      form.append('title', title);
      form.append('year', year);
      if (sitting) form.append('sitting', sitting);
      if (school) form.append('school', school);
      await api('/admin/papers', 'POST', form);
      setDone(`${unitCode.toUpperCase()} ${year} uploaded with ${pages.length} readable page${pages.length === 1 ? '' : 's'}${pages.length ? '' : ' (pages could not be made, so students only see the first-page preview)'}.`);
      // Keep the year, sitting and school for the next upload; clear the rest.
      setFile(null);
      setUnitCode('');
      setTitle('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/admin" aria-label="Back to admin" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <div className="mt-2 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Upload a paper</h1>
        <Link href="/admin/papers/manage" className="inline-flex h-10 items-center rounded-xl border-[1.5px] border-edge bg-white px-4 text-[13px] font-bold">Manage papers</Link>
      </div>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-3.5">
        <label className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-edge bg-white p-4 text-center">
          <FileUp size={26} className="text-brand" aria-hidden />
          <span className="text-[15px] font-bold">{file ? file.name : 'Choose the PDF'}</span>
          <span className="text-xs text-muted">PDF, up to 20 MB</span>
          <input type="file" accept="application/pdf" className="sr-only" onChange={e => pick(e.target.files?.[0] ?? null)} />
        </label>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="unit" className="text-[13px] font-bold">Unit code</label>
          <input id="unit" value={unitCode} onChange={e => setUnitCode(e.target.value)} placeholder="ICS2201" autoCapitalize="characters" required className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-[13px] font-bold">Title</label>
          <input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Introduction to Programming" required className={field} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="year" className="text-[13px] font-bold">Year</label>
            <input id="year" type="number" inputMode="numeric" min={1990} max={2100} value={year} onChange={e => setYear(e.target.value)} required className={field} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sitting" className="text-[13px] font-bold">Sitting <span className="font-medium text-muted">(optional)</span></label>
            <input id="sitting" value={sitting} onChange={e => setSitting(e.target.value)} placeholder="End of semester" className={field} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="school" className="text-[13px] font-bold">School <span className="font-medium text-muted">(optional)</span></label>
          <input id="school" value={school} onChange={e => setSchool(e.target.value)} placeholder="School of Computing" className={field} />
        </div>

        {error && <p role="alert" className="rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
        {done && <p role="status" className="flex items-center gap-2 rounded-xl bg-[#E7F6EC] px-3.5 py-2.5 text-sm font-medium text-[#14532D]"><Check size={18} aria-hidden /> {done}</p>}

        <button type="submit" disabled={busy || !file} className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-60">
          {busy && <Loader2 size={20} className="animate-spin" aria-hidden />}
          Upload paper
        </button>
        <p className="text-center text-[13px] text-muted">If students asked for this unit, their requests are marked as done automatically.</p>
      </form>
    </main>
  );
}
