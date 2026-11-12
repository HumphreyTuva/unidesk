import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import FaqList from '@/components/FaqList';
import JsonLd from '@/components/JsonLd';
import { FAQ } from '@/content/faq';
import { abs, breadcrumbs } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'KU Student FAQ: Papers, Call-off, Offices',
  description: 'Quick answers for Kenyatta University students: how to find past papers, call off a semester, where KU offices are, how to make a timetable and find a lecture hall.',
  alternates: { canonical: '/faq' },
  openGraph: { type: 'website', title: 'KU Student FAQ | UniDesk', description: 'Quick answers for Kenyatta University students.', url: '/faq' },
};

export default function FaqPage() {
  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-10">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'FAQPage', url: abs('/faq'), mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
            breadcrumbs([['Home', '/'], ['FAQ', '/faq']]),
          ],
        }}
      />
      <Link href="/" aria-label="Back to home" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Questions students ask</h1>
      <p className="mt-1 text-[15px] text-muted">Short answers about past papers, KU offices, call-off letters, timetables and finding venues.</p>
      <div className="mt-5 lg:max-w-[820px]"><FaqList items={FAQ} /></div>
    </main>
  );
}
