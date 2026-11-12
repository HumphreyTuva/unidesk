import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KU Campus: Clubs, Societies and Student Marketplace',
  description: 'Join Kenyatta University clubs, associations and societies, and browse products and services advertised by student businesses.',
  alternates: { canonical: '/campus' },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
