import { database } from '$lib/server/db';
import { reports } from '$lib/server/reports';
import { signedIn, loadData } from '$lib/server/http';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  loadData(() => ({
    counts: reports(database()).warehouse(signedIn(locals).id, params.eventSlug),
  }));
