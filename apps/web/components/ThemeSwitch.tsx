'use client';
import { useEffect, useState } from 'react';

type Mode = 'light' | 'dark' | 'auto';
const KEY = 'unidesk_theme';
const OPTIONS: [Mode, string][] = [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']];

const apply = (m: Mode) => {
  const dark = m === 'dark' || (m === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
};

// Light is the default. Dark and Auto (follows the phone) are chosen here and remembered on this phone only.
export default function ThemeSwitch() {
  const [mode, setMode] = useState<Mode>('light');

  useEffect(() => {
    try { const v = localStorage.getItem(KEY); if (v === 'dark' || v === 'auto') setMode(v); } catch {}
  }, []);

  // In Auto, follow the phone if it switches (for example at sunset).
  useEffect(() => {
    if (mode !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => apply('auto');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [mode]);

  const pick = (m: Mode) => {
    setMode(m);
    try { localStorage.setItem(KEY, m); } catch {}
    apply(m);
  };

  return (
    <section className="mt-4 rounded-2xl border-[1.5px] border-line bg-card p-5" aria-label="Appearance">
      <p className="text-[15px] font-extrabold">Appearance</p>
      <p className="mt-0.5 text-[13px] text-muted">Auto follows your phone’s setting.</p>
      <div role="radiogroup" aria-label="Theme" className="mt-3 grid grid-cols-3 rounded-2xl bg-surface p-1">
        {OPTIONS.map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => pick(k)} className={`h-10 rounded-xl text-sm font-bold ${mode === k ? 'bg-brand text-white' : 'text-muted'}`}>{label}</button>
        ))}
      </div>
    </section>
  );
}
