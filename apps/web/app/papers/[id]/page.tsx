import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import PaperView from '@/components/PaperView';
import { KU, SITE_URL, abs, apiGet, breadcrumbs, paperHeading, paperSummary, papersForUnit, type PaperDetail } from '@/lib/seo';

export const revalidate = 300;
type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await apiGet<PaperDetail>(`/papers/${params.id}`);
  // Never let a temporary API failure put a bare, wrong title into search results.
  if (!r.ok) return { title: r.status === 404 ? 'Paper not found' : 'Past paper', robots: { index: false, follow: true } };
  const p = r.data;
  const title = paperHeading(p);
  const description = `${paperSummary(p)} Read it online on UniDesk.`;
  return {
    title,
    description,
    alternates: { canonical: `/papers/${p.id}` },
    openGraph: { type: 'article', title, description, url: `/papers/${p.id}` },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PaperPage({ params }: Props) {
  const r = await apiGet<PaperDetail>(`/papers/${params.id}`);
  if (!r.ok && r.status === 404) notFound(); // a real 404, so removed papers leave search results
  const paper = r.ok ? r.data : null;
  const related = paper ? ((await papersForUnit(paper.unitCode)) ?? []) : [];

  return (
    <>
      {paper && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'LearningResource',
                '@id': `${abs(`/papers/${paper.id}`)}#paper`,
                url: abs(`/papers/${paper.id}`),
                name: paperHeading(paper),
                description: paperSummary(paper),
                inLanguage: 'en',
                learningResourceType: 'Past examination paper',
                educationalLevel: 'University',
                temporalCoverage: String(paper.year),
                about: { '@type': 'Course', name: paper.title, courseCode: paper.unitCode, provider: KU },
                publisher: { '@id': `${SITE_URL}/#org` },
                image: abs(`/papers/${paper.id}/opengraph-image`),
              },
              breadcrumbs([['Home', '/'], ['Past papers', '/papers'], [paper.unitCode, `/units/${paper.unitCode}`], [`${paper.unitCode} ${paper.year}`, `/papers/${paper.id}`]]),
            ],
          }}
        />
      )}
      <PaperView id={params.id} initial={paper} related={related} />
    </>
  );
}
