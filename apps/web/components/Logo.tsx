'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';

// The app icon tile. Tapping it three times quickly opens the admin area (the phone version of Ctrl+Shift+A).
export default function Logo({ size = 44 }: { size?: number }) {
  const router = useRouter();
  const taps = useRef<number[]>([]);

  const onTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter(t => now - t < 900), now];
    if (taps.current.length >= 3) {
      taps.current = [];
      router.push('/admin');
    }
  };

  return (
    <button type="button" onClick={onTap} aria-label="UniDesk" className="shrink-0 rounded-[14px]" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={size} height={size} className="rounded-[14px]" />
    </button>
  );
}
