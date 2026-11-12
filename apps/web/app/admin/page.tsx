'use client';
import Link from 'next/link';
import { CalendarDays, FileText, LayoutGrid, ChevronRight, Inbox, Link2, MapPin, MessageCircle, Upload, Users, Wallet } from 'lucide-react';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import { useAuth } from '@/lib/auth';

// Reached with Ctrl+Shift+A on a computer or by tapping the logo three times on a phone.
// This page only decides what to show: every admin action is checked again on the server by role.
const TOOLS = [
  { href: '/admin/chat', title: 'Support inbox', sub: 'Reply to students', Icon: MessageCircle, support: true },
  { href: '/admin/papers', title: 'Upload a paper', sub: 'Add a PDF to the library', Icon: Upload },
  { href: '/admin/papers/manage', title: 'Manage papers', sub: 'Edit, hide, replace or delete past papers', Icon: FileText },
  { href: '/admin/requests', title: 'Paper requests', sub: 'What students are asking for', Icon: Inbox, support: true },
  { href: '/admin/users', title: 'Users', sub: 'Signups, activity, roles and blocking', Icon: Users },
  { href: '/admin/payments', title: 'Payments', sub: 'Switch on or off, set the price, see money in', Icon: Wallet },
  { href: '/admin/timetables', title: 'Timetables', sub: 'Upload and publish class and exam sheets', Icon: CalendarDays },
  { href: '/admin/campus', title: 'Campus', sub: 'Check ads and approve clubs', Icon: LayoutGrid },
  { href: '/admin/venues', title: 'Venues', sub: 'Buildings, room codes, map pins and photos', Icon: MapPin },
  { href: '/admin/links', title: 'Quick links', sub: 'Official shortcuts shown in the Guide', Icon: Link2 },
];

export default function Admin() {
  const ok = useRequireAdmin(['ADMIN', 'SUPPORT']);
  const { user } = useAuth();
  if (!ok) return null;

  return (
    <main className="wide px-5 pt-[calc(32px+env(safe-area-inset-top))]">
      <h1 className="text-2xl font-extrabold">Admin</h1>
      <p className="mt-1 text-sm text-muted">Signed in as {user?.email || user?.username}</p>

      <div className="cols-lg mt-6 flex flex-col gap-2.5">
        {TOOLS.filter(t => user?.role === 'ADMIN' || ('support' in t && t.support)).map(({ href, title, sub, Icon }) => (
          <Link key={href} href={href} className="flex h-[68px] items-center gap-3.5 rounded-[18px] border-[1.5px] border-line bg-white px-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon size={22} aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">{title}</span>
              <span className="block text-[13px] text-muted">{sub}</span>
            </span>
            <ChevronRight size={20} className="text-muted" aria-hidden />
          </Link>
        ))}
        <p className="mt-2 rounded-2xl border-[1.5px] border-dashed border-edge p-4 text-sm text-muted">Chat is added in the next steps.</p>
      </div>

      <Link href="/" className="mt-6 flex h-12 items-center justify-center rounded-2xl border-[1.5px] border-edge bg-white font-bold">Back to the app</Link>
    </main>
  );
}
