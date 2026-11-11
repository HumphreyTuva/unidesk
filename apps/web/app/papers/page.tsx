import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import PapersView from '@/components/PapersView';
import { SITE_URL, abs, apiGet, breadcrumbs, type PaperCard } from '@/lib/seo';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Kenyatta University Past Papers',
  description: 'Search Kenyatta University (KU) past exam papers by unit code or name, and read them online page by page.',
  alternates: { canonical: '/papers' },
  openGraph: { type: 'website', title: 'Kenyatta University Past Papers | UniDesk', description: 'Search KU past exam papers by unit code or name and read them online.', url: '/papers' },
};

export default async function PapersPage() {
  const r = await apiGet<{ items: PaperCard[]; nextCursor: string | null }>('/papers?take=20');
  const initial = r.ok ? r.data : null;
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'CollectionPage',
              url: abs('/papers'),
              name: 'Kenyatta University past papers',
              isPartOf: { '@id': `${SITE_URL}/#website` },
              ...(initial ? { mainEntity: { '@type': 'ItemList', itemListElement: initial.items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: `${p.unitCode} ${p.title} ${p.year}`, url: abs(`/papers/${p.id}`) })) } } : {}),
            },
            breadcrumbs([['Home', '/'], ['Past papers', '/papers']]),
          ],
        }}
      />
      <PapersView initial={initial} />
    </>
  );
}
