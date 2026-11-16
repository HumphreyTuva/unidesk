// Step-by-step student procedures at Kenyatta University, from information shared by students and the owner.
// Offices, rooms and fees can change, so every page tells students to confirm with the office.
// Run `npm run sync:content` after editing: the AI assistant uses a copy of this file.
export type ProcStep = { title: string; body: string };
export type Procedure = {
  id: string;
  title: string; // short, for lists
  sub: string; // one line under the title in lists
  question: string; // what a student would ask; also the page heading
  summary: string; // the answer in one or two sentences
  steps: ProcStep[];
  notes?: string[];
  letterKind?: 'resume' | 'missed' | 'id' | 'late' | 'latefee' | 'extra'; // procedures that need a letter get a "My letter" tab (see lib/letters.ts)
  link?: { href: string; label: string };
  keywords: string[];
};

export const PROCEDURES: Procedure[] = [
  {
    id: 'graduation',
    title: 'Apply for graduation',
    sub: 'Online application and tracking number',
    question: 'How do I apply for graduation at Kenyatta University?',
    summary: 'Apply online at studentonlineservices.ku.ac.ke with your student corporate email, using Application for Graduation. Applying is required for everyone who wants to graduate, and clearance starts automatically after you submit.',
    steps: [
      { title: 'Open student online services', body: 'Go to studentonlineservices.ku.ac.ke.' },
      { title: 'Sign in', body: 'Log in with your student corporate email.' },
      { title: 'Open the form', body: 'Click Application for Graduation.' },
      { title: 'Fill in your details', body: 'Write your name exactly as it is on your national ID, your national ID number, and your department. Choose one department only: filling in three can delay your clearance.' },
      { title: 'Upload your documents', body: 'Upload your ID and a passport-size photo. Each file must be less than 2 MB.' },
      { title: 'Submit and keep your tracking number', body: 'After a successful application an email shows a tracking number that starts with G. Keep it. You do not need to apply for clearance separately: it starts automatically when you submit.' },
    ],
    link: { href: 'https://studentonlineservices.ku.ac.ke', label: 'Open student online services' },
    keywords: ['graduation', 'graduate', 'clearance', 'tracking number', 'graduation application'],
  },
  {
    id: 'unit-registration',
    title: 'Register your units online',
    sub: 'On the student portal, step by step',
    question: 'How do I register my units on the Kenyatta University student portal?',
    summary: 'Open the student portal, go to Academics then Registration, choose your course and semester, search each unit code, add it with the + sign, then tap Drop/Register to finish.',
    steps: [
      { title: 'Open Registration', body: 'In the student portal, tap the menu bar at the top right, choose Academics, then Registration.' },
      { title: 'Choose your course and semester', body: 'Pick your course and duration, for example Bachelor of Arts (Psychology), 1st Semester.' },
      { title: 'Start registering', body: 'Scroll down and click Register.' },
      { title: 'Wait for the courses to load', body: 'Let all the courses finish loading on the page.' },
      { title: 'Search for a unit', body: 'Click the search bar just below the All courses icon and type the exact unit code, for example APS210. Do not put a space in it.' },
      { title: 'Add the unit', body: 'When it loads, click the + sign. The unit appears below under Selected courses.' },
      { title: 'Repeat for every unit', body: 'Do the same for all the units you are taking this semester.' },
      { title: 'Finish', body: 'After adding all your units, click Drop/Register to finalise.' },
    ],
    notes: ['If the portal gives trouble with units, the Portal Menu, GPA & Units Issues office is in Room 128, Central Admin.'],
    keywords: ['register units', 'unit registration', 'portal', 'course registration', 'semester registration'],
  },
  {
    id: 'resume-studies',
    title: 'Resume studies after calling off',
    sub: 'Letter to the Registrar, then wait for approval',
    question: 'How do I resume my studies after calling off a semester at Kenyatta University?',
    summary: 'Write to the Registrar (Academic) asking to resume in the semester you want to return, and submit it before that semester starts. Wait for official approval before you go back to class.',
    steps: [
      { title: 'Write the letter', body: 'Address it to the Registrar (Academic) and ask for permission to resume in the semester you intend to return.' },
      { title: 'Submit it in good time', body: 'Take it to the Admissions/Academic office (Central Admin, Room 112) before the semester you want to rejoin, so there is enough time for processing.' },
      { title: 'Not on campus?', body: 'You can still send the letter to registrar-acad@ku.ac.ke.' },
      { title: 'Wait for the outcome', body: 'The result is usually sent to your official university email or through the admissions office.' },
      { title: 'Your account is reactivated', body: 'Once your application is approved, the university reactivates your student account so you can use the student portal and register for units.' },
      { title: 'Clear fees and register', body: 'Clear any outstanding fees as required, register your units and continue according to the approved academic calendar.' },
    ],
    notes: ['Do not resume classes until you receive official approval to resume your studies.'],
    letterKind: 'resume',
    keywords: ['resume', 'resumption', 'rejoin', 'return after deferment', 'called off'],
  },
  {
    id: 'missed-exams',
    title: 'Missed exams (valid reasons)',
    sub: 'Special exam or incomplete results',
    question: 'What can I do if I missed exams for a valid reason at Kenyatta University?',
    summary: 'Apply to the Registrar (Academic) for a special examination (if you missed all your papers) or for incomplete results (if you missed some), with evidence of your reason. You must have completed all CATs, assignments and practicals.',
    steps: [
      { title: 'Know which one applies', body: 'Special examination: you registered for your units and missed all the examination papers for the semester. Incomplete results: you could not complete all your exams for a valid reason, for example you registered for seven units but sat only six.' },
      { title: 'Check you are eligible', body: 'You must have completed all Continuous Assessment Tests (CATs), submitted all assignments and completed all required practicals.' },
      { title: 'Write the letter', body: 'Write an official letter to the Registrar (Academic) asking for consideration. Use the format below. Keep it brief, clear and straight to the point.' },
      { title: 'Attach your evidence', body: 'Attach all relevant supporting documents. Your reason must be one you can justify with tangible evidence.' },
      { title: 'Submit it', body: 'Take the documents to the Old Administration Block, Room 12 (Ground Floor).' },
    ],
    letterKind: 'missed',
    keywords: ['special exam', 'incomplete results', 'missed exam', 'missed examinations', 'sick', 'supplementary'],
  },
  {
    id: 'student-id-replacement',
    title: 'Replace or renew your student ID',
    sub: 'Lost, expired or defaced ID card',
    question: 'How do I replace a lost, expired or defaced student ID at Kenyatta University?',
    summary: 'Write to the Registrar (Academic) through the Director of Student Affairs and the Director of Security Services, pay the replacement fee, collect the approvals and stamps, then take everything to the Smartcard office in the Students’ Computer Centre for your new card.',
    steps: [
      { title: 'Check for your lost ID first', body: 'Lost student IDs are usually taken to BSSC Room 7 (Huduma Centre). Check there before you start the process.' },
      { title: 'Write the letter', body: 'Address it to the Registrar (Academic), through the Director of Student Affairs and the Director of Security Services. Use the format below.' },
      { title: 'Get the replacement form', body: 'At BSSC Room 7 (Huduma Centre) you are given the smart card replacement form, which needs approval from the Finance department.' },
      { title: 'Pay the replacement fee', body: 'Kshs 700 to replace a lost ID. Kshs 500 to replace a defaced or expired ID. Pay at an official KU bank (Family, Equity, National or Co-operative). If you have an overpayment in your portal you can use it instead: ask Finance for the invoice.' },
      { title: 'Get your Finance paper', body: 'Take the bank slip to Finance in Old Admin and get the official KU receipt or the Student Print Ledger that shows the ID replacement and the amount paid.' },
      { title: 'Get your letter signed and stamped', body: 'Take the letter, the Finance paper and the approval form to the Director of Student Affairs in BSSC (rooms 124, 125, 126 or 131) for a signature. Then take them to room 132 for a stamp. These are on the First Floor.' },
      { title: 'Get the security stamp', body: 'Take them to the Security Controls office for a stamp. The security offices are near and opposite the swimming pool.' },
      { title: 'Collect your new ID', body: 'Go to the Smartcard office in the Students’ Computer Centre (SCC 104/105, First Floor, opposite the School of Education building) with your letter, Finance paper and form. Your ID is replaced there.' },
    ],
    notes: [
      'Students’ guides differ slightly on room numbers and on fees. One version says the fee rises if you have replaced your ID several times: Kshs 700 for the 1st and 2nd, Kshs 1,000 for the 3rd and 4th, and Kshs 1,500 after that. Confirm the amount at BSSC Room 7 before you pay.',
      'The main Finance Office is in Old Admin, Rooms 34 and 35. Some students say the cashier is in Room 38.',
    ],
    letterKind: 'id',
    keywords: ['student id', 'id card', 'smart card', 'smartcard', 'lost id', 'replace id', 'renew id', 'expired id'],
  },
  {
    id: 'corporate-email-recovery',
    title: 'Recover your corporate email',
    sub: 'Submit an ICT ticket and reset your password',
    question: 'How do I recover my Kenyatta University student corporate email?',
    summary: 'Submit a ticket at support.ku.ac.ke under ICT Services, Corporate Email. Within 24 hours you get an email with a link to a password reset page, where an 8-digit verification code lets you set a new password.',
    steps: [
      { title: 'Open the support site', body: 'Go to support.ku.ac.ke to submit a ticket.' },
      { title: 'Choose the service', body: 'Select ICT Services, then click Corporate Email.' },
      { title: 'Fill in the form', body: 'Give your name, admission number and phone number. Set Priority to High. Select Student (not Staff). Use your personal email address in the email field. For Subject write “Corporate Email”. In the Message say that you need to recover your corporate email.' },
      { title: 'Submit', body: 'Enter the verification number shown on the screen, then submit the form.' },
      { title: 'Wait for two emails', body: 'First you get a confirmation that the ICT team has received your request. Within 24 hours you get another email with a link.' },
      { title: 'Reset your password', body: 'Click the link. It opens the password reset page and gives you an 8-digit verification code to reset your password.' },
    ],
    notes: ['You can also ask in person at the Student Portal / Corporate Email Reset office: Room 324, Central Admin.'],
    link: { href: 'https://support.ku.ac.ke', label: 'Open KU support' },
    keywords: ['corporate email', 'student email', 'password reset', 'forgot password', 'ict ticket', 'email recovery', 'portal login'],
  },
  {
    id: 'late-unit-registration',
    title: 'Late unit registration',
    sub: 'Letter to the Registrar (Academic)',
    question: 'How do I register units late at Kenyatta University?',
    summary: 'Write a short letter to the Registrar (Academic) asking for late unit registration and give your reason. Take the signed letter to the Old Administration Block, Room 12. A response is normally issued within five working days, and once approved you go to your School or Department to register.',
    steps: [
      { title: 'Write the letter', body: 'Address it to the Registrar (Academic), Kenyatta University, P.O. Box 43844-00100, Nairobi. The subject is: REQUEST FOR LATE UNIT REGISTRATION. Keep it brief and clear, and explain why you could not register in time.' },
      { title: 'Include your details', body: 'Your full name, registration number, mobile number, email address (corporate or personal), the date and your signature.' },
      { title: 'Submit it', body: 'Take the signed letter to the Old Administration Block, Room 12.' },
      { title: 'Follow the guidance', body: 'After you submit, you are guided on the next steps.' },
      { title: 'Wait for the response', body: 'A response is normally issued within five (5) working days or earlier.' },
      { title: 'Register your units', body: 'Once approved, go to your School or Department for unit registration or further action.' },
    ],
    letterKind: 'late',
    keywords: ['late registration', 'late unit registration', 'register late', 'missed unit registration', 'registration deadline'],
  },
  {
    id: 'late-fee-payment',
    title: 'Late fee payment',
    sub: 'Letter to the Registrar (Academic)',
    question: 'What if I cannot pay my fees before the deadline at Kenyatta University?',
    summary: 'Write to the Registrar (Academic) asking for approval to pay after the deadline and state the reason. If you have already paid late, write an appeal attaching your fee receipt and ask for the registration hold to be lifted. Submit at the Old Administration Block, Room 12.',
    steps: [
      { title: 'Write the letter', body: 'Address it to the Registrar (Academic), Kenyatta University, P.O. Box 43844-00100, Nairobi. The subject is: REQUEST FOR LATE FEE PAYMENT. State the reason for the delay. Keep it brief, clear and straight to the point.' },
      { title: 'Already paid after the deadline?', body: 'Write an appeal letter, attach your fee payment receipt as proof of payment, and ask the Registrar to lift the registration hold so you can register.' },
      { title: 'Include your details', body: 'Your full name, registration number, mobile number, email address (corporate or personal), the date and your signature.' },
      { title: 'Submit it', body: 'Take the signed letter to the Old Administration Block, Room 12. After you submit, you are guided on the next steps.' },
      { title: 'Wait for the response', body: 'A response is normally issued within five (5) working days or earlier.' },
      { title: 'Once approved', body: 'Make the fee payment and follow any further instructions from the relevant office.' },
    ],
    notes: ['If your appeal is rejected, you may be asked to call off the semester. Your fee balance stays in your student account: the money is not lost, and it remains available when you resume, whether in the second semester or the next academic year.'],
    letterKind: 'latefee',
    keywords: ['late fees', 'late fee payment', 'fee deadline', 'registration hold', 'fees after deadline', 'appeal letter'],
  },
  {
    id: 'extra-units',
    title: 'Register extra units or retakes',
    sub: 'Over 8 units in a semester',
    question: 'How do I register extra units or retakes at Kenyatta University?',
    summary: 'The usual maximum is 8 units per semester. To register more (for example retakes), write to the Registrar (Academic) naming the unit(s) and why you need them. Your GPA must be 60 or above. If approved, register at Room 152, 844 Building.',
    steps: [
      { title: 'Check the limit and your GPA', body: 'The maximum standard registration is 8 units per semester. Your GPA must be 60 and above for your request to be considered.' },
      { title: 'Write the letter', body: 'Address it to the Registrar (Academic), Kenyatta University, P.O. Box 43844-00100, Nairobi, Kenya. The subject is: REQUEST TO REGISTER EXTRA UNIT(S). Name the unit(s) and briefly explain why you need them. Keep it short and clear.' },
      { title: 'Submit it', body: 'Take the signed letter to the Old Administration Block, Room 12 (Ground Floor).' },
      { title: 'Register once approved', body: 'Go to Room 152, 844 Building to register the extra unit(s).' },
    ],
    notes: ['This guidance was shared for the School of Law, Arts and Social Sciences (SLASS). Students in other schools should confirm with their School or Department.'],
    letterKind: 'extra',
    keywords: ['extra units', 'retake', 'retakes', 'more than 8 units', 'maximum units', 'additional units'],
  },
  {
    id: 'eduroam-wifi',
    title: 'Connect to KU Wi-Fi (eduroam)',
    sub: 'Phone and laptop setup',
    question: 'How do I connect to Kenyatta University Wi-Fi (eduroam)?',
    summary: 'Get your eduroam password from an email in your KU corporate email, then connect to “eduroam” using your KU student email as the identity, PEAP and MSCHAPV2. Your eduroam password is different from your email password.',
    steps: [
      { title: 'Get your eduroam password', body: 'Open your KU corporate email, search for “eduroam password”, open the email with your credentials and copy the password. It is different from your Gmail or corporate email password.' },
      { title: 'Know your identity', body: 'Your identity (username) is your own KU student email address.' },
      { title: 'On an Android phone', body: 'Go to Settings, then Wi-Fi, then select eduroam. Set EAP method to PEAP and Phase 2 authentication to MSCHAPV2. Set Domain to ku.ac.ke. Enter your KU student email as Identity, leave Anonymous identity blank and enter your eduroam password. Tap Connect.' },
      { title: 'CA certificate', body: 'Options differ by Android version and phone brand. Choose the certificate option KU supports for your phone, such as trust on first use where available, or system certificates with the domain ku.ac.ke. If your device needs the official KU CA certificate, ask KU ICT Support for it and only install certificates from trusted KU sources.' },
      { title: 'On a Windows laptop', body: 'Turn on Wi-Fi, select eduroam and click Connect. Enter your KU student email as the username and your eduroam password. Check the certificate prompt before accepting it, then wait until it shows Connected.' },
      { title: 'If it refuses to connect', body: 'Forget the eduroam network, restart your device, turn Wi-Fi off and on, then select eduroam again and re-enter your email and password with no extra spaces. Check PEAP, MSCHAPV2, the certificate and the domain. If you changed your eduroam password, update it on your device. Try another area where eduroam is available.' },
      { title: 'Still stuck?', body: 'Contact KU ICT Support at support@ku.ac.ke.' },
    ],
    notes: ['Never ignore unexpected certificate warnings. Eduroam is available in various locations within the university and works once your device is set up correctly.'],
    keywords: ['eduroam', 'wifi', 'wi-fi', 'ku wifi', 'internet', 'connect to wifi', 'campus wifi'],
  },
];

export const procedure = (id: string) => PROCEDURES.find(p => p.id === id);
