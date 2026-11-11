'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, FileText, Loader2, Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import RequestSheet from '@/components/RequestSheet';

type Paper = { id: string; unitCode: string; title: string; year: number; sitting: string | null; school: string | null; hasPreview: boolean };
type Page = { items: Paper[]; nextCursor: string | null };

// `initial` is the first page of papers, fetched on the server so search engines see real links to every paper.
export default function PapersView({ initial }: { initial: Page | null }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Paper[]>(initial?.items ?? []);
  const [cursor, setCursor] = useState<string | null>(initial?.nextCursor ?? null);
  const [loading, setLoading] = useState(!initial);
  const fresh = useRef(!!initial); // the very first search is already answered by `initial`
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async (term: string, after?: string | null) => {
    const my = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (term.trim()) qs.set('q', term.trim());
      if (after) qs.set('cursor', after);
      const page = await api<Page>(`/papers?${qs}`);
      if (my !== seq.current) return; // a newer search replaced this one
      setItems(prev => (after ? [...prev, ...page.items] : page.items));
      setCursor(page.nextCursor);
    } catch (e: any) {
      if (my === seq.current) setError(e.message);
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, []);

  // Search as you type, after a short pause.
  useEffect(() => {
    if (fresh.current && !q) { fresh.current = false; return; }
    fresh.current = false;
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  // The Home "Request" shortcut opens the sheet straight away.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('request') === '1') setSheet(true);
    const term = sp.get('q'); // /papers?q=ICS2201 (also what the site search box in Google results sends)
    if (term) setQ(term.slice(0, 60));
  }, []);

  return (
    <main className="wide px-5 pt-[calc(24px+env(safe-area-inset-top))]">
      <h1 className="text-2xl font-extrabold">Past papers</h1>

      <label className="relative mt-4 block">
        <span className="sr-only">Search by unit code or name</span>
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search a unit code or name"
          autoCapitalize="none"
          className="h-[52px] w-full rounded-2xl border-[1.5px] border-edge bg-white pl-12 pr-4 text-[15px] placeholder:text-muted"
        />
      </label>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}

      <ul className="cols-lg mt-4 flex flex-col gap-2.5">
        {items.map(p => (
          <li key={p.id}>
            <Link href={`/papers/${p.id}`} className="flex min-h-[68px] items-center gap-3.5 rounded-[18px] border-[1.5px] border-line bg-white px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><FileText size={22} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{p.unitCode} <span className="font-medium text-muted">· {p.year}</span></span>
                <span className="block truncate text-[13px] text-muted">{p.title}{p.sitting ? ` · ${p.sitting}` : ''}</span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      {loading && <div className="flex justify-center py-6 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}

      {!loading && !error && items.length === 0 && (
        <div className="mt-6 rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-6 text-center">
          <p className="text-[15px] font-bold">{q.trim() ? `No paper found for “${q.trim()}”` : 'No papers yet'}</p>
          <p className="mt-1 text-sm text-muted">Tell us which one you need and we will add it.</p>
        </div>
      )}

      {cursor && !loading && (
        <button type="button" onClick={() => load(q, cursor)} className="mt-4 h-12 w-full rounded-2xl border-[1.5px] border-edge bg-white font-bold">Show more</button>
      )}

      {/* Always one tap away, so a missing paper never dead-ends */}
      <button
        type="button"
        onClick={() => setSheet(true)}
        className="mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-amber text-[15px] font-extrabold text-navy-900"
      >
        <Plus size={20} aria-hidden /> Can’t find your paper? Request it
      </button>

      <RequestSheet open={sheet} onClose={() => setSheet(false)} initialCode={/^[A-Za-z]{2,6}\s?-?\d{2,5}[A-Za-z]?$/.test(q.trim()) ? q.trim().toUpperCase() : ''} />
    </main>
  );
}
