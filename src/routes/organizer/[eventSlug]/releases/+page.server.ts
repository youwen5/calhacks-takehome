import { service, signedIn, loadData, actionData, formData } from '$lib/server/http';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  loadData(() => ({
    candidates: service().releaseCandidates(signedIn(locals).id, params.eventSlug),
    ...service().releaseSummary(signedIn(locals).id, params.eventSlug),
  }));
export const actions: Actions = {
  default: async ({ locals, params, request }) => {
    const actor = signedIn(locals);
    const f = await formData(request);
    const result = actionData(() =>
      service().createRelease(actor.id, params.eventSlug, f.getAll('revisionIds').map(String)),
    );
    if ('ok' in result && result.ok)
      redirect(303, `/organizer/${params.eventSlug}/releases/${result.result}`);
    return result;
  },
};
