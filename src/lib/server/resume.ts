import { PortalError } from './errors';
export const MAX_RESUME_BYTES = 2 * 1024 * 1024;
export type ResumeUpload = { filename: string; bytes: Buffer };
export function validateResume(file: ResumeUpload) {
  if (file.bytes.length > MAX_RESUME_BYTES)
    throw new PortalError(413, 'Resume must be 2 MB or smaller.');
  if (
    !/\.pdf$/i.test(file.filename) ||
    file.bytes.subarray(0, 5).toString() !== '%PDF-' ||
    !file.bytes.subarray(-1024).includes('%%EOF')
  )
    throw new PortalError(400, 'Upload a PDF resume.');
  // Filenames are display metadata only; never use them as filesystem paths.
  file.filename = file.filename.replace(/[^a-zA-Z0-9 ._-]/g, '_').slice(-120);
}
