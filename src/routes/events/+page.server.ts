import { service } from '$lib/server/http';
export const load = ({ locals }: { locals: App.Locals }) => ({
  events: service().events(locals.user?.id),
});
