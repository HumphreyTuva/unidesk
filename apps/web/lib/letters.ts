// Letters students must send to the Registrar. Each one is built from a few answers, in the layout the Registrar expects
// (the same layout as the call-off letter). Used by components/LetterForm.tsx.
export type LetterKind = 'resume' | 'missed' | 'id' | 'late' | 'latefee' | 'grace' | 'extra' | 'remark';

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
// For letters that follow the Registrar's short format: no school or course needed.
const BASIC = PERSON.filter(f => f.id !== 'school' && f.id !== 'course');

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
const sign = (v: Record<string, string>) => ['', 'Yours faithfully,', '', 'Signature: ____________________', `Name: ${t(v.name)}`, `Phone: ${t(v.phone)}`];

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
  late: {
    intro: 'Fill this in and we will write your letter to the Registrar asking to register your units late.',
    fields: [...BASIC, { id: 'reason', label: 'Why you could not register in time', type: 'textarea', placeholder: 'Explain clearly, in your own words' }],
    lines: (v, date) => [
      ...head(v, date),
      'RE: REQUEST FOR LATE UNIT REGISTRATION',
      '',
      `I kindly request approval for late unit registration for the current semester. I was unable to register my units within the stipulated period due to ${noDot(v.reason)}. I therefore request your consideration and approval to enable me to complete my registration.`,
      '',
      `Registration Number: ${t(v.adm).toUpperCase()}`,
      `Mobile Number: ${t(v.phone)}`,
      ...(t(v.email) ? [`Email Address: ${t(v.email)}`] : []),
      '',
      'Thank you for your consideration.',
      ...sign(v),
    ],
    submit: 'Sign the printed letter and take it to the Old Administration Block, Room 12. A response is normally issued within 5 working days. Once approved, go to your School or Department to register.',
  },
  latefee: {
    intro: 'Fill this in and we will write your letter to the Registrar about your fees.',
    fields: [
      ...BASIC,
      { id: 'paid', label: 'Have you already paid?', type: 'select', options: [['no', 'No, I need approval to pay late'], ['yes', 'Yes, I paid after the deadline (appeal)']] },
      { id: 'reason', label: 'Why the fees were late', type: 'textarea', placeholder: 'Explain clearly, in your own words' },
    ],
    lines: (v, date) => {
      const paid = v.paid === 'yes';
      return [
        ...head(v, date),
        paid ? 'RE: APPEAL FOR LATE FEE PAYMENT AND LIFTING OF REGISTRATION HOLD' : 'RE: REQUEST FOR LATE FEE PAYMENT',
        '',
        paid
          ? `I paid my fees for the current semester after the stipulated deadline due to ${noDot(v.reason)}. I have attached my fee payment receipt as proof of payment. I therefore request your consideration and approval to lift the registration hold, to enable me to proceed with my registration.`
          : `I kindly request approval to make my fee payment after the stipulated deadline for the current semester. I was unable to pay within the required period due to ${noDot(v.reason)}. I therefore request your consideration and approval to enable me to proceed with my academic activities.`,
        '',
        `Registration Number: ${t(v.adm).toUpperCase()}`,
        `Mobile Number: ${t(v.phone)}`,
        ...(t(v.email) ? [`Email Address: ${t(v.email)}`] : []),
        '',
        'Thank you for your consideration.',
        ...sign(v),
      ];
    },
    submit: 'Sign the printed letter (attach your fee receipt if you have already paid) and take it to the Old Administration Block, Room 12. A response is normally issued within 5 working days.',
  },
  grace: {
    intro: 'Fill this in and we will write your letter to the DVC (Academic Affairs) asking for a grace period to clear your fees.',
    fields: [
      ...PERSON,
      { id: 'dept', label: 'Department', type: 'text', placeholder: 'e.g. Mathematics' },
      { id: 'amount', label: 'Balance (Ksh)', type: 'text', placeholder: 'e.g. 25,000', half: true },
      { id: 'by', label: 'You will pay by', type: 'text', placeholder: 'e.g. Friday, 5 December 2026', half: true },
      { id: 'source', label: 'How will you pay?', type: 'select', options: [['Government funding', 'Government funding'], ['HELB', 'HELB'], ['Family payment', 'Family payment']] },
    ],
    lines: (v, date) => [
      'From:',
      t(v.name),
      `Registration No: ${t(v.adm).toUpperCase()}`,
      `School of ${t(v.school)}`,
      `Department of ${t(v.dept)}`,
      'P.O. Box 43844-00100, Nairobi',
      `Tel: ${t(v.phone)}`,
      ...(t(v.email) ? [`Email: ${t(v.email)}`] : []),
      '',
      `Date: ${date}`,
      '',
      'To:',
      'The DVC (Academic Affairs)',
      'Kenyatta University',
      'P.O. Box 43844-00100',
      'Nairobi',
      '',
      'RE: REQUEST FOR GRACE PERIOD TO CLEAR OUTSTANDING SCHOOL FEES',
      '',
      'Dear Sir/Madam,',
      '',
      'I write to request a grace period to clear my outstanding school fees for the current semester, as guided by the Administration.',
      '',
      `I am a student in the School of ${t(v.school)}, pursuing ${t(v.course)}, Registration Number ${t(v.adm).toUpperCase()}. I am registered for the units of this semester. I have attended lectures and completed my coursework, including CATs and assignments.`,
      '',
      `I expect my fees to be cleared by ${noDot(v.by)}, through ${t(v.source)}. Because of delays in the funds, I have not been able to clear the balance of Ksh. ${noDot(v.amount)} on time.`,
      '',
      'I humbly request a grace period until the date above to pay the balance in full. I also ask to be allowed to continue attending lectures, use University services and sit the coming examinations while I finish payment.',
      '',
      'I promise to clear the balance within the time stated.',
      '',
      'I will be grateful for your kind consideration.',
      '',
      'Yours faithfully,',
      '',
      '____________',
      t(v.name),
      `Registration No: ${t(v.adm).toUpperCase()}`,
      ...(t(v.email) ? [`Email: ${t(v.email)}`] : []),
    ],
    submit: 'Sign the printed letter and submit it at Central Administration, Room 112.',
  },
  extra: {
    intro: 'Fill this in and we will write your letter to the Registrar asking to register extra units or retakes.',
    fields: [
      ...BASIC,
      { id: 'units', label: 'Unit(s) you want to register', type: 'text', placeholder: 'e.g. SMA 101 (retake), SMA 202' },
      { id: 'reason', label: 'Why you need them', type: 'textarea', placeholder: 'Briefly, in your own words' },
      { id: 'gpa', label: 'My GPA is 60 or above', type: 'check' },
    ],
    lines: (v, date) => [
      ...head(v, date),
      'RE: REQUEST TO REGISTER EXTRA UNIT(S)',
      '',
      `I kindly request approval to register the following extra unit(s) this semester: ${noDot(v.units)}.`,
      '',
      `${noDot(v.reason)}. My GPA is 60 and above.`,
      '',
      `Registration Number: ${t(v.adm).toUpperCase()}`,
      `Mobile Number: ${t(v.phone)}`,
      ...(t(v.email) ? [`Email Address: ${t(v.email)}`] : []),
      '',
      'Thank you for your consideration.',
      ...sign(v),
    ],
    submit: 'Sign the printed letter and take it to the Old Administration Block, Room 12 (Ground Floor). If approved, register the units at Room 152, 844 Building.',
  },
  remark: {
    intro: 'Fill this in and we will write your letter to the Registrar applying for remarking.',
    fields: [
      ...BASIC,
      { id: 'units', label: 'Unit(s) to be remarked', type: 'text', placeholder: 'e.g. SMA 101, SMA 202' },
      { id: 'sem', label: 'Semester', type: 'select', options: SEMESTERS, half: true },
      { id: 'year', label: 'Academic year', type: 'year', half: true },
      { id: 'verified', label: 'I have verified with the department that no mark is missing', type: 'check' },
    ],
    lines: (v, date) => [
      ...head(v, date),
      'RE: APPLICATION FOR REMARKING',
      '',
      `I am not satisfied with the marks awarded to me in the following unit(s) for semester ${t(v.sem).toLowerCase()} of academic year ${t(v.year)}: ${noDot(v.units)}.`,
      '',
      'I therefore kindly apply for remarking of the unit(s) above, and I will pay the required remarking fee.',
      '',
      `Registration Number: ${t(v.adm).toUpperCase()}`,
      `Mobile Number: ${t(v.phone)}`,
      ...(t(v.email) ? [`Email Address: ${t(v.email)}`] : []),
      '',
      'Thank you for your consideration.',
      ...sign(v),
    ],
    submit: 'Sign the printed letter and drop it at Room 12, Old Admin. Remarking costs Ksh 2,000 per unit: confirm how to pay with Student Finance.',
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
