import { service } from '$lib/server/http';
export const load = ({ locals }: { locals: App.Locals }) => ({
  user: locals.user,
  access: locals.user
    ? service().identity(locals.user.id)
    : { administrator: false, memberships: [] },
});
