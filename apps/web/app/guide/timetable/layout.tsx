import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KU Class and Exam Timetable Generator',
  description: 'Pick your units and get your Kenyatta University class or exam timetable, with clashes flagged. Built from the published university timetable.',
  alternates: { canonical: '/guide/timetable' },
  openGraph: { type: 'website', title: 'KU class and exam timetable generator', url: '/guide/timetable' },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
