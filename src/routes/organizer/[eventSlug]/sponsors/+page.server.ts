import { database } from '$lib/server/db';
import { eventDay } from '$lib/server/event-day';
import { signedIn, loadData, actionData, formData, string } from '$lib/server/http';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  loadData(() => ({
    sponsors: eventDay(database()).sponsors(signedIn(locals).id, params.eventSlug),
  }));
export const actions: Actions = {
  create: async ({ locals, params, request }) => {
    const actor = signedIn(locals),
      f = await formData(request);
    const result = actionData(() =>
      eventDay(database()).createSponsor(actor.id, params.eventSlug, string(f, 'name')),
    );
    if ('ok' in result && result.ok)
      redirect(303, '/organizer/' + params.eventSlug + '/sponsors/' + result.result);
    return result;
  },
};
