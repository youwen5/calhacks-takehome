import { parseInstant } from '$lib/domain/time';
import { service, signedIn, actionData, formData, string } from '$lib/server/http';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals }) => {
  const actor = signedIn(locals);
  const p = service();
  const access = p.identity(actor.id);
  return {
    events: access.administrator
      ? p.events(actor.id)
      : p.events(actor.id).filter((e) => access.memberships.some((m) => m.eventId === e.id)),
    access,
  };
};
export const actions: Actions = {
  create: async ({ locals, request }) => {
    const actor = signedIn(locals);
    const f = await formData(request);
    const result = actionData(() =>
      service().createEvent(
        actor.id,
        {
          name: string(f, 'name'),
          description: string(f, 'description'),
          venue: string(f, 'venue'),
          timezone: string(f, 'timezone'),
          opensAt: parseInstant(string(f, 'opensAt')),
          closesAt: parseInstant(string(f, 'closesAt')),
          startsAt: parseInstant(string(f, 'startsAt')),
          endsAt: parseInstant(string(f, 'endsAt')),
        },
        string(f, 'slug'),
        string(f, 'manager'),
      ),
    );
    if ('ok' in result && result.ok) redirect(303, `/organizer/${result.result}/settings`);
    return result;
  },
};
