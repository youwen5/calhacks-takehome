/** Optional event milestones use predictable hypothetical defaults, never release decisions. */
export function eventSchedule(event: {
  closesAt: number;
  startsAt: number;
  endsAt: number;
  decisionsAt?: number | null;
  checkInAt?: number | null;
  openingCeremonyAt?: number | null;
}) {
  const checkInAt = event.checkInAt ?? event.startsAt;
  return {
    decisionsAt: event.decisionsAt ?? Math.floor((event.closesAt + event.startsAt) / 2),
    checkInAt,
    openingCeremonyAt:
      event.openingCeremonyAt ??
      Math.min(checkInAt + 3_600_000, Math.floor((checkInAt + event.endsAt) / 2)),
  };
}
