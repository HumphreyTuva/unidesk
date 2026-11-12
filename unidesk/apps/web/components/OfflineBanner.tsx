'use client';
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

// Tells people straight away when the phone has no internet, instead of leaving buttons that seem broken.
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync); window.addEventListener('offline', sync);
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
  }, []);
  if (!offline) return null;
  return <div role="alert" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-[#0E1B33] px-4 py-2 pt-[calc(8px+env(safe-area-inset-top))] text-[13px] font-semibold text-white"><WifiOff size={16} aria-hidden /> No internet. Some things will not work until you are back online.</div>;
}
