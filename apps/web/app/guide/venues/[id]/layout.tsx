import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { KU, abs, apiGet, breadcrumbs } from '@/lib/seo';

type V = { id: string; name: string; zone?: string | null; landmark?: string | null; lat?: number | null; lng?: number | null };
type Props = { children: React.ReactNode; params: { id: string } };

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const r = await apiGet<V>(`/venues/${params.id}`, 3600);
  if (!r.ok) return { title: 'Venue', robots: { index: false, follow: true } };
  const v = r.data;
  const description = `How to find ${v.name} at Kenyatta University.${v.landmark ? ` ${v.landmark}.` : ''}${v.zone ? ` Area: ${v.zone}.` : ''} Walking route and photo steps on UniDesk.`;
  return { title: `How to find ${v.name} (Kenyatta University)`, description, alternates: { canonical: `/guide/venues/${v.id}` }, openGraph: { type: 'article', title: `How to find ${v.name}`, description, url: `/guide/venues/${v.id}` } };
}

export default async function Layout({ children, params }: Props) {
  const r = await apiGet<V>(`/venues/${params.id}`, 3600);
  const v = r.ok ? r.data : null;
  return (
    <>
      {v && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Place',
                name: v.name,
                description: v.landmark ?? undefined,
                containedInPlace: KU,
                ...(v.lat != null && v.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: v.lat, longitude: v.lng } } : {}),
                url: abs(`/guide/venues/${v.id}`),
              },
              breadcrumbs([['Home', '/'], ['Guide', '/guide'], ['Venues', '/guide/venues'], [v.name, `/guide/venues/${v.id}`]]),
            ],
          }}
        />
      )}
      {children}
    </>
  );
}
