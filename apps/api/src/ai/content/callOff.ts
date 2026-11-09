// Procedure for calling off a semester (deferment), from the text supplied by the owner.
export const CALL_OFF_STEPS: { title: string; body: string }[] = [
  { title: 'Write your details top left', body: 'Your name, admission number, email, phone number and the date.' },
  { title: 'Address the letter', body: 'To: The Registrar (Academic), Kenyatta University. Add a reference line: Request to call off the semester, with the semester and academic year.' },
  { title: 'Introduce yourself', body: 'Say who you are, your admission number, your school and your course, and that you request permission to call off the semester because of your reason.' },
  { title: 'Explain and give a return date', body: 'Explain your reason clearly and say when you plan to resume your studies. Write your phone number clearly at the bottom.' },
  { title: 'Submit and get it stamped', body: 'Take the letter to Old Admin (also called the Old Admissions Block), Room 12. Make sure it is stamped when you hand it in.' },
  { title: 'Wait for the reply', body: 'Processing takes 2 to 3 days. The response is sent to your postal address within a week.' },
];

export const CALL_OFF_OFFICE = { name: 'Dropping of Units, Appeals, Deferment & Call-off Letters', where: 'Old Admin, Room 12' };
