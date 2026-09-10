import { expect, it } from 'vitest';
import { parseInstant } from '../src/lib/domain/time';
it('requires valid timestamps with explicit offsets, including daylight-saving overlap', () => {
  expect(() => parseInstant('2026-11-01T01:30:00')).toThrow();
  expect(() => parseInstant('2026-02-30T10:00:00Z')).toThrow();
  expect(
    parseInstant('2026-11-01T01:30:00-08:00') - parseInstant('2026-11-01T01:30:00-07:00'),
  ).toBe(3_600_000);
});
