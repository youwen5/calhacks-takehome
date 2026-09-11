import { z } from 'zod';
import { database } from '$lib/server/db';
import { eventDay } from '$lib/server/event-day';
import { signedIn, loadData, actionData, formData, string, number } from '$lib/server/http';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  loadData(() => eventDay(database()).detail(signedIn(locals).id, params.eventSlug, params.userId));
export const actions: Actions = {
  checkIn: async ({ locals, params }) =>
    actionData(() =>
      eventDay(database()).checkIn(signedIn(locals).id, params.eventSlug, params.userId),
    ),
  meal: async ({ locals, params, request }) => {
    const actor = signedIn(locals),
      f = await formData(request);
    return actionData(() =>
      eventDay(database()).meal(
        actor.id,
        params.eventSlug,
        params.userId,
        string(f, 'meal'),
        z.enum(['true', 'false']).parse(string(f, 'used')) === 'true',
        number(f, 'version'),
      ),
    );
  },
};
