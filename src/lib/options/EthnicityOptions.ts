export const EthnicityOptions = [
  'White',
  'Hispanic',
  'Black/African American',
  'American Indian/Alaska Native',
  'Asian (East Asian)',
  'Asian (South Asian)',
  'Asian (Other Asian)',
  'Native Hawaiian/Pacific Islander',
  'Other',
  'Prefer not to Answer',
] as const;

export type Ethnicity = (typeof EthnicityOptions)[number];
