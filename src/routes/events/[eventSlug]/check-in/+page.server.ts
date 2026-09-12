import { attendancePage } from '$lib/server/attendance-page';
import { signedIn } from '$lib/server/http';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ locals, params }) =>
  attendancePage(signedIn(locals).id, params.eventSlug, 'confirmed');
