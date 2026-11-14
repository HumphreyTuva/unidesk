// Letters students must send to the Registrar. Each one is built from a few answers, in the layout the Registrar expects
// (the same layout as the call-off letter). Used by components/LetterForm.tsx.
export type LetterKind = 'resume' | 'missed' | 'id';

export type FieldDef = {
  id: string;
  label: string;
  type: 'text' | 'tel' | 'email' | 'select' | 'textarea' | 'year' | 'check';
  options?: [string, string][]; // [value, label] for select
  placeholder?: string;
  optional?: boolean;
  hint?: string;
  half?: boolean; // sits beside the next field on one row
};
export type LetterSpec = { intro: string; fields: FieldDef[]; lines: (v: Record<string, string>, date: string) => string[]; submit: string };

export const REGISTRAR_ADDRESS = ['THE REGISTRAR (ACADEMIC)', 'KENYATTA UNIVERSITY', 'P.O. BOX 43844-00100', 'NAIROBI, KENYA'];

export const today = () => new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' });

// Academic year helper: typing 2026 fills in 2026/2027. Deleting does not refill, so it can still be edited.
export function formatYear(raw: string, before: string) {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  const hadDigits = before.replace(/\D/g, '').length;
  if (d.length === 4 && hadDigits < 4) return `${d}/${Number(d) + 1}`;
  return d.length > 4 ? `${d.slice(0, 4)}/${d.slice(4)}` : d;
}

const t = (s: string | undefined) => (s ?? '').trim();
const noDot = (s: string | undefined) => t(s).replace(/[.\s]+$/, '');
const SEMESTERS: [string, string][] = [['ONE', 'One'], ['TWO', 'Two'], ['THREE', 'Three']];

const PERSON: FieldDef[] = [
  { id: 'name', label: 'Full name', type: 'text' },
  { id: 'adm', label: 'Admission number', type: 'text' },
  { id: 'phone', label: 'Phone number', type: 'tel' },
  { id: 'email', label: 'Email', type: 'email', optional: true, hint: 'optional' },
  { id: 'school', label: 'School', type: 'text', placeholder: 'e.g. Pure and Applied Sciences' },
  { id: 'course', label: 'Course', type: 'text', placeholder: 'e.g. BSc Computer Science' },
];

// Details top left, the date, and who it is addressed to. `through` adds "THROUGH:" offices (used for the ID letter).
const head = (v: Record<string, string>, date: string, through: string[][] = []) => [
  `NAME: ${t(v.name)}`,
  `ADM NO: ${t(v.adm).toUpperCase()}`,
  ...(t(v.email) ? [`EMAIL: ${t(v.email)}`] : []),
  `PHONE NUMBER: ${t(v.phone)}`,
  `DATE: ${date}`,
  '',
  'TO:',
  ...REGISTRAR_ADDRESS,
  ...through.flatMap(office => ['', 'THROUGH:', ...office]),
  '',
];
const intro = (v: Record<string, string>) => `I, ${t(v.name)}, of Admission Number ${t(v.adm).toUpperCase()}, a student in the School of ${t(v.school)}, taking ${t(v.course)} course`;
const sign = (v: Record<string, string>) => ['', 'Yours faithfully,', '', t(v.name), `Phone: ${t(v.phone)}`];

