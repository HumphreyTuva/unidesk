'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, FileText, Loader2, Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import RequestSheet from '@/components/RequestSheet';
import MyRequests from '@/components/MyRequests';
import { useAuth } from '@/lib/auth';
import { SCHOOL_KEY, rememberSchool } from '@/lib/schools';

type Paper = { id: string; unitCode: string; title: string; year: number; sitting: string | null; school: string | null; hasPreview: boolean; aliases?: string[] };
type Page = { items: Paper[]; nextCursor: string | null };

const RECENT_KEY = 'unidesk_recent_papers';
const SEARCHES_KEY = 'unidesk_recent_searches';
const readList = <T,>(key: string): T[] => { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

function PaperRow({ p, mine, school, recent, onOpen }: { p: Paper; mine?: boolean; school?: boolean; recent?: boolean; onOpen?: (p: Paper) => void }) {
  return (
          <li>
            <Link href={`/papers/${p.id}`} onClick={() => onOpen?.(p)} className="flex min-h-[68px] items-center gap-3.5 rounded-[18px] border-[1.5px] border-line bg-card px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink"><FileText size={22} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{p.unitCode} <span className="font-medium text-muted">· {p.year}</span>{recent && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-ink">Recent</span>}{!recent && mine && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-ink">Your unit</span>}{!recent && !mine && school && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-ink">Your school</span>}</span>
                <span className="block truncate text-[13px] text-muted">{p.title}{p.sitting ? ` · ${p.sitting}` : ''}{p.aliases?.length ? ` · also ${p.aliases.join(', ')}` : ''}</span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
  );
}

// `initial` is the first page of papers, fetched on the server so search engines see real links to every paper.
export default function PapersView({ initial }: { initial: Page | null }) {
  const { user } = useAuth();
  const [mine, setMine] = useState<Paper[]>([]);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Paper[]>(initial?.items ?? []);
  const [cursor, setCursor] = useState<string | null>(initial?.nextCursor ?? null);
  const [loading, setLoading] = useState(!initial);
  const fresh = useRef(!!initial); // the very first search is already answered by `initial`
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(false);
  const seq = useRef(0);
  // What this student opened or searched lately, kept on this phone: those papers go to the very top.
  const [opened, setOpened] = useState<Paper[]>([]);
  const [searched, setSearched] = useState<Paper[]>([]);
  useEffect(() => {
    setOpened(readList<Paper>(RECENT_KEY).filter(p => p && typeof p.id === 'string').slice(0, 6));
    const codes = readList<string>(SEARCHES_KEY).filter(c => typeof c === 'string').slice(0, 3);
    Promise.all(codes.map(c => api<Page>(`/papers?q=${encodeURIComponent(c)}`).then(r => r.items).catch(() => [] as Paper[])))
      .then(lists => setSearched(lists.flat()));
  }, []);
  const rememberOpened = (p: Paper) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify([p, ...readList<Paper>(RECENT_KEY).filter(x => x?.id !== p.id)].slice(0, 6))); } catch {} };
  // School first: papers of the chosen school are listed ahead of the rest. Nothing is hidden.
  const [school, setSchool] = useState('');
  const [schoolItems, setSchoolItems] = useState<Paper[]>([]);

  // The school comes from what the student entered elsewhere (requests, letters) or from the unit they searched. Nothing to pick.
  useEffect(() => {
    let v = '';
    try { v = localStorage.getItem(SCHOOL_KEY) || ''; } catch {}
    setSchool(v || user?.school || '');
  }, [user]);
  // A search that lands on one school's paper teaches us the student's school.
  useEffect(() => {
    if (!q.trim() || loading) return;
    const count: Record<string, number> = {};
    for (const p of items) if (p.school) count[p.school] = (count[p.school] || 0) + 1;
    const top = Object.entries(count).sort((x, y) => y[1] - x[1])[0]?.[0];
    if (top && top !== school) { rememberSchool(top); setSchool(top); }
  }, [items, loading]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!school) { setSchoolItems([]); return; }
    let live = true;
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ school });
      if (q.trim()) qs.set('q', q.trim());
      api<Page>(`/papers?${qs}`).then(r => { if (live) setSchoolItems(r.items); }).catch(() => { if (live) setSchoolItems([]); });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [school, q]);

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

  // Units the student entered in the timetable maker (class and exam), kept on this phone. Signed-in students see their papers first.
  useEffect(() => {
    if (!user) { setMine([]); return; }
    let codes: string[] = [];
    try { for (const k of ['class', 'exam']) codes.push(...(JSON.parse(localStorage.getItem(`unidesk_units_${k}`) || '[]') as string[])); } catch {}
    codes = [...new Set(codes.filter(c => typeof c === 'string'))].slice(0, 30);
    if (!codes.length) { setMine([]); return; }
    api<{ items: Paper[] }>(`/papers/mine?codes=${encodeURIComponent(codes.join(','))}`).then(r => setMine(r.items)).catch(() => setMine([]));
  }, [user]);

  // A search for a unit code that finds papers is remembered.
  useEffect(() => {
    const code = q.trim().toUpperCase().replace(/\s+/g, '');
    if (loading || !/^[A-Z]{2,6}\d{2,5}[A-Z]?$/.test(code) || !items.some(p => p.unitCode.replace(/\s+/g, '').toUpperCase() === code)) return;
    try { localStorage.setItem(SEARCHES_KEY, JSON.stringify([code, ...readList<string>(SEARCHES_KEY).filter(c => c !== code)].slice(0, 3))); } catch {}
  }, [items, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // The Home "Request" shortcut opens the sheet straight away.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('request') === '1') setSheet(true);
    const term = sp.get('q'); // /papers?q=ICS2201 (also what the site search box in Google results sends)
    if (term) setQ(term.slice(0, 60));
  }, []);

  // One list: the student's own units first (when not searching), then everything else.
  const searching = !!q.trim();
  const seen = new Set<string>();
  const uniq = (l: Paper[]) => l.filter(p => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  const recentList = searching ? [] : uniq([...opened, ...searched]);
  const mineList = searching ? [] : uniq(mine);
  const recentIds = new Set(recentList.map(p => p.id));
  const mineIds = new Set(mineList.map(p => p.id));
  const schoolFirst = uniq(schoolItems);
  const schoolIds = new Set(schoolFirst.map(p => p.id));
  const shown = [...recentList, ...mineList, ...schoolFirst, ...items.filter(p => !seen.has(p.id))];

  return (
    <main className="wide px-5 pt-[calc(24px+env(safe-area-inset-top))]">
      <h1 className="text-2xl font-extrabold">Past papers</h1>

      <label className="relative mt-4 block">
        <span className="sr-only">Search by unit code or name</span>
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-ink" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search a unit code or name"
          autoCapitalize="none"
          className="h-[52px] w-full rounded-2xl border-[1.5px] border-edge bg-card pl-12 pr-4 text-[15px] placeholder:text-muted"
        />
      </label>


      {error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}

      <ul className="cols-lg mt-4 flex flex-col gap-2.5">
        {shown.map(p => (
          <PaperRow key={p.id} p={p} recent={recentIds.has(p.id)} mine={mineIds.has(p.id)} school={schoolIds.has(p.id)} onOpen={rememberOpened} />
        ))}
      </ul>

      {loading && <div className="flex justify-center py-6 text-brand-ink"><Loader2 className="animate-spin" aria-label="Loading" /></div>}

      {!loading && !error && shown.length === 0 && (
        <div className="mt-6 rounded-[18px] border-[1.5px] border-dashed border-edge bg-card p-6 text-center">
          <p className="text-[15px] font-bold">{q.trim() ? `No paper found for “${q.trim()}”` : 'No papers yet'}</p>
          <p className="mt-1 text-sm text-muted">Tell us which one you need and we will add it.</p>
        </div>
      )}

      {cursor && !loading && (
        <button type="button" onClick={() => load(q, cursor)} className="mt-4 h-12 w-full rounded-2xl border-[1.5px] border-edge bg-card font-bold">Show more</button>
      )}

      <MyRequests />

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
