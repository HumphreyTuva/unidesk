// Which class reminders are due right now. Pure functions, so they are easy to test.
// East Africa Time is UTC+3 all year (no daylight saving), so we shift the clock by three hours and read it as UTC.

export type ReminderClass = { key: string; code: string; day: string; start: number; end: number; venue: string | null; online: boolean; note: string };
export type Due = { cls: ReminderClass; minsLeft: number; dateKey: string };

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const toEat = (d: Date) => new Date(d.getTime() + 3 * 3600_000);
export const eatDateKey = (d: Date) => toEat(d).toISOString().slice(0, 10);
export const classKey = (c: { code: string; day: string; start: number }) => `${c.code}|${c.day}|${c.start}`;

// A reminder is due from (start - minsBefore) until the class starts. If the server was briefly asleep we still send
// it, but never more than `lateMins` after it should have gone out, so nobody gets a reminder for a class long gone.
export function dueNow(classes: ReminderClass[], minsBefore: number, now: Date, lateMins = 10): Due[] {
  const eat = toEat(now);
  const day = DAYS[(eat.getUTCDay() + 6) % 7];
  const nowMin = eat.getUTCHours() * 60 + eat.getUTCMinutes();
  const dateKey = eat.toISOString().slice(0, 10);
  const out: Due[] = [];
  for (const c of classes) {
    if (c.day !== day) continue;
    const startMin = Math.round(c.start * 60);
    const trigger = startMin - minsBefore;
    if (nowMin >= trigger && nowMin < startMin && nowMin - trigger <= lateMins) out.push({ cls: c, minsLeft: startMin - nowMin, dateKey });
  }
  return out;
}

const clock = (h: number) => {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
};

export function payloadFor(d: Due) {
  const c = d.cls;
  const where = c.online ? 'Online' : c.venue || '';
  const first = [`${clock(c.start)} to ${clock(c.end)}`, where].filter(Boolean).join(' · ');
  return {
    title: `${c.code} starts in ${d.minsLeft} min`,
    body: c.note ? `${first}\n${c.note}` : first,
    url: '/guide/timetable',
    tag: `class-${c.key}-${d.dateKey}`,
  };
}
