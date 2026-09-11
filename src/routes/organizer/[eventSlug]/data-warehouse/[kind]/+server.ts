import { database } from '$lib/server/db';
import { reports, toCsv } from '$lib/server/reports';
import { signedIn, loadData } from '$lib/server/http';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = ({ locals, params, url }) => {
  const format = url.searchParams.get('format') || 'csv';
  if (!['csv', 'json'].includes(format)) error(400, 'Choose CSV or JSON.');
  const records = loadData(() =>
    reports(database()).export(signedIn(locals).id, params.eventSlug, params.kind),
  );
  return new Response(format === 'csv' ? toCsv(records) : JSON.stringify(records, null, 2), {
    headers: {
      'Content-Type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json',
      'Content-Disposition': 'attachment; filename="' + params.kind + '.' + format + '"',
      'Cache-Control': 'private, no-store',
    },
  });
};
