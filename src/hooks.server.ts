import { mailConfig } from '$lib/server/mail';
import { building, dev } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle, ServerInit } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth';

export const init: ServerInit = () => {
  if (!building) getAuth();
};
export const handle: Handle = async ({ event, resolve }) => {
  if (building) return resolve(event);
  // Better Auth's SvelteKit handler matches the configured origin exactly.
  // Canonicalize loopback browser visits before rendering a form that cannot log in.
  if (dev && (event.request.method === 'GET' || event.request.method === 'HEAD')) {
    const canonical = new URL(process.env.BETTER_AUTH_URL || 'http://localhost:5173');
    const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
    if (
      loopback.has(event.url.hostname) &&
      loopback.has(canonical.hostname) &&
      event.url.port === canonical.port &&
      event.url.origin !== canonical.origin
    ) {
      return new Response(null, {
        status: 307,
        headers: {
          Location: `${canonical.origin}${event.url.pathname}${event.url.search}`,
          'Cache-Control': 'no-store',
        },
      });
    }
  }
  const length = Number(event.request.headers.get('content-length') || 0);
  const applicationUpload =
    event.request.method === 'POST' &&
    /^\/events\/[^/]+\/applications\/[^/]+$/.test(event.url.pathname);
  if (length > (applicationUpload ? 2 * 1024 * 1024 + 65_536 : 65_536))
    return new Response('Request too large.', { status: 413 });
  const auth = getAuth();
  event.locals.user = (await auth.api.getSession({ headers: event.request.headers }))?.user ?? null;
  let response = await svelteKitHandler({ event, resolve, auth, building });
  // Public resend must not reveal account existence through provider failures.
  // Signed-in applicants retain actionable delivery errors for their own address.
  if (
    mailConfig().mode !== 'disabled' &&
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
  if (!response.headers.has('X-Frame-Options')) response.headers.set('X-Frame-Options', 'DENY');
  return response;
};
