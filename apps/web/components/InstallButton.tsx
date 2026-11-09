'use client';
import { useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';

// Shows an Install card only when the phone can install the app and it is not installed yet.
// Chrome and Android fire "beforeinstallprompt". iPhones never do, so there we show the Share-menu steps instead.
export default function InstallButton() {
  const [prompt, setPrompt] = useState<any>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true); // assume installed until we know otherwise, so nothing flashes

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  if (prompt) {
    return (
      <button
        type="button"
        onClick={async () => { prompt.prompt(); await prompt.userChoice.catch(() => {}); setPrompt(null); }}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-amber text-[15px] font-extrabold text-navy-900"
      >
        <Download size={20} aria-hidden /> Install UniDesk
      </button>
    );
  }
  if (ios) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 text-sm text-muted">
        <Share size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden />
        <p>To install UniDesk, tap <b className="text-ink">Share</b> then <b className="text-ink">Add to Home Screen</b>.</p>
      </div>
    );
  }
  return null;
}
