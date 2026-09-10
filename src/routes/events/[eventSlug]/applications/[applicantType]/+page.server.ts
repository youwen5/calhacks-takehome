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
import { fail } from '@sveltejs/kit';
export const load: PageServerLoad = ({ params, locals }) =>
  loadData(() => service().applicant(params.eventSlug, signedIn(locals).id, params.applicantType));
export const actions: Actions = {
  default: async ({ params, locals, request }) => {
    const actor = signedIn(locals);
    const f = await formData(request);
    const values = Object.fromEntries(f);
    const result = actionData(() =>
      service().saveApplication(
        params.eventSlug,
        actor.id,
        params.applicantType,
        number(f, 'version'),
        values,
        string(f, 'intent') === 'submit',
      ),
    );
    if ('status' in result) return fail(result.status, { ...result.data, values });
    return result;
  },
};
