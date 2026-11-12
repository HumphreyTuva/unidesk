// Server-side helpers for search engines and AI answer engines. Nothing here runs in the browser.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://unidesk.co.ke').replace(/\/$/, '');
export const SITE_NAME = 'UniDesk';
const API = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');

export const abs = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number };

// Reads the public API from the server. Never throws: a slow or sleeping API becomes { ok: false } and the caller decides.
export async function apiGet<T>(path: string, revalidate = 300): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API}/api/v1${path}`, { next: { revalidate }, signal: AbortSignal.timeout(8000) } as RequestInit);
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

export type PaperCard = {
  id: string; unitCode: string; title: string; year: number;
  sitting: string | null; school: string | null; hasPreview: boolean; pageCount: number; addedAt?: string;
};
export type PaperDetail = PaperCard & { readablePages: number };

export const UNIT_RE = /^[A-Z]{2,6}\d{2,5}[A-Z]?$/;
export const cleanUnit = (raw: string) => decodeURIComponent(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');

// Every published paper for one unit code, newest first. null means the API could not be reached (not "no papers").
export async function papersForUnit(code: string): Promise<PaperCard[] | null> {
  const r = await apiGet<{ items: PaperCard[] }>(`/papers?q=${encodeURIComponent(code)}&take=50`);
  if (!r.ok) return null;
  return r.data.items.filter(p => p.unitCode === code);
}

export const paperHeading = (p: Pick<PaperCard, 'unitCode' | 'title' | 'year'>) => `${p.unitCode} ${p.title}: ${p.year} Past Paper (KU)`;

export const paperSummary = (p: PaperCard) =>
  `This is the Kenyatta University ${p.sitting ? `${p.sitting} ` : ''}examination paper for ${p.unitCode} ${p.title}, ${p.year}.` +
  `${p.school ? ` School: ${p.school}.` : ''}${p.pageCount ? ` It has ${p.pageCount} page${p.pageCount === 1 ? '' : 's'}.` : ''}`;

// schema.org BreadcrumbList from [name, path] pairs.
export const breadcrumbs = (items: [string, string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
});

export const KU = { '@type': 'CollegeOrUniversity', name: 'Kenyatta University', url: 'https://www.ku.ac.ke' };
