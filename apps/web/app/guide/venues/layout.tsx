import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find a Lecture Hall or Venue at Kenyatta University',
  description: 'Search Kenyatta University buildings and room codes. Get a landmark, a Google Maps walking route and photo steps to your lecture hall or exam venue.',
  alternates: { canonical: '/guide/venues' },
  openGraph: { type: 'website', title: 'Find a venue at Kenyatta University', url: '/guide/venues' },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
