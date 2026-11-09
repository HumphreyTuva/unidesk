// Important KU offices, from the list supplied by the owner. Room numbers can change, so keep this file in step with the university.
// `keywords` are extra words students might type ("fees", "password"...) so search finds the right office.
export type Office = { id: string; name: string; room: string; building: string; keywords: string[] };

export const OFFICES: Office[] = [
  { id: 'registrar', name: 'Registrar Academic Office', room: 'Room 112', building: 'Central Admin', keywords: ['registrar', 'academic', 'records'] },
  { id: 'finance', name: 'Finance Office', room: 'Rooms 34 & 35', building: 'Old Admin', keywords: ['fees', 'fee', 'payment', 'balance', 'statement', 'money'] },
  { id: 'bursary', name: 'Bursary & Cheque Deposit', room: 'Room 20', building: 'Central Admin', keywords: ['bursary', 'cheque', 'check', 'sponsor', 'helb', 'scholarship'] },
  { id: 'transcripts', name: 'Transcript Issues / Corrections', room: 'Room 334', building: 'Central Admin', keywords: ['transcript', 'correction', 'results', 'marks', 'missing marks'] },
  { id: 'portal-gpa', name: 'Portal Menu, GPA & Units Issues', room: 'Room 128', building: 'Central Admin', keywords: ['portal', 'gpa', 'units', 'unit registration', 'menu'] },
  { id: 'elearning', name: 'E-Learning Portal / Kusoma Platform Support', room: '3rd Floor', building: 'School of Education', keywords: ['e-learning', 'elearning', 'kusoma', 'online classes', 'moodle'] },
  { id: 'deferment', name: 'Dropping of Units, Appeals, Deferment & Call-off Letters', room: 'Room 12', building: 'Old Admin', keywords: ['drop', 'dropping', 'appeal', 'defer', 'deferment', 'call off', 'call-off', 'letter', 'semester off'] },
  { id: 'student-affairs', name: 'Directorate of Student Affairs (Signing Bursary Forms)', room: 'Room 126', building: 'BSSC', keywords: ['student affairs', 'bursary form', 'sign', 'welfare', 'dean of students'] },
  { id: 'senate-affairs', name: 'Senate Affairs Office', room: 'Room 108', building: 'Central Admin', keywords: ['senate', 'senate affairs'] },
  { id: 'bio-data', name: 'Bio-Data Office', room: 'Room 116', building: 'Old Admin', keywords: ['bio-data', 'biodata', 'bio data', 'name change', 'details'] },
  { id: 'password-reset', name: 'Student Portal / Corporate Email Reset (Username & Password Help)', room: 'Room 324', building: 'Central Admin', keywords: ['password', 'username', 'reset', 'email', 'corporate email', 'forgot', 'login', 'portal'] },
  { id: 'senate-board', name: 'Senate Boardroom (Disciplinary Hearings)', room: 'Room 330', building: 'Central Admin', keywords: ['discipline', 'disciplinary', 'hearing', 'boardroom'] },
];
