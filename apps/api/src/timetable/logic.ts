// Pure scheduling logic, ported from Ratiba's logic.py (no database here, so it can be tested on its own).
export type ClassRow = { id: string; programme: string; code: string; day: string; startHour: number; endHour: number; venue: string | null; elearning: boolean };
export type ExamRow = { id: string; code: string; date: string; slot: string; startMin: number; endMin: number; students: number | null; venues: string[] };

export const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function generateClasses(rows: ClassRow[], choices: Record<string, string> = {}) {
  const groups = new Map<string, ClassRow[]>();
  for (const r of rows) {
    const k = `${r.code}|${r.day}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const resolved: ClassRow[] = [];
  const ambiguous: { key: string; code: string; day: string; options: ClassRow[] }[] = [];
  for (const [key, options] of groups) {
    const sorted = [...options].sort((a, b) => a.startHour - b.startHour);
    // Genuinely different sessions (different start time), not one class listed under two programmes.
    if (new Set(sorted.map(o => o.startHour)).size > 1) {
      const chosen = sorted.find(o => o.id === choices[key]) ?? sorted[0];
      // Show each distinct time once.
      const seen = new Set<number>();
      const distinct = sorted.filter(o => (seen.has(o.startHour) ? false : (seen.add(o.startHour), true)));
      ambiguous.push({ key, code: sorted[0].code, day: sorted[0].day, options: distinct });
      resolved.push(chosen);
    } else resolved.push(sorted[0]);
  }
  resolved.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.startHour - b.startHour || a.code.localeCompare(b.code));

  // Two in-person classes at the same time clash. E-learning never does.
  const clashes: { day: string; a: ClassRow; b: ClassRow }[] = [];
  for (let i = 0; i < resolved.length; i++)
    for (let j = i + 1; j < resolved.length; j++) {
      const a = resolved[i], b = resolved[j];
      if (a.day !== b.day || a.code === b.code || a.elearning || b.elearning) continue;
      if (a.startHour < b.endHour && b.startHour < a.endHour) clashes.push({ day: a.day, a, b });
    }
  return { resolved, ambiguous, clashes };
}

export function listExams(rows: ExamRow[]) {
  const exams = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin || a.code.localeCompare(b.code));
  // Two different units at overlapping times on one date. The same unit listed twice is not a clash.
  const clashes: { date: string; a: ExamRow; b: ExamRow }[] = [];
  for (let i = 0; i < exams.length; i++)
    for (let j = i + 1; j < exams.length; j++) {
      const a = exams[i], b = exams[j];
      if (a.date !== b.date || a.code === b.code) continue;
      if (a.startMin < b.endMin && b.startMin < a.endMin) clashes.push({ date: a.date, a, b });
    }
  return { exams, clashes };
}
