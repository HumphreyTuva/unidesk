import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { OFFICES } from '@/content/offices';
import { abs, breadcrumbs } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Important Kenyatta University Offices and Room Numbers',
  description: 'Where to go at Kenyatta University: Finance, Registrar Academic, Bursary, Transcripts, Bio-Data, Student Affairs, deferment and password reset offices, with room numbers and buildings.',
  alternates: { canonical: '/guide/offices' },
  openGraph: { type: 'article', title: 'Important Kenyatta University offices and room numbers', url: '/guide/offices' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'ItemList',
              name: 'Important Kenyatta University offices',
              itemListElement: OFFICES.map((o, i) => ({ '@type': 'ListItem', position: i + 1, name: `${o.name}: ${o.room}, ${o.building}` })),
            },
            breadcrumbs([['Home', '/'], ['Guide', '/guide'], ['KU offices', '/guide/offices']]),
          ],
        }}
      />
      {children}
    </>
  );
}
