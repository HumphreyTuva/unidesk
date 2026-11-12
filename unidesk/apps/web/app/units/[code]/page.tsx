import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronRight, FileText, Plus } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import { KU, SITE_URL, UNIT_RE, abs, breadcrumbs, cleanUnit, papersForUnit } from '@/lib/seo';

export const revalidate = 300;
type Props = { params: { code: string } };

// One page per unit code ("ICS2201 past papers"): the page a student lands on when they search for their unit.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = cleanUnit(params.code);
  if (!UNIT_RE.test(code)) return { title: 'Unit not found', robots: { index: false } };
  const list = await papersForUnit(code);
  if (!list) return { title: `${code} past papers`, robots: { index: false, follow: true } };
  if (!list.length) return { title: 'Unit not found', robots: { index: false } };
  const years = [...new Set(list.map(p => p.year))].sort((a, b) => b - a);
  const title = `${code} ${list[0].title}: Past Papers (KU)`;
  const description = `${list.length} Kenyatta University past paper${list.length === 1 ? '' : 's'} for ${code} ${list[0].title}, ${years.length > 1 ? `from ${years[years.length - 1]} to ${years[0]}` : `from ${years[0]}`}. Read them online on UniDesk.`;
  return { title, description, alternates: { canonical: `/units/${code}` }, openGraph: { type: 'website', title, description, url: `/units/${code}` }, twitter: { card: 'summary_large_image', title, description } };
}

export default async function UnitPage({ params }: Props) {
  const code = cleanUnit(params.code);
  if (!UNIT_RE.test(code)) notFound();
  const list = await papersForUnit(code);
  if (list === null) throw new Error('The paper library could not be reached'); // a temporary error, not a 404: crawlers retry later
  if (!list.length) notFound();

  const name = list[0].title;
  const years = [...new Set(list.map(p => p.year))].sort((a, b) => b - a);

  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-10">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'CollectionPage',
              '@id': `${abs(`/units/${code}`)}#page`,
              url: abs(`/units/${code}`),
              name: `${code} ${name}: past papers`,
              inLanguage: 'en',
              about: { '@type': 'Course', name, courseCode: code, provider: KU },
              isPartOf: { '@id': `${SITE_URL}/#website` },
              mainEntity: {
                '@type': 'ItemList',
                numberOfItems: list.length,
                itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: `${code} ${p.title} ${p.year}`, url: abs(`/papers/${p.id}`) })),
              },
            },
            breadcrumbs([['Home', '/'], ['Past papers', '/papers'], [code, `/units/${code}`]]),
          ],
        }}
      />
      <Link href="/papers" aria-label="Back to past papers" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>

      <h1 className="mt-2 text-2xl font-extrabold">{code} <span className="font-medium text-muted">{name}</span></h1>
      {/* Answer first: this sentence is what a search or AI answer would quote. */}
      <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
        UniDesk has {list.length} Kenyatta University past paper{list.length === 1 ? '' : 's'} for {code} {name}, from {years.length > 1 ? `${years[years.length - 1]} to ${years[0]}` : years[0]}. Open one to read it page by page.
      </p>

      <ul className="cols-lg mt-5 flex flex-col gap-2.5">
        {list.map(p => (
          <li key={p.id}>
            <Link href={`/papers/${p.id}`} className="flex min-h-[64px] items-center gap-3.5 rounded-[18px] border-[1.5px] border-line bg-white px-4 py-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><FileText size={22} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{p.year}{p.sitting ? ` · ${p.sitting}` : ''}</span>
                <span className="block truncate text-[13px] text-muted">{[p.school, p.pageCount ? `${p.pageCount} page${p.pageCount === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ') || p.title}</span>
              </span>
              <ChevronRight size={20} className="text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-[18px] border-[1.5px] border-dashed border-edge bg-white p-5 text-center">
        <p className="text-[15px] font-bold">Missing a year?</p>
        <p className="mt-1 text-[13px] text-muted">Request it and we will mark it done when it is added.</p>
        <Link href="/papers?request=1" className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-[14px] font-bold text-white"><Plus size={18} aria-hidden /> Request a paper</Link>
      </section>
    </main>
  );
}
