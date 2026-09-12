import { redirect } from '@sveltejs/kit';
import { attendancePage } from '$lib/server/attendance-page';
import { database } from '$lib/server/db';
import { eventDay } from '$lib/server/event-day';
import { signedIn, actionData, formData, string } from '$lib/server/http';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals, params }) => {
  const { event, applicationDietary } = attendancePage(
    signedIn(locals).id,
    params.eventSlug,
    'accepted',
  );
  return { event, applicationDietary };
};
export const actions: Actions = {
  default: async ({ locals, params, request }) => {
    const actor = signedIn(locals),
      f = await formData(request);
    const result = actionData(() =>
      eventDay(database()).confirm(actor.id, params.eventSlug, string(f, 'dietary')),
    );
    if ('ok' in result && result.ok)
      redirect(303, `/events/${encodeURIComponent(params.eventSlug)}/check-in`);
    return result;
  },
};
