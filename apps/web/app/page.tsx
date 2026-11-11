import Link from 'next/link';
import { CalendarDays, ChevronRight, ClipboardList, FileText, MapPin, Plus, Search, Sparkles } from 'lucide-react';
import HomeHeader from '@/components/HomeHeader';
import InstallButton from '@/components/InstallButton';
import FaqList from '@/components/FaqList';
import { FAQ } from '@/content/faq';

const ACTIONS = [
  { href: '/papers?request=1', label: 'Request', Icon: Plus, tone: 'bg-brand-soft text-brand' },
  { href: '/guide/timetable', label: 'Timetable', Icon: CalendarDays, tone: 'bg-brand-soft text-brand' },
  { href: '/guide/venues', label: 'Venues', Icon: MapPin, tone: 'bg-brand-soft text-brand' },
  { href: '/chat?ai=1', label: 'Ask AI', Icon: Sparkles, tone: 'bg-amber-soft text-amber-ink' },
];

const GUIDES = [
  { href: '/guide/call-off', title: 'Call off a semester', sub: 'Steps and a ready letter', Icon: FileText },
  { href: '/guide/offices', title: 'Important KU offices', sub: 'Which office, which room', Icon: ClipboardList },
];

export default function Home() {
  return (
    <main className="wide px-5 pt-[calc(24px+env(safe-area-inset-top))]">
      <HomeHeader />
      <h1 className="sr-only">UniDesk: Kenyatta University past papers, timetables, venue directions and student guide</h1>

      <Link
        href="/papers"
        className="mt-4 flex h-[52px] items-center gap-2.5 rounded-2xl border-[1.5px] border-edge bg-white px-4 text-[15px] text-muted"
      >
        <Search size={20} className="text-brand" aria-hidden />
        Search a unit code or name
      </Link>

      {/* Hero with a small 3D stack of papers */}
      <section className="relative mt-5 h-[176px] lg:h-[220px] overflow-hidden rounded-[26px] bg-gradient-to-br from-navy-900 to-brand shadow-hero">
        <div className="absolute -right-10 -top-12 h-[170px] w-[170px] rounded-full bg-amber/20" />
        <div className="absolute right-[18px] top-[22px] h-[140px] w-[130px]" style={{ perspective: 520 }} aria-hidden>
          <div className="absolute left-6 top-[26px] h-[108px] w-[84px] rounded-[10px] bg-[#9FB4E8]" style={{ transform: 'rotateY(-28deg) rotateX(8deg) rotateZ(6deg)' }} />
          <div className="absolute left-3.5 top-3.5 h-[108px] w-[84px] rounded-[10px] bg-[#DCE4F7]" style={{ transform: 'rotateY(-28deg) rotateX(8deg) rotateZ(2deg)' }} />
          <div
            className="absolute left-1 top-0.5 flex h-[108px] w-[84px] flex-col gap-[7px] rounded-[10px] bg-white px-3 py-3.5 shadow-[10px_14px_24px_rgba(5,14,40,0.4)]"
            style={{ transform: 'rotateY(-28deg) rotateX(8deg) rotateZ(-3deg)' }}
          >
            <div className="h-2 w-3/5 rounded bg-brand" />
            <div className="h-[5px] rounded bg-edge" />
            <div className="h-[5px] rounded bg-edge" />
            <div className="h-[5px] w-[70%] rounded bg-edge" />
            <div className="mt-1.5 h-[18px] w-10 rounded-full bg-amber" />
          </div>
        </div>
        <div className="absolute left-5 top-[22px] flex w-[190px] flex-col gap-2">
          <h2 className="text-[22px] font-extrabold leading-tight text-white">Past papers</h2>
          <p className="text-sm leading-snug text-[#DCE4F7]">Find your unit and get it fast.</p>
          <Link href="/papers" className="mt-2 flex h-11 items-center self-start rounded-[14px] bg-amber px-5 text-[15px] font-extrabold text-navy-900">
            Browse papers
          </Link>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-[22px] grid grid-cols-4 gap-2.5 lg:gap-4">
        {ACTIONS.map(({ href, label, Icon, tone }) => (
          <Link key={label} href={href} className="flex h-[92px] lg:h-[110px] flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-line bg-white">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon size={22} aria-hidden />
            </span>
            <span className="text-xs font-bold">{label}</span>
          </Link>
        ))}
      </section>

      {/* Guidance */}
      <section className="mt-[22px]">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold">Student guidance</h2>
          <Link href="/guide" className="text-sm font-bold text-brand">See all</Link>
        </div>
        <div className="cols-lg mt-3 flex flex-col gap-2.5">
          {GUIDES.map(({ href, title, sub, Icon }) => (
            <Link key={href} href={href} className="flex h-16 items-center gap-3.5 rounded-[18px] border-[1.5px] border-line bg-white px-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon size={22} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{title}</span>
                <span className="block text-[13px] text-muted">{sub}</span>
              </span>
              <ChevronRight size={20} className="text-muted" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      {/* Quick answers: real questions with short answers, also marked up for search and AI answer engines on the FAQ page. */}
      <section className="mt-[22px]" aria-labelledby="quick-answers">
        <div className="flex items-center justify-between">
          <h2 id="quick-answers" className="text-[17px] font-extrabold">Quick answers</h2>
          <Link href="/faq" className="text-sm font-bold text-brand">All questions</Link>
        </div>
        <div className="mt-3 lg:max-w-[820px]"><FaqList items={FAQ.filter(f => /call off|Finance|find a Kenyatta|lecture hall/i.test(f.q))} /></div>
      </section>

      <p className="mt-6 text-[13px] leading-relaxed text-muted">
        UniDesk is a study hub and student help center for Kenyatta University: KU past papers you can read online, class and exam timetables, directions to lecture halls, KU offices and room numbers, and guidance on procedures like calling off a semester.
      </p>

      <div className="mt-5">
        <InstallButton />
      </div>
    </main>
  );
}
