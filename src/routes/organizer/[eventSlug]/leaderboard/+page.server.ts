import { database } from '$lib/server/db';
import { reports } from '$lib/server/reports';
import { signedIn, loadData } from '$lib/server/http';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ locals, params, url }) =>
  loadData(() => {
    const period = url.searchParams.get('period') || 'all';
    return {
      leaders: reports(database()).leaderboard(signedIn(locals).id, params.eventSlug, period),
      period,
    };
  });
