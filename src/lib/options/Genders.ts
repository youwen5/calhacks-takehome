export const Genders = ['Male', 'Female', 'Non-binary', 'Prefer not to answer'] as const;

export type Gender = (typeof Genders)[number];
