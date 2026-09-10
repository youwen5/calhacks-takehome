import { z } from 'zod';
// Explicit offsets avoid server-local interpretation of ambiguous wall-clock times.
export function parseInstant(value: string) {
  return Date.parse(z.iso.datetime({ offset: true }).parse(value));
}
