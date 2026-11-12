'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, MessageCircle, Phone } from 'lucide-react';
import { api } from '@/lib/api';

type Ad = { id: string; title: string; description: string | null; price: number | null; image: boolean; phone: string };

export default function AdPage() {
  const { id } = useParams<{ id: string }>();
  const [a, setA] = useState<Ad | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api<Ad>(`/campus/market/${id}`).then(setA).catch(e => setError(e.message)); }, [id]);

  return (
    <main className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/campus" aria-label="Back to Campus" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      {!a && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
      {a && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {a.image && <img src={`/api/v1/campus/market/${a.id}/image`} alt="" className="mt-2 aspect-[4/3] w-full rounded-[18px] object-cover" />}
          <h1 className="mt-4 text-2xl font-extrabold">{a.title}</h1>
          {a.price != null && <p className="mt-1 text-xl font-extrabold text-brand">KSh {a.price.toLocaleString()}</p>}
          {a.description && <p className="mt-3 whitespace-pre-wrap text-[15px]">{a.description}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <a href={`tel:+${a.phone}`} className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand font-bold text-white"><Phone size={20} aria-hidden /> Call</a>
            <a href={`https://wa.me/${a.phone}`} target="_blank" rel="noopener noreferrer" className="flex h-[54px] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-brand font-bold text-brand"><MessageCircle size={20} aria-hidden /> WhatsApp</a>
          </div>
          <p className="mt-4 text-[12px] text-muted">UniDesk shows ads from businesses but does not sell or deliver anything. Meet in a public place and check before you pay.</p>
        </>
      )}
    </main>
  );
}
