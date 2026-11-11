import { ImageResponse } from 'next/og';
import { OG_SIZE, ogCard } from '@/lib/ogCard';
import { apiGet, type PaperDetail } from '@/lib/seo';

export const alt = 'Past paper on UniDesk';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 3600;

export default async function Image({ params }: { params: { id: string } }) {
  const r = await apiGet<PaperDetail>(`/papers/${params.id}`, 3600);
  const p = r.ok ? r.data : null;
  return new ImageResponse(
    p
      ? ogCard({ eyebrow: `${p.year} past paper`, headline: `${p.unitCode} ${p.title}`, sub: [p.sitting, p.school, 'Kenyatta University'].filter(Boolean).join(' · ') })
      : ogCard({ eyebrow: 'Past paper', headline: 'Kenyatta University past papers' }),
    size,
  );
}
