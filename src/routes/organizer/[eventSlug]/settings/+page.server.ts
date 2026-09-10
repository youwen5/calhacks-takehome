import { parseInstant } from '$lib/domain/time';
import {
  service,
  signedIn,
  loadData,
  actionData,
  formData,
  string,
  number,
} from '$lib/server/http';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  loadData(() => ({ members: service().members(signedIn(locals).id, params.eventSlug) }));
export const actions: Actions = {
  configure: async ({ locals, params, request }) => {
    const actor = signedIn(locals);
    const f = await formData(request);
    return actionData(() =>
      service().configure(
        actor.id,
        params.eventSlug,
        number(f, 'version'),
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
        string(f, 'status'),
        f.getAll('types').map(String),
      ),
    );
  },
  member: async ({ locals, params, request }) => {
    const actor = signedIn(locals);
    const f = await formData(request);
    return actionData(() =>
      service().changeMember(
        actor.id,
        params.eventSlug,
        string(f, 'email'),
        string(f, 'role') as 'manager' | 'reviewer' | 'remove',
      ),
    );
  },
};
