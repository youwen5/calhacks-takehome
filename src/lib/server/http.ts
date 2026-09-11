import { error, fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { database } from './db';
import { portal, PortalError } from './portal';
export const service = () => portal(database());
export function signedIn(locals: App.Locals) {
  if (!locals.user) redirect(303, '/login');
  return locals.user;
}
export function loadData<T>(work: () => T): T {
  try {
    return work();
  } catch (err) {
    if (err instanceof PortalError) error(err.status, err.message);
    if (err instanceof ZodError) error(400, 'Invalid request parameters.');
    throw err;
  }
}
export function actionData<T>(work: () => T) {
  try {
    return { ok: true as const, result: work() };
  } catch (err) {
    if (err instanceof PortalError)
      return fail(err.status, { ok: false as const, message: err.message });
    if (err instanceof ZodError)
      return fail(400, {
        ok: false as const,
        message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
    throw err;
  }
}
export const string = (form: FormData, key: string) => String(form.get(key) ?? '');
export const number = (form: FormData, key: string) => Number(string(form, key));
export async function formData(request: Request, limit = 65_536) {
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        error(413, 'Request too large.');
      }
      chunks.push(value);
    }
  }
  const body = Buffer.concat(chunks);
  const contentType = request.headers.get('content-type') || '';
  if (contentType.startsWith('multipart/form-data')) {
    try {
      return await new Response(body, { headers: { 'Content-Type': contentType } }).formData();
    } catch {
      error(400, 'Invalid upload form.');
    }
  }
  const form = new FormData();
  for (const [key, value] of new URLSearchParams(body.toString())) form.append(key, value);
  return form;
}
