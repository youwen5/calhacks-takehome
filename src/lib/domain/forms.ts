import { z } from 'zod';
export const applicationTypes = ['hacker', 'mentor'] as const;
export type ApplicationType = (typeof applicationTypes)[number];
export const typeSchema = z.enum(applicationTypes);
export const decisionSchema = z.enum(['accepted', 'waitlisted', 'rejected']);
const short = z.string().trim().max(200);
const essay = z.string().trim().max(3000);
const link = z.union([
  z.literal(''),
  z
    .url()
    .refine((v) => ['https:', 'http:'].includes(new URL(v).protocol), 'Use an HTTP or HTTPS link'),
]);
export const commonSchema = z.object({
  name: short,
  organization: short,
  introduction: essay,
  link,
});
const hacker = commonSchema.extend({ interests: essay, experience: essay, ambition: essay });
const mentor = commonSchema.extend({ expertise: essay, mentoring: essay, availability: essay });
export const forms = {
  hacker: {
    label: 'Hacker',
    description: 'Placeholder requirements to apply as Hacker',
    fields: [
      {
        key: 'interests',
        label: 'What are you curious about?',
        hint: 'Tell us which ideas or technologies you want to explore.',
      },
      {
        key: 'experience',
        label: 'Tell us about something you tried',
        hint: 'A project, a class, or an experiment. Beginners are welcome.',
      },
      {
        key: 'ambition',
        label: 'What would you like to build or learn?',
        hint: 'What would make this weekend meaningful for you?',
      },
    ],
    rubric: ['Motivation', 'Initiative', 'Collaboration'],
    schema: hacker,
  },
  mentor: {
    label: 'Mentor',
    description: 'Placeholder requirements to apply as Mentor',
    fields: [
      {
        key: 'expertise',
        label: 'Where can you help?',
        hint: 'Describe your technical or creative areas of expertise.',
      },
      {
        key: 'mentoring',
        label: 'How do you help someone get unstuck?',
        hint: 'Share an example of teaching, mentoring, or collaboration.',
      },
      {
        key: 'availability',
        label: 'When can you join us?',
        hint: 'Include your availability during the event and your timezone.',
      },
    ],
    rubric: ['Relevant expertise', 'Communication', 'Mentoring approach'],
    schema: mentor,
  },
} as const;
// Add future definitions under a new version; never replace a published version.
export const formVersions = { 1: forms } as const;
export function formDefinition(type: ApplicationType, version: number) {
  if (version !== 1) throw new Error('Unsupported form version');
  return formVersions[version][type];
}
export function parseAnswers(
  type: ApplicationType,
  version: number,
  input: unknown,
  submit: boolean,
) {
  const result = formDefinition(type, version).schema.parse(input);
  if (submit) {
    for (const [key, value] of Object.entries(result)) {
      if (key !== 'link' && value.length < 2) throw new Error(`Please complete ${key}.`);
    }
  }
  return result;
}
export const rubricAnchors = [
  '1 — Little evidence in the response',
  '2 — Some evidence, limited detail',
  '3 — Clear evidence with a relevant example',
  '4 — Strong evidence and thoughtful detail',
  '5 — Exceptional evidence, depth, and reflection',
];
