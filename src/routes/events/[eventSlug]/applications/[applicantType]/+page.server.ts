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
    const f = await formData(request, 2 * 1024 * 1024 + 65_536);
    const values = Object.fromEntries([...f].filter(([, value]) => typeof value === 'string'));
    const file = f.get('resume');
    const upload =
      file instanceof File && file.size
        ? { filename: file.name, bytes: Buffer.from(await file.arrayBuffer()) }
        : string(f, 'removeResume') === 'yes'
          ? null
          : undefined;
    const result = actionData(() =>
      service().saveApplication(
        params.eventSlug,
        actor.id,
        params.applicantType,
        number(f, 'version'),
        values,
        string(f, 'intent') === 'submit',
        upload,
      ),
    );
    if ('status' in result) return fail(result.status, { ...result.data, values });
    return {
      ...result,
      version: number(f, 'version') + 1,
      savedAt: Date.now(),
      applicationId: result.result,
      resume:
        service().applicant(params.eventSlug, actor.id, params.applicantType).application?.resume ??
        null,
    };
  },
};
