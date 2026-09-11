import { database } from '$lib/server/db';
import { eventDay } from '$lib/server/event-day';
import { signedIn, loadData, actionData, formData, string } from '$lib/server/http';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  loadData(() =>
    eventDay(database()).sponsorDetail(signedIn(locals).id, params.eventSlug, params.sponsorId),
  );
export const actions: Actions = {
  add: async ({ locals, params, request }) => {
    const actor = signedIn(locals),
      f = await formData(request);
    return actionData(() =>
      eventDay(database()).addCodes(
        actor.id,
        params.eventSlug,
        params.sponsorId,
        string(f, 'codes'),
      ),
    );
  },
  deleteCode: async ({ locals, params, request }) => {
    const actor = signedIn(locals),
      f = await formData(request);
    return actionData(() =>
      eventDay(database()).deleteCode(
        actor.id,
        params.eventSlug,
        params.sponsorId,
        string(f, 'codeId'),
      ),
    );
  },
  deleteSponsor: async ({ locals, params }) => {
    const result = actionData(() =>
      eventDay(database()).deleteSponsor(signedIn(locals).id, params.eventSlug, params.sponsorId),
    );
    if ('ok' in result && result.ok) redirect(303, '/organizer/' + params.eventSlug + '/sponsors');
    return result;
  },
};
