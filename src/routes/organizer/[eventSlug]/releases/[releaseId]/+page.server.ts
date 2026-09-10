import { service, signedIn, loadData, actionData } from '$lib/server/http';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  loadData(() => ({
    release: service().releaseDetail(signedIn(locals).id, params.eventSlug, params.releaseId),
  }));
export const actions: Actions = {
  default: ({ locals, params }) =>
    actionData(() => service().publish(signedIn(locals).id, params.eventSlug, params.releaseId)),
};
