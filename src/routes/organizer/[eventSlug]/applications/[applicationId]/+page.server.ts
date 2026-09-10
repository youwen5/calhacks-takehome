import {
  service,
  signedIn,
  loadData,
  actionData,
  formData,
  string,
  number,
} from '$lib/server/http';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  loadData(() =>
    service().reviewDetail(signedIn(locals).id, params.eventSlug, params.applicationId),
  );
export const actions: Actions = {
  claim: async ({ locals, params, request }) => {
    const actor = signedIn(locals);
    const f = await formData(request);
    return actionData(() =>
      service().claim(
        actor.id,
        params.eventSlug,
        params.applicationId,
        string(f, 'operation') as 'acquire' | 'renew' | 'release',
        string(f, 'token'),
      ),
    );
  },
  review: async ({ locals, params, request }) => {
    const actor = signedIn(locals);
    const f = await formData(request);
    const values = {
      score1: string(f, 'score1') ? number(f, 'score1') : null,
      score2: string(f, 'score2') ? number(f, 'score2') : null,
      score3: string(f, 'score3') ? number(f, 'score3') : null,
      notes: string(f, 'notes'),
    };
    const result = actionData(() =>
      service().saveReview(
        actor.id,
        params.eventSlug,
        params.applicationId,
        string(f, 'token'),
        number(f, 'version'),
        values,
        string(f, 'intent') === 'complete',
      ),
    );
    if ('status' in result) return fail(result.status, { ...result.data, reviewValues: values });
    return result;
  },
  decision: async ({ locals, params, request }) => {
    const actor = signedIn(locals);
    const f = await formData(request);
    return actionData(() =>
      service().prepareDecision(
        actor.id,
        params.eventSlug,
        params.applicationId,
        string(f, 'value'),
        string(f, 'reason'),
        number(f, 'sequence'),
      ),
    );
  },
  cancel: async ({ locals, params, request }) => {
    const actor = signedIn(locals);
    const f = await formData(request);
    return actionData(() =>
      service().cancelDecision(
        actor.id,
        params.eventSlug,
        params.applicationId,
        string(f, 'revisionId'),
      ),
    );
  },
};
