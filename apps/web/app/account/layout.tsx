import type { Metadata } from 'next';

// Private or personal screens: useful to students, never useful in search results.
export const metadata: Metadata = { title: 'Account', robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
