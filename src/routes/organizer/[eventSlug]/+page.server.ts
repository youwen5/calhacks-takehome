import { service, signedIn, loadData } from '$lib/server/http';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ params, locals, url }) =>
  loadData(() => ({
    queue: service().queue(signedIn(locals).id, params.eventSlug, {
      type: url.searchParams.get('type') || undefined,
      status: url.searchParams.get('status') || undefined,
      search: url.searchParams.get('search') || undefined,
      page: Number(url.searchParams.get('page') || 1),
    }),
    filters: {
      type: url.searchParams.get('type') ?? '',
      status: url.searchParams.get('status') ?? '',
      search: url.searchParams.get('search') ?? '',
    },
  }));
