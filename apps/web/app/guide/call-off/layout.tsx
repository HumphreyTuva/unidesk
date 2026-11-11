import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { CALL_OFF_OFFICE, CALL_OFF_STEPS } from '@/content/callOff';
import { abs, breadcrumbs } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'How to Call Off a Semester at Kenyatta University (KU)',
  description: `Steps to call off (defer) a semester at KU: write to the Registrar (Academic), submit the letter at ${CALL_OFF_OFFICE.where}, get it stamped, and wait 2 to 3 days. Includes a ready letter.`,
  alternates: { canonical: '/guide/call-off' },
  openGraph: { type: 'article', title: 'How to call off a semester at Kenyatta University', url: '/guide/call-off' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'HowTo',
              name: 'How to call off a semester at Kenyatta University',
              description: 'Write a call-off (deferment) letter to the Registrar (Academic) and submit it for stamping.',
              inLanguage: 'en',
              step: CALL_OFF_STEPS.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.body, url: `${abs('/guide/call-off')}#step-${i + 1}` })),
            },
            breadcrumbs([['Home', '/'], ['Guide', '/guide'], ['Call off a semester', '/guide/call-off']]),
          ],
        }}
      />
      {children}
    </>
  );
}
