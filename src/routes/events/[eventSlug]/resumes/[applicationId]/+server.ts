import { service, signedIn, loadData } from '$lib/server/http';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = ({ locals, params }) => {
  const file = loadData(() =>
    service().resume(signedIn(locals).id, params.eventSlug, params.applicationId),
  );
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="resume.pdf"',
      'Content-Length': String(file.bytes.length),
      'Cache-Control': 'private, no-store',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "sandbox; frame-ancestors 'self'",
    },
  });
};
