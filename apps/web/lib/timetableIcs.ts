// Builds a calendar file (.ics) from a student's weekly class timetable.
// Each class becomes one weekly event for a set number of weeks, with an optional
// reminder before it starts and the student's own note in the description.
// Opened on a phone, the calendar app imports it and rings the reminder itself,
// even when UniDesk is closed or the phone is offline.

export type IcsClass = { code: string; day: string; startHour: number; endHour: number; venue: string | null; elearning: boolean; note?: string };
export type IcsOptions = { remindMins: number | null; weeks: number; now?: Date };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const p2 = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`;
const local = (y: number, m: number, d: number, hour: number) => {
  const h = Math.floor(hour), min = Math.round((hour - h) * 60);
  return `${y}${p2(m)}${p2(d)}T${p2(h)}${p2(min)}00`;
};
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Lines may not be longer than 75 bytes; continue on the next line with a leading space.
const fold = (line: string) => {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '', bytes = 0, limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) { out.push(cur); cur = ''; bytes = 0; limit = 74; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
};

export const REMIND_CHOICES = [15, 30, 60];
export const WEEK_CHOICES = [8, 10, 12];

export function buildIcs(rows: IcsClass[], opts: IcsOptions): string {
  const now = opts.now ?? new Date();
  const weeks = Math.max(1, Math.min(30, Math.round(opts.weeks)));
  const todayIdx = (now.getDay() + 6) % 7; // Monday = 0
  const L: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UniDesk//Class timetable//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:My classes (UniDesk)', 'X-WR-TIMEZONE:Africa/Nairobi',
    'BEGIN:VTIMEZONE', 'TZID:Africa/Nairobi', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0300', 'TZOFFSETTO:+0300', 'TZNAME:EAT', 'END:STANDARD', 'END:VTIMEZONE',
  ];
  for (const r of rows) {
    const target = DAYS.indexOf(r.day);
    if (target < 0 || !(r.endHour > r.startHour)) continue;
    // First lesson: today if it has not finished, otherwise the next one.
    let ahead = (target - todayIdx + 7) % 7;
    if (ahead === 0) {
      const endsAt = new Date(now); endsAt.setHours(Math.floor(r.endHour), Math.round((r.endHour % 1) * 60), 0, 0);
      if (endsAt.getTime() <= now.getTime()) ahead = 7;
    }
    const first = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead);
    const [y, m, d] = [first.getFullYear(), first.getMonth() + 1, first.getDate()];
    const lines: string[] = [];
    if (r.note?.trim()) lines.push(`My note: ${r.note.trim()}`);
    lines.push('Made with UniDesk (unidesk.co.ke). Confirm changes on the official notice.');
    L.push(
      'BEGIN:VEVENT',
      `UID:unidesk-${r.code.replace(/[^A-Za-z0-9]/g, '')}-${r.day}-${r.startHour}@unidesk.co.ke`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;TZID=Africa/Nairobi:${local(y, m, d, r.startHour)}`,
      `DTEND;TZID=Africa/Nairobi:${local(y, m, d, r.endHour)}`,
      `RRULE:FREQ=WEEKLY;COUNT=${weeks}`,
      `SUMMARY:${esc(`${r.code} class`)}`,
      `LOCATION:${esc(r.elearning ? 'Online (e-learning)' : r.venue ?? '')}`,
      `DESCRIPTION:${esc(lines.join('\n'))}`,
    );
    if (opts.remindMins && opts.remindMins > 0) {
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`${r.code} starts in ${opts.remindMins} minutes${r.note?.trim() ? `. ${r.note.trim()}` : ''}`)}`, `TRIGGER:-PT${Math.round(opts.remindMins)}M`, 'END:VALARM');
    }
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}