export const LETTERS: Record<LetterKind, LetterSpec> = {
  resume: {
    intro: 'Fill this in and we will write your letter to the Registrar asking to resume your studies.',
    fields: [
      ...PERSON,
      { id: 'calledOff', label: 'Semester you called off', type: 'text', placeholder: 'e.g. Semester One 2025/2026' },
      { id: 'sem', label: 'Return in semester', type: 'select', options: SEMESTERS, half: true },
      { id: 'year', label: 'Academic year', type: 'year', half: true },
    ],
    lines: (v, date) => [
      ...head(v, date),
      `REF: REQUEST TO RESUME STUDIES IN SEMESTER ${t(v.sem)} OF ACADEMIC YEAR ${t(v.year)}`,
      '',
      `${intro(v)}, called off my studies in ${noDot(v.calledOff)}.`,
      '',
      `I hereby request permission to resume my studies in semester ${t(v.sem).toLowerCase()} of academic year ${t(v.year)}.`,
      ...sign(v),
    ],
    submit: 'Sign the printed letter and take it to the Admissions/Academic office (Central Admin, Room 112) before the semester you want to rejoin. If you are not on campus, email it to registrar-acad@ku.ac.ke. Do not go back to class until you get official approval.',
  },
  missed: {
    intro: 'Fill this in and we will write your letter to the Registrar asking for a special examination or incomplete results. Attach your evidence when you submit it.',
    fields: [
      ...PERSON,
      { id: 'kind', label: 'What are you asking for?', type: 'select', options: [['special', 'Special examination (missed all papers)'], ['incomplete', 'Incomplete results (missed some papers)']] },
      { id: 'sem', label: 'Semester', type: 'select', options: SEMESTERS, half: true },
      { id: 'year', label: 'Academic year', type: 'year', half: true },
      { id: 'units', label: 'Units you missed', type: 'text', optional: true, hint: 'optional', placeholder: 'e.g. SMA 101, SMA 202' },
      { id: 'reason', label: 'Why you missed them', type: 'textarea', placeholder: 'Explain clearly, in your own words' },
      { id: 'evidence', label: 'Evidence you are attaching', type: 'text', placeholder: 'e.g. hospital discharge summary' },
      { id: 'eligible', label: 'I have completed all my CATs, assignments and required practicals', type: 'check' },
    ],
    lines: (v, date) => {
      const special = v.kind !== 'incomplete';
      return [
        ...head(v, date),
        `REF: REQUEST FOR ${special ? 'SPECIAL EXAMINATION' : 'CONSIDERATION FOR INCOMPLETE RESULTS'}, SEMESTER ${t(v.sem)} OF ACADEMIC YEAR ${t(v.year)}`,
        '',
        `${intro(v)}, hereby request for ${special ? 'a special examination' : 'consideration for incomplete results'} for semester ${t(v.sem).toLowerCase()} of academic year ${t(v.year)}.`,
        '',
        `I was unable to ${special ? 'sit for my examinations' : 'complete all my examinations'} because ${noDot(v.reason)}.${t(v.units) ? ` The units I missed are ${noDot(v.units)}.` : ''}`,
        '',
        'I have completed all my Continuous Assessment Tests (CATs), submitted all my assignments and completed all the required practicals.',
        '',
        `I have attached ${noDot(v.evidence)} as evidence in support of my request.`,
        ...sign(v),
      ];
    },
    submit: 'Sign the printed letter, attach your evidence, and take them to the Old Administration Block, Room 12 (Ground Floor).',
  },
  id: {
    intro: 'Fill this in and we will write your letter to the Registrar asking for a new student ID, addressed through Student Affairs and Security Services.',
    fields: [
      ...PERSON,
      { id: 'state', label: 'What happened to your ID?', type: 'select', options: [['lost', 'Lost'], ['expired', 'Expired'], ['defaced', 'Defaced (damaged)']] },
    ],
    lines: (v, date) => [
      ...head(v, date, [['THE DIRECTOR, STUDENT AFFAIRS', 'KENYATTA UNIVERSITY'], ['THE DIRECTOR, SECURITY SERVICES', 'KENYATTA UNIVERSITY']]),
      'REF: REQUEST FOR REPLACEMENT OF STUDENT IDENTIFICATION CARD',
      '',
      `${intro(v)}, hereby request for replacement of my student identification card, which is ${v.state === 'expired' ? 'expired' : v.state === 'defaced' ? 'defaced' : 'lost'}.`,
      ...sign(v),
    ],
    submit: 'Sign the printed letter. Next you need the Finance receipt or ledger and the stamps from Student Affairs and Security. See the Steps tab for the order.',
  },
};
