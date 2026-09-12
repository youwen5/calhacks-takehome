export const GradYearOptions = [
  2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035,
] as const;

export type GradYear = (typeof GradYearOptions)[number];
