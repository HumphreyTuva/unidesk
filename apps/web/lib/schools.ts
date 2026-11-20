// Suggestions for the "School" field. Students can still type their own: this only saves typing.
export const SCHOOLS = [
  'Pure and Applied Sciences',
  'Engineering and Technology',
  'Education',
  'Business',
  'Economics',
  'Law, Arts and Social Sciences',
  'Hospitality, Tourism and Leisure Studies',
  'Health Sciences',
  'Environmental Studies',
  'Agriculture and Enterprise Development',
  'Creative and Performing Arts, Film and Media Studies',
  'Medicine',
];

export const SCHOOL_KEY = 'unidesk_papers_school';
// Remember the school a student typed anywhere, so the Papers page can list that school's papers first.
export function rememberSchool(value: string) {
  const hit = SCHOOLS.find(s => s.toLowerCase() === value.trim().toLowerCase());
  if (hit) { try { localStorage.setItem(SCHOOL_KEY, hit); } catch {} }
}
