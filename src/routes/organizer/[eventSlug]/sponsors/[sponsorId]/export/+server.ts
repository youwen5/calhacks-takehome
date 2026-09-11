import { database } from '$lib/server/db';
import { eventDay } from '$lib/server/event-day';
import { toCsv } from '$lib/server/reports';
import { signedIn, loadData } from '$lib/server/http';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = ({ locals, params }) => {
  const data = loadData(() =>
    eventDay(database()).sponsorDetail(signedIn(locals).id, params.eventSlug, params.sponsorId),
  );
  return new Response(toCsv(data.codes), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sponsor-codes.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
};
