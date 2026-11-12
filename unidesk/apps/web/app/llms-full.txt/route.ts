import { CALL_OFF_OFFICE, CALL_OFF_STEPS } from '@/content/callOff';
import { FAQ } from '@/content/faq';
import { OFFICES } from '@/content/offices';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

// The same facts the site shows, as one plain-text page, so an AI assistant can quote them accurately without crawling every screen.
export function GET() {
  const body = `# UniDesk: full guide for Kenyatta University students

Source: ${SITE_URL}. These details can change; confirm important ones with the university.

## How to call off (defer) a semester at Kenyatta University

${CALL_OFF_STEPS.map((s, i) => `${i + 1}. ${s.title}: ${s.body}`).join('\n')}

Where to submit: ${CALL_OFF_OFFICE.name}, ${CALL_OFF_OFFICE.where}.
Page: ${SITE_URL}/guide/call-off

## Important Kenyatta University offices

${OFFICES.map(o => `- ${o.name}: ${o.room}, ${o.building}`).join('\n')}

Page: ${SITE_URL}/guide/offices

## Questions students ask

${FAQ.map(f => `### ${f.q}\n${f.a}`).join('\n\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
