import { service, signedIn, loadData } from '$lib/server/http';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = ({ locals, params }) =>
  loadData(() => {
    const actor = signedIn(locals);
    const p = service();
    const event = p.event(params.eventSlug, actor.id);
    const access = p.identity(actor.id);
    const role = access.memberships.find((m) => m.eventId === event.id)?.role;
    if (!role && !access.administrator) error(403, 'Event organizer access required.');
    return { event, role: role ?? null };
  });
