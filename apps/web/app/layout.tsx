import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import AppShell from '@/components/AppShell';
import PwaRegister from '@/components/PwaRegister';
import OfflineBanner from '@/components/OfflineBanner';
import { ToastProvider } from '@/lib/toast';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'UniDesk',
  description: 'UniDesk: past papers, guidance, timetables and campus help for Kenyatta University students.',
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/favicon.ico' }, { url: '/icons/favicon-32.png', sizes: '32x32' }], apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'UniDesk', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#0B1F4D',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans antialiased">
        <PwaRegister />
        <AuthProvider>
          <ToastProvider>
            <OfflineBanner />
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
