export const ShirtSizes = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

export type ShirtSize = (typeof ShirtSizes)[number];
