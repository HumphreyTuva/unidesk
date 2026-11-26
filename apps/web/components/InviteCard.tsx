'use client';
import { useEffect, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

type Info = { code: string; invited: number; counted: number; bonus: number; perFriend: number; cap: number };

// "Invite a friend": a personal link. A friend who joins through it and opens a paper earns the student more free downloads.
export default function InviteCard({ compact }: { compact?: boolean }) {
  const { user } = useAuth();
  const toast = useToast();
  const [info, setInfo] = useState<Info | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (user) api<Info>('/referrals/me').then(setInfo).catch(() => setInfo(null)); }, [user]);
  if (!user || !info) return null;

  const link = `${window.location.origin}/?ref=${info.code}`;
  const text = `Past papers, class timetable with reminders and KU guides in one app for KU students. Join with my link: ${link}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); toast.ok('Invite link copied'); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error('Could not copy. Use the WhatsApp button instead.'); }
  };
  const full = info.bonus >= info.cap;

  return (
    <section className="rounded-2xl border-[1.5px] border-line bg-card p-4" aria-label="Invite a friend">
      <h2 className="text-[16px] font-extrabold">Invite a friend</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-muted">
        {full
          ? `You have earned the most bonus downloads (${info.cap}). Thank you for spreading the word.`
          : `When a friend joins with your link and opens a paper, you get ${info.perFriend} more free downloads, up to ${info.cap}.`}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#128C4A] text-[14px] font-bold text-white"><Share2 size={17} aria-hidden /> WhatsApp</a>
        <button type="button" onClick={copy} className="flex h-12 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-edge bg-card text-[14px] font-bold">{copied ? <Check size={17} aria-hidden /> : <Copy size={17} aria-hidden />} {copied ? 'Copied' : 'Copy link'}</button>
      </div>
      {(!compact || info.invited > 0) && (
        <p className="mt-3 text-[13px] text-muted">
          {info.invited === 0 ? 'No friends have joined yet.' : `${info.invited} ${info.invited === 1 ? 'friend has' : 'friends have'} joined, ${info.counted} counted so far. Bonus downloads: ${info.bonus} of ${info.cap}.`}
        </p>
      )}
    </section>
  );
}
