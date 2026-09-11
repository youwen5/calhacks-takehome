export const meals = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'lunch', label: 'Lunch', emoji: '🍱' },
  { id: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { id: 'snack', label: 'Snack', emoji: '🍪' },
] as const;
export function scannedUser(value: string, slug: string, origin: string) {
  // Better Auth uses random URL-safe IDs; legacy/imported IDs may be UUIDs.
  const userId = /^[a-zA-Z0-9_-]{1,128}$/;
  if (userId.test(value.trim())) return value.trim();
  try {
    const url = new URL(value);
    const prefix = `/organizer/${encodeURIComponent(slug)}/check-in/`;
    if (url.origin !== origin || !url.pathname.startsWith(prefix)) return null;
    const id = url.pathname.slice(prefix.length);
    return userId.test(id) ? id : null;
  } catch {
    return null;
  }
}
