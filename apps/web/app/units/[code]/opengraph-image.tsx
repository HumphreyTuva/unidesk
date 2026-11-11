import { ImageResponse } from 'next/og';
import { OG_SIZE, ogCard } from '@/lib/ogCard';
import { cleanUnit, papersForUnit } from '@/lib/seo';

export const alt = 'Past papers on UniDesk';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 3600;

export default async function Image({ params }: { params: { code: string } }) {
  const code = cleanUnit(params.code);
  const list = await papersForUnit(code);
  return new ImageResponse(
    list && list.length
      ? ogCard({ eyebrow: 'Past papers', headline: `${code} ${list[0].title}`, sub: `${list.length} Kenyatta University paper${list.length === 1 ? '' : 's'} to read online` })
      : ogCard({ eyebrow: 'Past papers', headline: 'Kenyatta University past papers' }),
    size,
  );
}
