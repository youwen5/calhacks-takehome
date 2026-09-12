import { redirect } from '@sveltejs/kit';
import { database } from './db';
import { eventDay } from './event-day';
import { loadData } from './http';

// Gate page data before loading the pass or previously redeemed sponsor codes.
export function attendancePage(actor: string, slug: string, stage: 'accepted' | 'confirmed') {
  return loadData(() => {
    const day = eventDay(database());
    const state = day.participation(actor, slug);
    const base = `/events/${encodeURIComponent(slug)}`;
    if (!state.accepted) redirect(303, `${base}/applications`);
    if (!state.attendance && stage === 'confirmed') redirect(303, `${base}/confirm-attendance`);
    if (state.attendance && stage === 'accepted') redirect(303, `${base}/check-in`);
    return day.pass(actor, slug);
  });
}
