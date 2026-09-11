import { service, loadData } from '$lib/server/http';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = ({ locals, params }) =>
  loadData(() => {
    const p = service();
    const event =
      locals.user && params.eventSlug ? p.event(params.eventSlug, locals.user.id) : null;
    return {
      user: locals.user,
      access: locals.user ? p.identity(locals.user.id) : { administrator: false, memberships: [] },
      navigationEvent: event ? { id: event.id, slug: event.slug, name: event.name } : null,
    };
  });
