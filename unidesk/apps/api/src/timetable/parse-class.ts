// Class (teaching) timetable parser. A faithful port of Ratiba's parser.py: the university's master sheet has one block per
// programme, a time header row, then a block of rows per day. Each unit sits in a time column with its venue in the next column.
import { buildGrid } from './html-table';

export type RawClassSession = {
  programme: string;
  day: string;
  code: string;
  startHour: number;
  endHour: number;
  venue: string;
  elearning: boolean;
  rawLabel: string;
};

export type ParseReport = {
  sessions: number;
  units: number;
  programmes?: number;
  elearning?: number;
  noVenue?: number;
  firstDate?: string;
  lastDate?: string;
  examDays?: number;
  headings: string[];
  warnings: string[];
  // Cells the parser could not read as a unit, grouped by text so a banner repeated across a row shows once, with a count.
  unreadable: { row: number; text: string; count: number }[];
};

// Collects unreadable cells grouped by their text. Keeps the first row each was seen on and caps the list.
export class UnreadableCollector {
  private map = new Map<string, { row: number; text: string; count: number }>();
  add(row: number, text: string) {
    // Banners and page labels repeated across a row ("TIMETABLING & UNIT SCHEDULING", "PAGE 2") are not missing data.
    if ((/\s/.test(text) && text.length > 12) || /^page\s*\d+$/i.test(text.trim())) return;
    const t = text.slice(0, 40);
    const hit = this.map.get(t);
    if (hit) hit.count++;
    else if (this.map.size < 15) this.map.set(t, { row: row + 1, text: t, count: 1 }); // +1: sheet rows start at 1
  }
  list() { return [...this.map.values()].sort((a, b) => b.count - a.count || a.row - b.row); }
}

const DAYS = new Set(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
const TIME_PAT = /\d{1,2}([-–]\d{1,2})?\s*(AM|PM)/i;
const PROGRAMME_PAT = /PROGRAMME/i;
const CODE_PAT = /^([A-Z]{2,4}\d{2,4})\b/;
const ELEARN_PAT = /\(\s*e\s*\)/i;
const FIRST_HOUR_PAT = /^(\d{1,2})\s*[-–]?\s*\d{0,2}\s*(AM|PM)/i;

const firstHour = (label: string): number | null => {
  const m = label.trim().match(FIRST_HOUR_PAT);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const pm = m[2].toUpperCase() === 'PM';
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return h;
};

// "PROGRAMME:  BSC(BIOTECH NOLOGY) - Y1 S1" -> "BSC(BIOTECH NOLOGY) - Y1 S1"
const cleanProgramme = (s: string) => s.replace(/^\s*PROGRAMME\s*:?\s*/i, '').replace(/\s+/g, ' ').trim();

export function parseClassTimetable(html: string): { sessions: RawClassSession[]; report: ParseReport } {
  const grid = buildGrid(html);
  const sessions: RawClassSession[] = [];
  const unreadable = new UnreadableCollector();
  const programmes = new Set<string>();
  const headings: string[] = [];

  let programme: string | null = null;
  let day: string | null = null;
  let codeColumns: number[] = [];
  let hourForCol = new Map<number, number>();

  grid.forEach((row, rowIndex) => {
    if (!row.length) return;

    // Title lines at the top of the sheet, shown to the admin so they can see what was uploaded.
    if (!programme && headings.length < 4) {
      const t = row.find(c => c && c.length > 8 && !PROGRAMME_PAT.test(c));
      if (t && !headings.includes(t)) headings.push(t);
    }

    // A new programme block resets everything below it.
    const pCell = row.find(c => c && PROGRAMME_PAT.test(c));
    if (pCell) {
      programme = cleanProgramme(pCell);
      programmes.add(programme);
      day = null;
      codeColumns = [];
      hourForCol = new Map();
      return;
    }

    // Time header row: many cells that look like a time.
    const timeCols = row.map((c, j) => (c && TIME_PAT.test(c) ? j : -1)).filter(j => j >= 0);
    if (timeCols.length >= 6) {
      codeColumns = timeCols;
      const first = firstHour(row[timeCols[0]]);
      if (first !== null) hourForCol = new Map(timeCols.map((col, i) => [col, first + i] as [number, number]));
      return;
    }

    // Day marker. The grid already repeats it on every row of its block.
    if (row.length > 1 && DAYS.has(row[1].trim().toUpperCase())) {
      const d = row[1].trim().toLowerCase();
      day = d.charAt(0).toUpperCase() + d.slice(1);
    }
    if (!(programme && day && codeColumns.length)) return;

    // Scan this row's time columns. Consecutive columns repeating the same cell are one multi-hour session.
    let j = 0;
    while (j < codeColumns.length) {
      const col = codeColumns[j];
      const cell = (row[col] ?? '').trim();
      const m = cell.match(CODE_PAT);
      if (!m) {
        if (cell && !/^\d+$/.test(cell)) unreadable.add(rowIndex, cell);
        j++;
        continue;
      }
      const code = m[1];
      let venue = (row[col + 1] ?? '').trim();
      const elearning = ELEARN_PAT.test(cell) || ELEARN_PAT.test(venue);
      if (ELEARN_PAT.test(venue)) venue = '';

      let span = 1;
      let k = j + 1;
      while (k < codeColumns.length && (row[codeColumns[k]] ?? '').trim() === cell) { span++; k++; }

      const startHour = hourForCol.get(col);
      if (startHour !== undefined) {
        sessions.push({ programme, day, code, startHour, endHour: startHour + span, venue, elearning, rawLabel: cell });
      }
      j = k > j ? k : j + 1;
    }
  });

  const report: ParseReport = {
    sessions: sessions.length,
    units: new Set(sessions.map(s => s.code)).size,
    programmes: programmes.size,
    elearning: sessions.filter(s => s.elearning).length,
    noVenue: sessions.filter(s => !s.venue && !s.elearning).length,
    headings,
    warnings: [],
    unreadable: unreadable.list(),
  };
  if (!sessions.length) report.warnings.push('No classes were found. This does not look like the class (teaching) timetable.');
  return { sessions, report };
}
