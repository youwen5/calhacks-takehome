import { attendancePage } from '$lib/server/attendance-page';
import { database } from '$lib/server/db';
import { eventDay } from '$lib/server/event-day';
import { signedIn, actionData, formData, string } from '$lib/server/http';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  attendancePage(signedIn(locals).id, params.eventSlug, 'confirmed');
export const actions: Actions = {
  redeem: async ({ locals, params, request }) => {
    const actor = signedIn(locals),
      f = await formData(request);
    return actionData(() =>
      eventDay(database()).redeem(actor.id, params.eventSlug, string(f, 'sponsorId')),
    );
  },
};
