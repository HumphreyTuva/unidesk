'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import PaymentSheet from '@/components/PaymentSheet';

type Paper = { id: string; unitCode: string; title: string; year: number; sitting: string | null; school: string | null; hasPreview: boolean; pageCount: number };

export default function PaperPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [missing, setMissing] = useState(false);
  const [previewOk, setPreviewOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  // Set only when the server answers 402. Until then nothing on this page mentions payment.
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    api<Paper>(`/papers/${id}`).then(setPaper).catch(() => setMissing(true));
  }, [id]);

  const download = async () => {
    setMessage('');
    if (!user) { router.push(`/login?next=/papers/${id}`); return; }
    setBusy(true);
    try {
      // Ask first, so a refusal shows a friendly message instead of a raw error page.
      await api(`/papers/${id}/access`);
      window.location.href = `/api/v1/papers/${id}/download`;
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 402) {
        // Only reached once the admin has switched payments on and this student has not unlocked the paper.
        setPrice(Number(err.data?.amount) || 0);
      } else if (err.status === 401) {
        router.push(`/login?next=/papers/${id}`);
      } else {
        setMessage(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  if (missing) {
    return (
      <main className="px-5 pt-10 text-center">
        <h1 className="text-xl font-extrabold">Paper not found</h1>
        <Link href="/papers" className="mt-5 inline-flex h-12 items-center rounded-2xl bg-brand px-6 font-bold text-white">Back to papers</Link>
      </main>
    );
  }
  if (!paper) return <div className="flex justify-center pt-24 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>;

  return (
    <main className="px-5 pt-[calc(16px+env(safe-area-inset-top))]">
      <Link href="/papers" aria-label="Back to papers" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-ink"><ArrowLeft size={24} aria-hidden /></Link>

      <h1 className="mt-2 text-2xl font-extrabold">{paper.unitCode} <span className="font-medium text-muted">· {paper.year}</span></h1>
      <p className="mt-1 text-[15px] text-muted">{paper.title}</p>
      <p className="mt-1 text-[13px] text-muted">{[paper.sitting, paper.school].filter(Boolean).join(' · ')}</p>

      {paper.pageCount > 0 ? (
        // The whole paper, page by page. These are images; the PDF itself is only handed out by Download below.
        <div className="mt-5 flex flex-col gap-3" onContextMenu={e => e.preventDefault()}>
          {Array.from({ length: paper.pageCount }, (_, i) => (
            <figure key={i} className="overflow-hidden rounded-[18px] border-[1.5px] border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/v1/papers/${paper.id}/pages/${i + 1}`} alt={`${paper.unitCode} ${paper.year}, page ${i + 1} of ${paper.pageCount}`} loading={i < 2 ? 'eager' : 'lazy'} draggable={false} className="w-full select-none" />
              <figcaption className="border-t border-line px-3 py-1.5 text-center text-[12px] text-muted">Page {i + 1} of {paper.pageCount}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
      <div className="mt-5 overflow-hidden rounded-[22px] border-[1.5px] border-line bg-white">
        {paper.hasPreview && previewOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/v1/papers/${paper.id}/preview`} alt={`First page of ${paper.unitCode} ${paper.year}`} className="w-full" onError={() => setPreviewOk(false)} />
        ) : (
          <div className="flex h-56 flex-col items-center justify-center gap-2 text-muted">
            <FileText size={40} aria-hidden />
            <span className="text-sm">No preview for this paper</span>
          </div>
        )}
      </div>
      )}

      {message && <p role="alert" className="mt-4 rounded-xl bg-amber-soft px-3.5 py-3 text-sm font-medium text-amber-ink">{message}</p>}

      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-70"
      >
        {busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Download size={20} aria-hidden />}
        Download PDF
      </button>

      {price !== null && (
        <PaymentSheet
          open
          paperId={paper.id}
          label={`${paper.unitCode} ${paper.year}`}
          amount={price}
          onClose={() => setPrice(null)}
          onPaid={() => { window.location.href = `/api/v1/papers/${paper.id}/download`; }}
        />
      )}
    </main>
  );
}
