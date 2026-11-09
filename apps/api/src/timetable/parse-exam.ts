// Exam timetable parser. The sheet is laid out by date: a block of rows per day, a header row naming the time slots, and for
// each slot three columns: unit code, number of students, venue (one exam can use several rooms, e.g. "M2,M1").
import { buildGrid } from './html-table';
import { UnreadableCollector } from './parse-class';
import type { ParseReport } from './parse-class';

export type RawExamSession = {
  code: string;
  date: string; // YYYY-MM-DD
  slot: string; // "8:00 AM - 10:00 AM"
  startMin: number; // minutes after midnight, for sorting and clash checks
  endMin: number;
  students: number | null;
  venues: string[];
  rawLabel: string;
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
// "MON. 9TH FEB 2026", "TUES.10TH FEB 2026", "FRI.13TH FEB  2026" (the sheet is inconsistent about dots and spaces)
const DATE_RE = /^(MON|TUE|WED|THU|FRI|SAT|SUN)[A-Z]*\.?\s*(\d{1,2})\s*(?:ST|ND|RD|TH)?\s+([A-Z]{3,9})\.?\s+(\d{4})$/i;
// Strict on purpose: a title like "ACADEMIC YEAR 2025-2026" must not be mistaken for a time slot.
const SLOT_RE = /^(\d{1,2})(?:[.:](\d{2}))?\s*-\s*(\d{1,2})(?:[.:](\d{2}))?\s*(?:(A|P)\.?\s?M\.?)?$/i;
const CODE_RE = /^([A-Z]{2,4})\s?(\d{2,4}[A-Z]?)\b/;

export function parseExamDate(text: string): string | null {
  const m = text.trim().match(DATE_RE);
  if (!m) return null;
  const day = parseInt(m[2], 10), year = parseInt(m[4], 10);
  const month = MONTHS.indexOf(m[3].slice(0, 3).toUpperCase());
  if (month < 0) return null;
  const d = new Date(Date.UTC(year, month, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month || d.getUTCDate() !== day) return null; // e.g. 31 FEB
  return d.toISOString().slice(0, 10);
}

const fmt = (min: number) => {
  const h24 = Math.floor(min / 60), mm = min % 60, h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`;
};

// "8-10 A.M" -> 8:00-10:00 AM, "11-1 P.M" -> 11:00 AM-1:00 PM, "4.30-6.30" -> 4:30-6:30 PM.
// The am/pm in the sheet belongs to the END time, so "11-1 P.M" starts in the morning.
export function parseSlot(text: string): { slot: string; startMin: number; endMin: number } | null {
  const m = text.trim().match(SLOT_RE);
  if (!m) return null;
  const sh = parseInt(m[1], 10), sm = m[2] ? parseInt(m[2], 10) : 0;
  const eh = parseInt(m[3], 10), em = m[4] ? parseInt(m[4], 10) : 0;
  if (sh > 12 || eh > 12 || sm > 59 || em > 59 || sh === 0 || eh === 0) return null;
  const meridiem = m[5]?.toUpperCase();
  let start24: number, end24: number;
  if (meridiem === 'P') {
    end24 = (eh % 12) + 12;
    start24 = sh % 12 > eh % 12 ? sh % 12 : (sh % 12) + 12; // "11-1 PM": 11 is before noon
  } else if (meridiem === 'A') {
    end24 = eh % 12 === 0 ? 12 : eh % 12;
    start24 = sh % 12;
    if (eh === 12) end24 = 12;
  } else {
    // No am/pm given: school hours, so 7 to 11 is morning and 12 to 6 is afternoon.
    const pm = sh < 7 || sh === 12;
    start24 = sh % 12 + (pm ? 12 : 0);
    end24 = eh % 12 + (eh < 7 || eh === 12 || (pm && eh <= sh) ? 12 : 0);
  }
  const startMin = start24 * 60 + sm, endMin = end24 * 60 + em;
  if (endMin <= startMin) return null;
  return { slot: `${fmt(startMin)} - ${fmt(endMin)}`, startMin, endMin };
}

export const parseVenues = (raw: string): string[] =>
  [...new Set(raw.split(/[,/&+]|\band\b/i).map(v => v.trim().toUpperCase()).filter(Boolean))];

export function parseExamTimetable(html: string): { sessions: RawExamSession[]; report: ParseReport } {
  const grid = buildGrid(html);
  const sessions: RawExamSession[] = [];
  const unreadable = new UnreadableCollector();
  const headings: string[] = [];
  const dates: string[] = [];

  let date: string | null = null;
  let slots: { col: number; slot: string; startMin: number; endMin: number }[] = [];

  grid.forEach((row, i) => {
    // Title lines above the first day, so the admin can see what was uploaded (e.g. "Certificate and diploma courses").
    if (!date && headings.length < 5) {
      const t = row.find(c => c && c.length > 8 && !parseSlot(c));
      if (t && !headings.includes(t)) headings.push(t);
    }

    // The slot header row. It sometimes sits above the date and sometimes on the same row as it.
    const found = row.map((c, j) => ({ j, s: c ? parseSlot(c) : null })).filter(x => x.s) as { j: number; s: NonNullable<ReturnType<typeof parseSlot>> }[];
    // A full header (3+ labels) defines the slot columns. A partial one (the last day of the real sheet only labels two of its
    // four slots) updates those columns and keeps the rest, because exams still sit in the unlabelled slots.
    const isHeader = found.length >= 2;
    if (found.length >= 3) slots = found.map(x => ({ col: x.j, ...x.s }));
    else if (isHeader) {
      for (const x of found) slots = [...slots.filter(s => s.col !== x.j), { col: x.j, ...x.s }];
      slots.sort((a, b) => a.col - b.col);
    }

    const dateCell = row.find(c => c && DATE_RE.test(c.trim()));
    if (dateCell) {
      const d = parseExamDate(dateCell);
      if (d) { date = d; if (!dates.includes(d)) dates.push(d); }
    }
    if (isHeader || !date || !slots.length) return;

    for (const s of slots) {
      const cell = (row[s.col] ?? '').trim();
      if (!cell) continue;
      const m = cell.match(CODE_RE);
      if (!m) { unreadable.add(i, cell); continue; }
      const studentsRaw = (row[s.col + 1] ?? '').trim();
      sessions.push({
        code: m[1].toUpperCase() + m[2].toUpperCase(),
        date,
        slot: s.slot,
        startMin: s.startMin,
        endMin: s.endMin,
        students: /^\d+$/.test(studentsRaw) ? parseInt(studentsRaw, 10) : null,
        venues: parseVenues(row[s.col + 2] ?? ''),
        rawLabel: cell,
      });
    }
  });

  const daysWithExams = new Set(sessions.map(s => s.date));
  const warnings: string[] = [];
  if (!sessions.length) warnings.push('No exams were found. This does not look like the exam timetable.');
  for (const d of dates) if (!daysWithExams.has(d)) warnings.push(`No exams were read for ${d}.`);
  const noVenue = sessions.filter(s => !s.venues.length).length;
  if (noVenue) warnings.push(`${noVenue} exams have no venue listed.`);

  const sorted = [...dates].sort();
  return {
    sessions,
    report: {
      sessions: sessions.length,
      units: new Set(sessions.map(s => s.code)).size,
      examDays: daysWithExams.size,
      firstDate: sorted[0],
      lastDate: sorted[sorted.length - 1],
      noVenue,
      headings,
      warnings,
      unreadable: unreadable.list(),
    },
  };
}
