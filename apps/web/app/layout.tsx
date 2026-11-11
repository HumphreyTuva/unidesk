import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import AppShell from '@/components/AppShell';
import PwaRegister from '@/components/PwaRegister';
import OfflineBanner from '@/components/OfflineBanner';
import { ToastProvider } from '@/lib/toast';
import JsonLd from '@/components/JsonLd';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', weight: ['400', '500', '600', '700', '800'] });

const DESCRIPTION = 'Kenyatta University past papers you can read online, class and exam timetables, venue directions, KU office locations and a student guide. Made for KU students.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'UniDesk: KU Past Papers, Timetables and Student Guide', template: '%s | UniDesk' },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['Kenyatta University past papers', 'KU past papers', 'KU exam timetable', 'KU class timetable', 'KU student guide', 'call off semester KU', 'KU offices', 'Kenyatta University venues'],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  category: 'education',
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/favicon.ico' }, { url: '/icons/favicon-32.png', sizes: '32x32' }], apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'UniDesk', statusBarStyle: 'default' },
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_KE', url: '/', title: 'UniDesk: Kenyatta University Past Papers, Timetables and Student Guide', description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: 'UniDesk: Kenyatta University Past Papers and Student Guide', description: DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  // Search Console and Bing Webmaster tags: set these on Vercel (see README) and they appear automatically.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
  },
};

// Who we are, in a form search engines and AI assistants can read.
const SITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icons/icon-512.png`, description: DESCRIPTION },
    {
      '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: DESCRIPTION, inLanguage: 'en-KE', publisher: { '@id': `${SITE_URL}/#org` },
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/papers?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
    },
    {
      '@type': 'WebApplication', '@id': `${SITE_URL}/#app`, name: SITE_NAME, url: SITE_URL, applicationCategory: 'EducationalApplication', operatingSystem: 'Any (web, installable)',
      audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'Kenyatta University students' }, inLanguage: 'en-KE', publisher: { '@id': `${SITE_URL}/#org` },
    },
  ],
};

export const viewport: Viewport = {
  themeColor: '#0B1F4D',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE" className={jakarta.variable}>
      <body className="font-sans antialiased">
        <JsonLd data={SITE_JSON_LD} />
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
