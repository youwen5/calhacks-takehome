import { eventDay } from '$lib/server/event-day';
import { database } from '$lib/server/db';
import { service, signedIn, loadData } from '$lib/server/http';
import { destinations, applicantDestinationVisible, canNavigate } from '$lib/navigation';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ locals, url }) =>
  loadData(() => {
    const actor = signedIn(locals),
      p = service(),
      access = p.identity(actor.id);
    const destination = destinations.find(
      (d) => d.key === (url.searchParams.get('for') || 'applications'),
    );
    if (!destination) error(400, 'Unknown destination.');
    return {
      destination,
      events: p
        .events(actor.id)
        .filter(
          (e) =>
            canNavigate(destination, e.id, access) &&
            (destination.scope !== 'applicant' ||
              applicantDestinationVisible(
                destination.key,
                eventDay(database()).participation(actor.id, e.slug),
              )),
        ),
    };
  });
