import { ImageResponse } from 'next/og';
import { OG_SIZE, ogCard } from '@/lib/ogCard';

export const alt = 'UniDesk: Kenyatta University past papers, timetables and student guide';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(ogCard({ eyebrow: 'Kenyatta University', headline: 'Past papers, timetables and campus help', sub: 'Read papers online, build your timetable, find any venue.' }), size);
}
