'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, FileText, Loader2, X, ZoomIn } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import PaymentSheet from '@/components/PaymentSheet';

type Paper = { id: string; unitCode: string; title: string; year: number; sitting: string | null; school: string | null; hasPreview: boolean; pageCount: number; readablePages: number };

// Full-screen zoom: the page at about twice the width, scrolled by finger or mouse. Opens on tap, so small print is readable.
type ZoomAt = { n: number; fx: number; fy: number }; // page, and where on it (0..1) the reader tapped
function Zoom({ paper, start, onClose }: { paper: Paper; start: ZoomAt; onClose: () => void }) {
  const [n, setN] = useState(start.n);
  const box = useRef<HTMLDivElement>(null);
  const focus = useRef({ fx: start.fx, fy: start.fy }); // only the first page opens on the tapped spot; later pages start at the top
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setN(v => Math.min(paper.readablePages, v + 1));
      if (e.key === 'ArrowLeft') setN(v => Math.max(1, v - 1));
    };
    window.addEventListener('keydown', key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  }, [paper.readablePages, onClose]);
  // Scroll so the tapped spot sits in the middle of the screen.
  const settle = () => {
    const b = box.current;
    if (!b) return;
    const { fx, fy } = focus.current;
    b.scrollLeft = Math.max(0, fx * b.scrollWidth - b.clientWidth / 2);
    b.scrollTop = Math.max(0, fy * b.scrollHeight - b.clientHeight / 2);
    focus.current = { fx: 0.5, fy: 0 };
  };
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label={`${paper.unitCode} page ${n}`}>
      <div className="flex h-14 shrink-0 items-center justify-between px-3 pt-[env(safe-area-inset-top)] text-white">
        <span className="px-2 text-[14px] font-semibold">{paper.unitCode} · Page {n} of {paper.pageCount}<span className="ml-2 hidden text-[12px] font-medium text-white/70 sm:inline">Tap the page to zoom out</span></span>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15"><X size={22} aria-hidden /></button>
      </div>
      <div ref={box} className="min-h-0 flex-1 overflow-auto bg-white" onContextMenu={e => e.preventDefault()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={n} src={`/api/v1/papers/${paper.id}/pages/${n}`} alt={`Page ${n}. Tap to zoom out`} onLoad={settle} onClick={onClose} draggable={false} style={{ width: 'max(200%, 900px)', maxWidth: 'none' }} className="block cursor-zoom-out select-none" />
      </div>
      <div className="flex shrink-0 items-center justify-center gap-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 text-white">
        <button type="button" onClick={() => setN(v => Math.max(1, v - 1))} disabled={n <= 1} aria-label="Previous page" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 disabled:opacity-30"><ChevronLeft size={22} aria-hidden /></button>
        <span className="min-w-[72px] text-center text-[14px] font-semibold">{n} / {paper.readablePages}</span>
        <button type="button" onClick={() => setN(v => Math.min(paper.readablePages, v + 1))} disabled={n >= paper.readablePages} aria-label="Next page" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 disabled:opacity-30"><ChevronRight size={22} aria-hidden /></button>
      </div>
    </div>
  );
}

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
  const [zoom, setZoom] = useState<ZoomAt | null>(null);

  const load = () => api<Paper>(`/papers/${id}`).then(setPaper).catch(() => setMissing(true));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async () => {
    setMessage('');
    if (!user) { router.push(`/login?next=/papers/${id}`); return; }
    setBusy(true);
    try {
      // Ask first, so a refusal shows a friendly message instead of a raw error page.
      await api(`/papers/${id}/access`);
      window.location.href = `/api/v1/papers/${id}/download`;
      setTimeout(load, 2000); // downloading unlocks the whole paper, so show the rest
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
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))]">
      <Link href="/papers" aria-label="Back to papers" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-ink"><ArrowLeft size={24} aria-hidden /></Link>

      <h1 className="mt-2 text-2xl font-extrabold">{paper.unitCode} <span className="font-medium text-muted">· {paper.year}</span></h1>
      <p className="mt-1 text-[15px] text-muted">{paper.title}</p>
      <p className="mt-1 text-[13px] text-muted">{[paper.sitting, paper.school].filter(Boolean).join(' · ')}</p>

      {paper.pageCount > 0 ? (
        // The whole paper, page by page. These are images; the PDF itself is only handed out by Download below.
        // On a phone the pages run edge to edge (the screen is the page); on a desktop they sit in a wide centred column.
        <div className="-mx-5 mt-4 flex flex-col gap-2 bg-[#E9EDF5] py-2 lg:mx-auto lg:max-w-[860px] lg:gap-4 lg:rounded-[22px] lg:p-5" onContextMenu={e => e.preventDefault()}>
          <p className="px-5 pb-0.5 text-center text-[12px] text-muted lg:px-0">Tap any spot on a page to zoom in there</p>
          {Array.from({ length: paper.readablePages }, (_, i) => (
            <figure key={i} className="relative bg-white shadow-sm lg:overflow-hidden lg:rounded-xl">
              <button type="button" aria-label={`Zoom page ${i + 1}`} className="block w-full cursor-zoom-in" onClick={e => {
                // Zoom in on the spot that was tapped. A keyboard press has no position, so it opens near the top.
                const r = e.currentTarget.getBoundingClientRect();
                const fx = e.detail === 0 ? 0.5 : (e.clientX - r.left) / r.width;
                const fy = e.detail === 0 ? 0.15 : (e.clientY - r.top) / r.height;
                setZoom({ n: i + 1, fx: Math.min(1, Math.max(0, fx)), fy: Math.min(1, Math.max(0, fy)) });
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/v1/papers/${paper.id}/pages/${i + 1}`} alt={`${paper.unitCode} ${paper.year}, page ${i + 1} of ${paper.pageCount}`} loading={i < 2 ? 'eager' : 'lazy'} draggable={false} className="block w-full select-none" />
              </button>
              <figcaption className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white"><ZoomIn size={12} aria-hidden /> {i + 1} / {paper.pageCount}</figcaption>
            </figure>
          ))}
          {paper.readablePages < paper.pageCount && (
            <div className="mx-5 rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-5 text-center lg:mx-0">
              <p className="text-[15px] font-bold">{paper.pageCount - paper.readablePages} more page{paper.pageCount - paper.readablePages === 1 ? '' : 's'}</p>
              <p className="mt-1 text-[13px] text-muted">The rest of this paper opens when you download it.</p>
              <button type="button" onClick={download} disabled={busy} className="mt-3 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-6 font-bold text-white disabled:opacity-70"><Download size={18} aria-hidden /> Download to read it all</button>
            </div>
          )}
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
        className="mx-auto mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-70 lg:max-w-[860px]"
      >
        {busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Download size={20} aria-hidden />}
        Download PDF
      </button>

      {zoom !== null && <Zoom paper={paper} start={zoom} onClose={() => setZoom(null)} />}

      {price !== null && (
        <PaymentSheet
          open
          paperId={paper.id}
          label={`${paper.unitCode} ${paper.year}`}
          amount={price}
          onClose={() => setPrice(null)}
          onPaid={() => { window.location.href = `/api/v1/papers/${paper.id}/download`; setTimeout(load, 2000); }}
        />
      )}
    </main>
  );
}
