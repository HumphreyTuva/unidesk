import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { Faq } from '@/content/faq';

// Plain <details>: works without JavaScript, and the answers are in the page for search engines and AI to read.
export default function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map(f => (
        <details key={f.q} className="group rounded-[18px] border-[1.5px] border-line bg-white px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-bold [&::-webkit-details-marker]:hidden">
            <h3 className="text-[15px] font-bold">{f.q}</h3>
            <ChevronDown size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink/80">{f.a}</p>
          {f.link && <Link href={f.link.href} className="mt-2 inline-block text-[14px] font-bold text-brand">{f.link.label}</Link>}
        </details>
      ))}
    </div>
  );
}
