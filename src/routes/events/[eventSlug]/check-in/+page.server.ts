import { database } from '$lib/server/db';
import { eventDay } from '$lib/server/event-day';
import { signedIn, loadData, actionData, formData, string } from '$lib/server/http';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  loadData(() => eventDay(database()).pass(signedIn(locals).id, params.eventSlug));
export const actions: Actions = {
  confirm: async ({ locals, params, request }) => {
    const actor = signedIn(locals),
      f = await formData(request);
    return actionData(() =>
      eventDay(database()).confirm(actor.id, params.eventSlug, string(f, 'dietary')),
    );
  },
};
