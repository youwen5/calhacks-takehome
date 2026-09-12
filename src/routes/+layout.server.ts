import { mailConfig } from '$lib/server/mail';
import { destinations, applicantDestinationVisible } from '$lib/navigation';
import { eventDay } from '$lib/server/event-day';
import { database } from '$lib/server/db';
import { demoEmailVerificationEnabled } from '$lib/server/demo';
import { service, loadData } from '$lib/server/http';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = ({ locals, params }) =>
  loadData(() => {
    const p = service();
    const event =
      locals.user && params.eventSlug ? p.event(params.eventSlug, locals.user.id) : null;
    const day = eventDay(database());
    // A selected event controls its own links. Outside event routes, show a
    // destination only if the user has an eligible event to choose from.
    const participation = locals.user
      ? (event ? [event] : p.events(locals.user.id)).map((e) =>
          day.participation(locals.user!.id, e.slug),
        )
      : [];
    const applicantNavigation = destinations
      .filter(
        (d) =>
          d.scope === 'applicant' &&
          (d.key === 'applications' ||
            participation.some((state) => applicantDestinationVisible(d.key, state))),
      )
      .map((d) => d.key);
    return {
      user: locals.user,
      emailEnabled: mailConfig().mode !== 'disabled',
      demoEmailVerification: demoEmailVerificationEnabled(),
      access: locals.user ? p.identity(locals.user.id) : { administrator: false, memberships: [] },
      applicantNavigation,
      navigationEvent: event ? { id: event.id, slug: event.slug, name: event.name } : null,
    };
  });
