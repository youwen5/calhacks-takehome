import { z } from 'zod';
import { Schools } from '../options/Schools';
import { Majors } from '../options/Majors';
import { GradYearOptions } from '../options/GradYearOptions';
import { LevelOfStudyOptions } from '../options/LevelOfStudy';
import { ShirtSizes } from '../options/ShirtSizes';
import { Genders } from '../options/Genders';
import { EthnicityOptions } from '../options/EthnicityOptions';
export { Majors, GradYearOptions, LevelOfStudyOptions, ShirtSizes, Genders, EthnicityOptions };
// Retain Storke's full dataset; prioritize the host campus rather than UCSB.
export const schools = [...new Set(['University of California, Berkeley', ...Schools])];
export const majors = [...new Set(Majors)];
export const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];
export const dietaryOptions = [
  { key: 'dietaryVegetarian', label: 'Vegetarian' },
  { key: 'dietaryVegan', label: 'Vegan' },
  { key: 'dietaryGlutenFree', label: 'Gluten-Free' },
  { key: 'dietaryDairyFree', label: 'Dairy-Free' },
  { key: 'dietaryNutAllergy', label: 'Nut Allergy' },
  { key: 'dietaryShellfishAllergy', label: 'Shellfish Allergy' },
  { key: 'dietaryKosher', label: 'Kosher' },
  { key: 'dietaryHalal', label: 'Halal' },
  { key: 'dietaryPescatarian', label: 'Pescatarian' },
  { key: 'dietaryOther', label: 'Other' },
] as const;
export const academicFields = [
  { key: 'levelOfStudy', label: 'Level of study' },
  { key: 'gradYear', label: 'Graduation year' },
  { key: 'major', label: 'Major' },
  { key: 'skillLevel', label: 'Technical skill level' },
  { key: 'hackathonsAttended', label: 'Hackathons attended' },
] as const;
const text = z.string().trim().max(200).default('');
const checkbox = z.preprocess(
  (v) =>
    v === undefined || v === ''
      ? false
      : v === 'yes' || v === 'on' || v === 'true'
        ? true
        : v === 'false'
          ? false
          : v,
  z.boolean(),
);
export const hackerProfileSchema = z.object({
  phoneNumber: text,
  dateOfBirth: text,
  shirtSize: text,
  gender: text,
  ethnicity: text,
  levelOfStudy: text,
  gradYear: text,
  major: text,
  skillLevel: text,
  hackathonsAttended: text,
  addressLine1: text,
  addressLine2: text,
  city: text,
  state: text,
  zipCode: text,
  country: text,
  dietaryVegetarian: checkbox,
  dietaryVegan: checkbox,
  dietaryGlutenFree: checkbox,
  dietaryDairyFree: checkbox,
  dietaryNutAllergy: checkbox,
  dietaryShellfishAllergy: checkbox,
  dietaryKosher: checkbox,
  dietaryHalal: checkbox,
  dietaryPescatarian: checkbox,
  dietaryOther: checkbox,
  dietaryAdditionalDetails: z.string().trim().max(500).default(''),
  mlhCodeOfConduct: checkbox,
  mlhPrivacyPolicy: checkbox,
  mlhMailingList: checkbox,
});
export type HackerProfile = z.infer<typeof hackerProfileSchema>;
const listed = (value: string, list: readonly (string | number)[], label: string) => {
  if (!list.some((v) => String(v) === value))
    throw new Error(`Please select ${label} from the list.`);
};
export function validateHackerSubmission(
  data: HackerProfile & { organization: string },
  now = Date.now(),
) {
  listed(data.organization, schools, 'your university');
  listed(data.major, majors, 'your major');
  listed(data.gender, Genders, 'gender');
  listed(data.ethnicity, EthnicityOptions, 'ethnicity');
  listed(data.shirtSize, ShirtSizes, 'a T-shirt size');
  listed(data.levelOfStudy, LevelOfStudyOptions, 'level of study');
  listed(data.gradYear, GradYearOptions, 'graduation year');
  listed(data.skillLevel, skillLevels, 'technical skill level');
  const digits = data.phoneNumber.replace(/\D/g, '');
  if (!/^[+\d\s().-]+$/.test(data.phoneNumber) || digits.length < 10 || digits.length > 15)
    throw new Error('Please enter a valid phone number.');
  const birth = new Date(data.dateOfBirth + 'T00:00:00Z');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(data.dateOfBirth) ||
    !Number.isFinite(birth.getTime()) ||
    birth.toISOString().slice(0, 10) !== data.dateOfBirth ||
    birth.getTime() > now ||
    birth.getUTCFullYear() < 1900
  )
    throw new Error('Please enter a valid date of birth.');
  if (!/^\d{1,4}$/.test(data.hackathonsAttended))
    throw new Error('Hackathons attended must be a whole number from 0 to 9999.');
  for (const key of ['addressLine1', 'city', 'state', 'zipCode', 'country'] as const)
    if (!data[key]) throw new Error(`Please complete ${key}.`);
  // International applicants can enter postal codes; do not impose Storke's US-only regex.
  if (!data.mlhCodeOfConduct || !data.mlhPrivacyPolicy)
    throw new Error('Please accept the required MLH acknowledgements.');
}
export function dietarySummary(profile: Record<string, unknown> | undefined) {
  if (!profile) return '';
  return [
    ...dietaryOptions.filter((o) => profile[o.key] === true).map((o) => o.label),
    String(profile.dietaryAdditionalDetails || ''),
  ]
    .filter(Boolean)
    .join('; ');
}
