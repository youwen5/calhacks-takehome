// Deliberately public credentials for the shared interview demo, never real accounts.
export const demoPassword = 'CalHacks-demo-2026!';
export const demoAccounts = [
  {
    name: 'Alex Organizer',
    email: 'manager@example.com',
    role: 'Organizer',
    description: 'Manage events, review applications, and publish decisions.',
  },
  {
    name: 'Riley Reviewer',
    email: 'reviewer@example.com',
    role: 'Reviewer',
    description: 'Review and grade applications.',
  },
  {
    name: 'Sam Rivera',
    email: 'applicant@example.com',
    role: 'Applicant',
    description: 'Try the applicant portal and application forms.',
  },
  {
    name: 'Jordan Chen',
    email: 'jordan@example.com',
    role: 'Accepted applicant',
    description: 'Confirm attendance and open an event pass.',
  },
  {
    name: 'Morgan Lee',
    email: 'morgan@example.com',
    role: 'Submitted applicant',
    description: 'View an application awaiting review.',
  },
] as const;
