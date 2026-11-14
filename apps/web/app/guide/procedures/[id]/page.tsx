import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import CopyLetter from '@/components/CopyLetter';
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

      <ol className="mt-5 flex flex-col gap-2.5 lg:max-w-[820px]">
        {p.steps.map((s, i) => (
          <li key={i} id={`step-${i + 1}`} className="flex gap-3 rounded-[18px] border-[1.5px] border-line bg-white p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[14px] font-extrabold text-white" aria-hidden>{i + 1}</span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold">{s.title}</span>
              <span className="mt-0.5 block text-[14px] leading-relaxed text-muted">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>

      {p.notes?.map((n, i) => <p key={i} className="mt-3 rounded-xl bg-amber-soft px-3.5 py-3 text-[14px] font-medium leading-relaxed text-amber-ink lg:max-w-[820px]">{n}</p>)}

      {p.link && (
        <a href={p.link.href} target="_blank" rel="noopener noreferrer" className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand font-bold text-white lg:max-w-[820px]">
          <ExternalLink size={18} aria-hidden /> {p.link.label}
        </a>
      )}

      {p.letter && <div className="lg:max-w-[820px]"><CopyLetter title={p.letter.title} lines={p.letter.lines} /></div>}

      <p className="mt-6 text-[12px] leading-relaxed text-muted lg:max-w-[820px]">
        These steps come from information shared by students and the university, and rooms, fees and rules can change. Confirm with the office before you go. See <Link href="/guide/offices" className="font-semibold text-brand underline">Important KU offices</Link> for where to go. UniDesk is an independent student app, not the official KU portal.
      </p>
    </main>
  );
}
