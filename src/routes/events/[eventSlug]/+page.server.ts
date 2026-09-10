import { service, loadData } from '$lib/server/http';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ params, locals }) =>
  loadData(() => {
    const p = service();
    const event = p.event(params.eventSlug, locals.user?.id);
    return {
      event,
      applications: locals.user
        ? event.types.map((t) => p.applicant(event.slug, locals.user!.id, t.type))
        : [],
    };
  });
