import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import ProcedureTabs from '@/components/ProcedureTabs';
import { PROCEDURES, procedure } from '@/content/procedures';
import { abs, breadcrumbs } from '@/lib/seo';

export const dynamicParams = false;
export function generateStaticParams() { return PROCEDURES.map(p => ({ id: p.id })); }

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const p = procedure(params.id);
  if (!p) return {};
  const title = p.question.replace(/\?$/, '');
  return {
    title,
    description: p.summary,
    alternates: { canonical: `/guide/procedures/${p.id}` },
    openGraph: { type: 'article', title, description: p.summary, url: `/guide/procedures/${p.id}` },
  };
}

export default function ProcedurePage({ params }: { params: { id: string } }) {
  const p = procedure(params.id);
  if (!p) return notFound();
  const url = `/guide/procedures/${p.id}`;

  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-10">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'HowTo', name: p.question.replace(/\?$/, ''), description: p.summary, url: abs(url), inLanguage: 'en-KE',
              step: p.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.body })),
            },
            breadcrumbs([['Home', '/'], ['Guide', '/guide'], [p.title, url]]),
          ],
        }}
      />
      <Link href="/guide" aria-label="Back to guide" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">{p.question}</h1>
      <p className="mt-2 text-[16px] leading-relaxed">{p.summary}</p>

      <ProcedureTabs p={p} />

      <p className="mt-6 text-[12px] leading-relaxed text-muted lg:max-w-[820px]">
        These steps come from information shared by students and the university, and rooms, fees and rules can change. Confirm with the office before you go. See <Link href="/guide/offices" className="font-semibold text-brand underline">Important KU offices</Link> for where to go. UniDesk is an independent student app, not the official KU portal.
      </p>
    </main>
  );
}
