import { demoAccountsEnabled } from '$lib/server/demo';
import { service } from '$lib/server/http';
export const load = ({ locals }: { locals: App.Locals }) => ({
  demoAccounts: demoAccountsEnabled(),
  events: service().events(locals.user?.id),
});
