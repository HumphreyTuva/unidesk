// Questions students really ask, answered first and briefly. Used for the visible FAQ and the FAQPage structured data, so they always match.
// Facts about offices and the call-off procedure come from the same files the Guide and the AI assistant use.
import { CALL_OFF_OFFICE } from './callOff';
import { OFFICES } from './offices';

export type Faq = { q: string; a: string; link?: { href: string; label: string } };

const office = (id: string) => OFFICES.find(o => o.id === id)!;
const at = (id: string) => { const o = office(id); return `${o.room}, ${o.building}`; };

export const FAQ: Faq[] = [
  {
    q: 'What is UniDesk?',
    a: 'UniDesk is a student help center for Kenyatta University (KU) students. It has past exam papers you can read in the app, a class and exam timetable generator, directions to lecture halls and venues, guidance on common procedures such as calling off a semester, a page for clubs and a student marketplace, and a support chat.',
  },
  {
    q: 'How do I find a Kenyatta University past paper?',
    a: 'Open Past papers and type a unit code such as ICS2201, or part of the unit name. Papers are listed by year. Open one to read it page by page.',
    link: { href: '/papers', label: 'Browse past papers' },
  },
  {
    q: 'How do I download a past paper?',
    a: 'Sign in with Google, or with your email or username, then open the paper and tap Download PDF.',
  },
  {
    q: 'What if the past paper for my unit is not on UniDesk?',
    a: 'Sign in, open Past papers and tap Request, then enter the unit code. UniDesk records the request and marks it as done when the paper is added.',
    link: { href: '/papers?request=1', label: 'Request a paper' },
  },
  {
    q: 'How do I call off (defer) a semester at Kenyatta University?',
    a: `Write a letter to The Registrar (Academic), Kenyatta University. Put your name, admission number, email, phone number and the date at the top, add a reference line (Request to call off the semester, with the semester and academic year), say who you are, your school and course, explain your reason and give the date you plan to resume. Take the letter to ${CALL_OFF_OFFICE.where} and make sure it is stamped. Processing takes 2 to 3 days and the response is sent to your postal address within a week.`,
    link: { href: '/guide/call-off', label: 'Steps and a ready letter' },
  },
  {
    q: 'Where do I submit a call-off or deferment letter at KU?',
    a: `At the office for ${office('deferment').name}: ${at('deferment')} (Old Admin is also called the Old Admissions Block). Make sure the letter is stamped when you hand it in.`,
  },
  {
    q: 'Where is the Finance Office at Kenyatta University?',
    a: `The ${office('finance').name} is in ${at('finance')}. Go there for fees, payments, balances and statements.`,
    link: { href: '/guide/offices', label: 'All important KU offices' },
  },
  {
    q: 'Where is the Registrar Academic Office at KU?',
    a: `The ${office('registrar').name} is in ${at('registrar')}.`,
  },
  {
    q: 'Where can I get help with my student portal or corporate email password at KU?',
    a: `Go to the ${office('password-reset').name}: ${at('password-reset')}.`,
  },
  {
    q: 'Where do I fix a transcript problem or missing marks at KU?',
    a: `Go to the ${office('transcripts').name} office: ${at('transcripts')}. For portal menu, GPA and unit registration issues, go to ${at('portal-gpa')}.`,
  },
  {
    q: 'Where do I go about a bursary at KU?',
    a: `The ${office('bursary').name} is in ${at('bursary')}. Bursary forms are signed at the ${office('student-affairs').name}: ${at('student-affairs')}.`,
  },
  {
    q: 'How do I make my class or exam timetable?',
    a: 'Open Guide, then Timetable. Choose class or exam, pick your units, and UniDesk builds your timetable and flags any clashes. It works once the university timetable has been published on UniDesk.',
    link: { href: '/guide/timetable', label: 'Make a timetable' },
  },
  {
    q: 'How do I find a lecture hall or venue at Kenyatta University?',
    a: 'Open Guide, then Venues, and search for a building or a room code. UniDesk shows a landmark, a walking route in Google Maps, and photo steps for buildings where they have been added.',
    link: { href: '/guide/venues', label: 'Find a venue' },
  },
  {
    q: 'Can I install UniDesk as an app on my phone?',
    a: 'Yes. Tap Install in your browser, or choose Add to Home screen from the browser menu. UniDesk then opens like an app.',
  },
  {
    q: 'What can the UniDesk AI assistant answer?',
    a: 'In Chat, Ask AI answers questions about KU offices and where to find them, procedures such as call-off letters, building locations and how to use UniDesk. For anything else, choose Talk to a person to message support.',
    link: { href: '/chat?ai=1', label: 'Ask AI' },
  },
  {
    q: 'How do I contact UniDesk support?',
    a: 'Open Chat and choose Talk to a person. Your message goes to the support team and you see the reply in the same chat.',
  },
];
