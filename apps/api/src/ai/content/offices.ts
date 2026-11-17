// Important KU offices, from the list supplied by the owner. Room numbers can change, so keep this file in step with the university.
// `keywords` are extra words students might type ("fees", "password"...) so search finds the right office.
export type Office = { id: string; name: string; room: string; building: string; keywords: string[]; email?: string[]; tel?: string };

export const OFFICES: Office[] = [
  { id: 'registrar', name: 'Registrar Academic Office', room: 'Room 112', building: 'Central Admin', keywords: ['registrar', 'academic', 'records'] },
  { id: 'finance', name: 'Finance Office', room: 'Rooms 34 & 35', building: 'Old Admin', keywords: ['fees', 'fee', 'payment', 'balance', 'statement', 'money'] },
  { id: 'bursary', name: 'Bursary & Cheque Deposit', room: 'Room 20', building: 'Central Admin', keywords: ['bursary', 'cheque', 'check', 'sponsor', 'helb', 'scholarship'] },
  { id: 'transcripts', name: 'Certificates & Transcripts', room: 'Rooms 127 & 128', building: 'Central Admin', keywords: ['transcript', 'certificate', 'graduation certificate', 'correction', 'results'], email: ['head-transcripts@ku.ac.ke', 'head-graduation@ku.ac.ke'], tel: '020 870 3092' },
  { id: 'portal-gpa', name: 'Portal Menu, GPA & Units Issues', room: 'Room 128', building: 'Central Admin', keywords: ['portal', 'gpa', 'units', 'unit registration', 'menu'] },
  { id: 'elearning', name: 'E-Learning Portal / Kusoma Platform Support', room: '3rd Floor', building: 'School of Education', keywords: ['e-learning', 'elearning', 'kusoma', 'online classes', 'moodle'] },
  { id: 'deferment', name: 'Dropping of Units, Appeals, Deferment & Call-off Letters', room: 'Room 12', building: 'Old Admin', keywords: ['drop', 'dropping', 'appeal', 'defer', 'deferment', 'call off', 'call-off', 'letter', 'semester off'] },
  { id: 'student-affairs', name: 'Directorate of Student Affairs (Signing Bursary Forms)', room: 'Room 126', building: 'BSSC', keywords: ['student affairs', 'bursary form', 'sign', 'welfare', 'dean of students'] },
  { id: 'senate-affairs', name: 'Senate Affairs Office', room: 'Room 108', building: 'Central Admin', keywords: ['senate', 'senate affairs'] },
  { id: 'bio-data', name: 'Bio-Data Office', room: 'Room 116', building: 'Old Admin', keywords: ['bio-data', 'biodata', 'bio data', 'name change', 'details'] },
  { id: 'password-reset', name: 'Student Portal / Corporate Email Reset (Username & Password Help)', room: 'Room 321', building: 'Central Admin', keywords: ['password', 'username', 'reset', 'email', 'corporate email', 'forgot', 'login', 'portal', 'ict', 'ticket'], email: ['support.ku.ac.ke'] },
  { id: 'student-finance', name: 'Student Finance (Fee Inquiries)', room: 'Behind Old Admissions', building: 'Old Admin area', keywords: ['fees', 'fee', 'inquiry', 'enquiry', 'balance', 'direct banking', 'finance'], email: ['head-studentfinanceug@ku.ac.ke', 'sfinance-pg@ku.ac.ke', 'direct-banking@ku.ac.ke'], tel: '020 870 3124' },
  { id: 'credit-waivers', name: 'Credit Waivers (Teaching Programmes)', room: 'Room 111', building: 'Central Admin', keywords: ['credit', 'waiver', 'waivers', 'credit transfer', 'exemption', 'teaching programmes'], email: ['head-teachingprograms@ku.ac.ke'], tel: '020 870 3150' },
  { id: 'examinations', name: 'Incomplete, Special & Supplementary Exams', room: 'Room 134', building: 'Central Admin', keywords: ['incomplete', 'special', 'supplementary', 'exam', 'exams', 'examinations', 'missed exam', 'supp'], email: ['head-examinations@ku.ac.ke'], tel: '020 870 3080' },
  { id: 'missing-marks', name: 'Missing Marks (Academic Data Verification)', room: 'Room 110', building: 'Central Admin', keywords: ['missing marks', 'missing mark', 'e grade', 'marks', 'verification', 'data verification'], email: ['head.advs@ku.ac.ke'] },
  { id: 'remarking', name: 'Remarking Applications (drop your letter)', room: 'Room 12', building: 'Old Admin', keywords: ['remarking', 'remark', 're-mark', 'appeal marks', 'marks appeal'] },
  { id: 'senate-board', name: 'Senate Boardroom (Disciplinary Hearings)', room: 'Room 330', building: 'Central Admin', keywords: ['discipline', 'disciplinary', 'hearing', 'boardroom'] },
];
