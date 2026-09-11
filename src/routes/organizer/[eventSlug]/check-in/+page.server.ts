import { database } from '$lib/server/db';
import { eventDay } from '$lib/server/event-day';
import { signedIn, loadData } from '$lib/server/http';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  loadData(() => eventDay(database()).roster(signedIn(locals).id, params.eventSlug));
