import { parseInstant } from '$lib/domain/time';
import {
  service,
  loadData,
  signedIn,
  actionData,
  formData,
  string,
  number,
} from '$lib/server/http';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals }) =>
  loadData(() => {
    const actor = signedIn(locals);
    const p = service();
    const access = p.identity(actor.id);
    return {
      events: p.managedEvents(actor.id),
      access,
    };
  });
export const actions: Actions = {
  delete: async ({ locals, request }) => {
    const actor = signedIn(locals),
      f = await formData(request);
    return actionData(() =>
      service().deleteEvent(
        actor.id,
        string(f, 'slug'),
        number(f, 'version'),
        string(f, 'confirmation'),
      ),
    );
  },
  archive: async ({ locals, request }) => {
    const actor = signedIn(locals),
      f = await formData(request);
    return actionData(() =>
      service().archiveEvent(actor.id, string(f, 'slug'), number(f, 'version')),
    );
  },
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
          decisionsAt: string(f, 'decisionsAt') ? parseInstant(string(f, 'decisionsAt')) : null,
          checkInAt: string(f, 'checkInAt') ? parseInstant(string(f, 'checkInAt')) : null,
          openingCeremonyAt: string(f, 'openingCeremonyAt')
            ? parseInstant(string(f, 'openingCeremonyAt'))
            : null,
        },
        string(f, 'slug'),
        string(f, 'manager'),
      ),
    );
    if ('ok' in result && result.ok) redirect(303, `/organizer/${result.result}/settings`);
    return result;
  },
};
