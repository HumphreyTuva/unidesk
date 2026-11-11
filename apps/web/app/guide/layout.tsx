import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KU Student Guide',
  description: 'Guidance for Kenyatta University students: call off a semester, find KU offices and room numbers, make a timetable and find lecture halls.',
  alternates: { canonical: '/guide' },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
