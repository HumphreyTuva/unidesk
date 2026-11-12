'use client';
import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Google's own "Sign in with Google" button. It hands us a signed credential, which the API verifies with Google.
// Hidden when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.
export default function GoogleButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const cb = useRef(onCredential);
  cb.current = onCredential;

  useEffect(() => {
    if (box.current) setWidth(Math.min(Math.round(box.current.clientWidth), 400));
  }, []);

  useEffect(() => {
    if (!CLIENT_ID || !width) return;
    const w = window as any;
    const init = () => {
      w.google?.accounts.id.initialize({ client_id: CLIENT_ID, callback: (r: { credential: string }) => cb.current(r.credential) });
      if (box.current) w.google?.accounts.id.renderButton(box.current, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width });
    };
    if (w.google?.accounts) return init();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  }, [width]);

  if (!CLIENT_ID) return null;
  return <div ref={box} className="flex min-h-[44px] w-full justify-center" />;
}
