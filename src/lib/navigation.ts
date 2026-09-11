// URL-based event context keeps multiple tabs independent. This list also constrains
// event-picker destinations; arbitrary redirect URLs are never accepted.
export const destinations = [
  {
    key: 'applications',
    label: 'My applications',
    scope: 'applicant',
    path: 'applications',
    icon: 'files',
  },
  { key: 'pass', label: 'Event pass & meals', scope: 'applicant', path: 'check-in', icon: 'qr' },
  { key: 'codes', label: 'Sponsor codes', scope: 'applicant', path: 'codes', icon: 'gift' },
  { key: 'checkin', label: 'Check-in & meals', scope: 'team', path: 'check-in', icon: 'qr' },
  {
    key: 'sponsors',
    label: 'Manage sponsor codes',
    scope: 'manager',
    path: 'sponsors',
    icon: 'gift',
  },
  { key: 'review', label: 'Applications', scope: 'team', path: '', icon: 'files' },
  {
    key: 'analytics',
    label: 'Application analytics',
    scope: 'team',
    path: 'analytics',
    icon: 'chart',
  },
  { key: 'leaderboard', label: 'Leaderboard', scope: 'team', path: 'leaderboard', icon: 'trophy' },
  {
    key: 'warehouse',
    label: 'Data warehouse',
    scope: 'manager',
    path: 'data-warehouse',
    icon: 'database',
  },
  { key: 'releases', label: 'Decision releases', scope: 'manager', path: 'releases', icon: 'send' },
  {
    key: 'settings',
    label: 'Event & team settings',
    scope: 'settings',
    path: 'settings',
    icon: 'settings',
  },
] as const;
export type Destination = (typeof destinations)[number];
export type EventAccess = {
  administrator: boolean;
  memberships: { eventId: string; role: string }[];
};
export function canNavigate(destination: Destination, eventId: string, access: EventAccess) {
  const role = access.memberships.find((m) => m.eventId === eventId)?.role;
  return (
    destination.scope === 'applicant' ||
    (destination.scope === 'team'
      ? !!role
      : role === 'manager' || (destination.scope === 'settings' && access.administrator))
  );
}
export function destinationUrl(destination: Destination, slug: string) {
  return `${destination.scope === 'applicant' ? '/events' : '/organizer'}/${encodeURIComponent(slug)}${destination.path ? '/' + destination.path : ''}`;
}
