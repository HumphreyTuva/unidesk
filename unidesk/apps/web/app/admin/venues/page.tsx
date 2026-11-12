'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useToast } from '@/lib/toast';

type Row = { id: string; name: string; zone: string | null; landmark: string | null; lat: number | null; lng: number | null; rooms: string[]; stepCount: number };
type Detail = Row & { steps: { id: string; caption: string; photo: boolean }[] };
const field = 'h-[50px] w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] px-4 text-[15px] text-ink placeholder:text-[#6B7794]';
const btn = 'flex h-11 items-center justify-center gap-2 rounded-xl px-4 font-bold disabled:opacity-60';

export default function AdminVenues() {
  const ok = useRequireAdmin();
  const [list, setList] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [bulk, setBulk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { api<Row[]>('/admin/venues').then(setList).catch(e => setError(e.message)); }, []);
  useEffect(() => { if (ok) load(); }, [ok, load]);
  if (!ok) return null;

  const run = async (fn: () => Promise<any>, done?: (r: any) => void) => {
    setBusy(true); setError(''); setNote('');
    try { const r = await fn(); done?.(r); load(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <main className="wide px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-8">
      <Link href="/admin" aria-label="Back to admin" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft size={24} aria-hidden /></Link>
      <h1 className="mt-2 text-2xl font-extrabold">Venues</h1>
      <p className="mt-1 text-sm text-muted">Add buildings and their room codes, then a map pin and up to 8 photo steps.</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#9B1C1C]">{error}</p>}
      {note && <p className="mt-4 rounded-xl bg-[#E3F6EA] px-3.5 py-2.5 text-sm font-medium text-[#116B35]">{note}</p>}

      <form className="mt-5 flex flex-col gap-3 rounded-[20px] border-[1.5px] border-line bg-white p-4" onSubmit={e => {
        e.preventDefault();
        run(() => api('/admin/venues/import', 'POST', { text: bulk }), r => { setBulk(''); setNote(`${r.created} added, ${r.updated} updated.${r.problems.length ? ' ' + r.problems.join(' ') : ''}`); });
      }}>
        <p className="text-[15px] font-extrabold">Add many at once</p>
        <p className="text-[13px] text-muted">One building per line: <b>Name; Area; CODE1, CODE2</b>. Example: Ole Moi Yoi; Science area; OML1, OML2, OML3</p>
        <textarea value={bulk} onChange={e => setBulk(e.target.value)} rows={5} className="w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] p-3 text-[14px]" aria-label="Venue lines" />
        <button type="submit" disabled={busy || !bulk.trim()} className={`${btn} bg-brand text-white`}>{busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Plus size={18} aria-hidden />} Add</button>
      </form>

      {!list && !error && <div className="flex justify-center py-8 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>}
      <ul className="cols-lg mt-6 flex flex-col gap-2.5">
        {list?.map(b => (
          <li key={b.id} className="rounded-[18px] border-[1.5px] border-line bg-white">
            <button type="button" onClick={() => setOpen(open === b.id ? null : b.id)} aria-expanded={open === b.id} className="flex w-full items-center gap-3 p-4 text-left">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{b.name}</span>
                <span className="block text-[13px] text-muted">{b.rooms.length} rooms · {b.lat != null ? 'pin set' : 'no pin'} · {b.stepCount} steps</span>
              </span>
            </button>
            {open === b.id && <Editor id={b.id} onChanged={load} onError={setError} onDeleted={() => { setOpen(null); load(); }} />}
          </li>
        ))}
      </ul>
    </main>
  );
}

function Editor({ id, onChanged, onError, onDeleted }: { id: string; onChanged: () => void; onError: (m: string) => void; onDeleted: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<Detail | null>(null);
  const [f, setF] = useState({ name: '', zone: '', landmark: '', lat: '', lng: '', rooms: '' });
  const [cap, setCap] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Detail>(`/venues/${id}`).then(x => {
      setD(x);
      setF({ name: x.name, zone: x.zone ?? '', landmark: x.landmark ?? '', lat: x.lat?.toString() ?? '', lng: x.lng?.toString() ?? '', rooms: x.rooms.join(', ') });
    }).catch(e => onError(e.message));
  }, [id, onError]);
  useEffect(load, [load]);

  const go = async (fn: () => Promise<any>) => {
    setBusy(true); onError('');
    try { await fn(); toast.ok('Saved'); load(); onChanged(); } catch (e: any) { onError(e.message); } finally { setBusy(false); }
  };
  if (!d) return <div className="flex justify-center p-4 text-brand"><Loader2 className="animate-spin" aria-label="Loading" /></div>;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="flex flex-col gap-3 border-t-[1.5px] border-line p-4">
      <input value={f.name} onChange={set('name')} placeholder="Building name" aria-label="Building name" className={field} />
      <input value={f.zone} onChange={set('zone')} placeholder="Area, e.g. Science complex" aria-label="Area" className={field} />
      <input value={f.landmark} onChange={set('landmark')} placeholder="Hint, e.g. Opposite the main library" aria-label="Hint" className={field} />
      <div className="grid grid-cols-2 gap-2">
        <input value={f.lat} onChange={set('lat')} inputMode="decimal" placeholder="Latitude" aria-label="Latitude" className={field} />
        <input value={f.lng} onChange={set('lng')} inputMode="decimal" placeholder="Longitude" aria-label="Longitude" className={field} />
      </div>
      <p className="-mt-1 text-[12px] text-muted">In Google Maps, press and hold on the building, then tap the numbers to copy them.</p>
      <textarea value={f.rooms} onChange={set('rooms')} rows={3} aria-label="Room codes" placeholder="Room codes, separated by commas" className="w-full rounded-2xl border-[1.5px] border-edge bg-[#F8FAFE] p-3 text-[14px]" />
      <button type="button" disabled={busy} onClick={() => go(() => api(`/admin/venues/${id}`, 'PUT', { ...f, lat: f.lat.trim(), lng: f.lng.trim() }))} className={`${btn} bg-brand text-white`}>Save building</button>

      <p className="mt-2 text-[15px] font-extrabold">Photo steps</p>
      <ol className="flex flex-col gap-2">
        {d.steps.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 rounded-xl border-[1.5px] border-line p-2">
            {s.photo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/api/v1/venues/steps/${s.id}/photo`} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
            <span className="min-w-0 flex-1 text-[14px]">{i + 1}. {s.caption}</span>
            <button type="button" aria-label="Move up" disabled={busy || i === 0} onClick={() => go(() => api(`/admin/venues/steps/${s.id}/up`, 'POST'))} className="flex h-10 w-10 items-center justify-center rounded-lg border-[1.5px] border-edge disabled:opacity-40"><ArrowUp size={16} aria-hidden /></button>
            <button type="button" aria-label="Move down" disabled={busy || i === d.steps.length - 1} onClick={() => go(() => api(`/admin/venues/steps/${s.id}/down`, 'POST'))} className="flex h-10 w-10 items-center justify-center rounded-lg border-[1.5px] border-edge disabled:opacity-40"><ArrowDown size={16} aria-hidden /></button>
            <button type="button" aria-label="Delete step" disabled={busy} onClick={() => window.confirm('Delete this step?') && go(() => api(`/admin/venues/steps/${s.id}`, 'DELETE'))} className="flex h-10 w-10 items-center justify-center rounded-lg border-[1.5px] border-edge text-muted"><Trash2 size={16} aria-hidden /></button>
          </li>
        ))}
      </ol>
      {d.steps.length < 8 && (
        <div className="flex flex-col gap-2 rounded-xl bg-[#F8FAFE] p-3">
          <input value={cap} onChange={e => setCap(e.target.value)} maxLength={160} placeholder="Caption, e.g. Take the stairs on your left" aria-label="Step caption" className={field} />
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setPhoto(e.target.files?.[0] ?? null)} aria-label="Step photo" className="text-sm" />
          <button type="button" disabled={busy || !cap.trim()} onClick={() => go(async () => {
            const fd = new FormData(); fd.append('caption', cap); if (photo) fd.append('photo', photo);
            await api(`/admin/venues/${id}/steps`, 'POST', fd); setCap(''); setPhoto(null);
          })} className={`${btn} border-[1.5px] border-brand text-brand`}><Plus size={18} aria-hidden /> Add step</button>
        </div>
      )}

      <button type="button" disabled={busy} onClick={() => window.confirm(`Delete ${d.name} and all its steps?`) && (async () => { setBusy(true); try { await api(`/admin/venues/${id}`, 'DELETE'); onDeleted(); } catch (e: any) { onError(e.message); setBusy(false); } })()} className={`${btn} mt-2 border-[1.5px] border-edge text-[#9B1C1C]`}>Delete building</button>
    </div>
  );
}
