import type { MetadataRoute } from 'next';
import { PROCEDURES } from '@/content/procedures';
import { SITE_URL, apiGet, type PaperCard } from '@/lib/seo';

export const revalidate = 3600; // rebuilt hourly, so new papers appear without a deploy

type Venue = { id: string };

// Every public paper, following the API's pages. Bounded, so a huge library cannot make this endless.
async function allPapers(): Promise<PaperCard[]> {
  const out: PaperCard[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 60; i++) {
    const r: Awaited<ReturnType<typeof apiGet<{ items: PaperCard[]; nextCursor: string | null }>>> =
      await apiGet(`/papers?take=50${cursor ? `&cursor=${cursor}` : ''}`, 3600);
    if (!r.ok) break;
    out.push(...r.data.items);
    cursor = r.data.nextCursor;
    if (!cursor) break;
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/papers`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/guide/call-off`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/guide/offices`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/guide/timetable`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/guide/venues`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    ...PROCEDURES.map(p => ({ url: `${SITE_URL}/guide/procedures/${p.id}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 })),
    { url: `${SITE_URL}/campus`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
  ];

  const [papers, venues] = await Promise.all([allPapers(), apiGet<Venue[]>('/venues', 3600)]);

  const units = new Map<string, Date>();
  const paperUrls: MetadataRoute.Sitemap = papers.map(p => {
    const added = p.addedAt ? new Date(p.addedAt) : now;
    const prev = units.get(p.unitCode);
    if (!prev || added > prev) units.set(p.unitCode, added);
    return { url: `${SITE_URL}/papers/${p.id}`, lastModified: added, changeFrequency: 'monthly', priority: 0.7 };
  });
  const unitUrls: MetadataRoute.Sitemap = [...units].map(([code, d]) => ({ url: `${SITE_URL}/units/${code}`, lastModified: d, changeFrequency: 'weekly', priority: 0.8 }));
  const venueUrls: MetadataRoute.Sitemap = venues.ok ? venues.data.map(v => ({ url: `${SITE_URL}/guide/venues/${v.id}`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 })) : [];

  return [...fixed, ...unitUrls, ...paperUrls, ...venueUrls];
}
