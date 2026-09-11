import { service, signedIn, loadData } from '$lib/server/http';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  loadData(() => {
    const actor = signedIn(locals),
      p = service(),
      event = p.event(params.eventSlug, actor.id);
    return {
      event,
      applications: event.types.map((t) => p.applicant(event.slug, actor.id, t.type)),
    };
  });
