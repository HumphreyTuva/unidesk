'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink placeholder:text-[#6B7794]';

export default function Advertise() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState<{ fee: number; days: number } | null>(null);
  const [f, setF] = useState({ title: '', description: '', price: '', contactPhone: '' });
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (ready && !user) router.replace('/login?next=/campus/advertise'); }, [ready, user, router]);
  useEffect(() => { api('/campus/market/info').then(setInfo).catch(() => {}); }, []);
  if (!ready || !user) return null;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title', f.title); fd.append('description', f.description); fd.append('price', f.price); fd.append('contactPhone', f.contactPhone);
      if (image) fd.append('image', image);
      await api('/campus/market', 'POST', fd);
      router.replace('/campus/ads');
    } catch (err: any) { setError(err.message); setBusy(false); }
  };

  return (
    <main className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/campus" aria-label="Back to Campus" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Advertise your business</h1>
      {info && <p className="mt-1 text-sm text-muted">{info.fee > 0 ? `KSh ${info.fee} for ${info.days} days, paid by M-Pesa after you save the ad.` : `Free for ${info.days} days.`} We check every ad before it goes live.</p>}
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3.5">
        <input value={f.title} onChange={set('title')} required maxLength={80} placeholder="What are you selling? (title)" aria-label="Title" className={field} />
        <textarea value={f.description} onChange={set('description')} rows={4} maxLength={500} placeholder="Describe it: what, where, when" aria-label="Description" className="w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] p-3 text-[15px]" />
        <input value={f.price} onChange={set('price')} inputMode="numeric" pattern="[0-9]*" placeholder="Price in KSh (optional)" aria-label="Price" className={field} />
        <input value={f.contactPhone} onChange={set('contactPhone')} required inputMode="tel" placeholder="Phone for customers, e.g. 0712 345 678" aria-label="Phone" className={field} />
        <label className="flex flex-col gap-1.5 text-[13px] font-bold">Picture (optional, up to 4 MB)
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImage(e.target.files?.[0] ?? null)} className="text-sm font-normal" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
        <button type="submit" disabled={busy} className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-70">{busy && <Loader2 size={20} className="animate-spin" aria-hidden />} Save and continue</button>
      </form>
    </main>
  );
}
