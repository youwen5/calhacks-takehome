import { error, json } from '@sveltejs/kit';
import { database } from '$lib/server/db';
import { verifyDemoEmail } from '$lib/server/demo';
import { loadData, signedIn } from '$lib/server/http';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals, request, url }) => {
  // JSON endpoints need an explicit origin check as well as session authentication.
  if (request.headers.get('origin') !== url.origin) error(403, 'Same-origin request required.');
  loadData(() => verifyDemoEmail(database(), signedIn(locals)));
  return json({ verified: true });
};
