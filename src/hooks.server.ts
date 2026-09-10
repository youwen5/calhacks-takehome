import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle, ServerInit } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth';

export const init: ServerInit = () => {
  if (!building) getAuth();
};
export const handle: Handle = async ({ event, resolve }) => {
  if (building) return resolve(event);
  const length = Number(event.request.headers.get('content-length') || 0);
  if (length > 65_536) return new Response('Request too large.', { status: 413 });
  const auth = getAuth();
  event.locals.user = (await auth.api.getSession({ headers: event.request.headers }))?.user ?? null;
  let response = await svelteKitHandler({ event, resolve, auth, building });
  // Public resend must not reveal account existence through provider failures.
  // Signed-in applicants retain actionable delivery errors for their own address.
  if (
    !event.locals.user &&
    event.url.pathname === '/api/auth/send-verification-email' &&
    event.request.method === 'POST' &&
    response.status !== 429
  ) {
    response = Response.json({ status: true, message: 'If eligible, verification was requested.' });
  }
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
};
