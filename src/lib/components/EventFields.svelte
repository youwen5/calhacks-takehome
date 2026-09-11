<script lang="ts">
  import { onMount } from 'svelte';
  let ready = $state(false);
  onMount(() => {
    // Wait until hydration has settled before accepting edits or client actions.
    const frame = requestAnimationFrame(() => {
      ready = true;
    });
    return () => cancelAnimationFrame(frame);
  });
  let {
    event,
  }: {
    event?: {
      name: string;
      slug: string;
      description: string;
      venue: string;
      timezone: string;
      opensAt: number;
      closesAt: number;
      startsAt: number;
      endsAt: number;
      decisionsAt: number | null;
      checkInAt: number | null;
      openingCeremonyAt: number | null;
    };
  } = $props();
</script>

<fieldset disabled={!ready} style="border:0;margin:0;padding:0">
  <label>Event name<input name="name" value={event?.name ?? ''} required maxlength="100" /></label>
  {#if !event}<label
      >URL slug<input
        name="slug"
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        placeholder="cal-hacks-fall"
        required
      /></label
    >{/if}
  <label
    >Description<textarea name="description" required minlength="10" maxlength="3000"
      >{event?.description ?? ''}</textarea
    ></label
  >
  <div class="grid">
    <label>Venue<input name="venue" value={event?.venue ?? ''} required /></label><label
      >Display timezone<input
        name="timezone"
        value={event?.timezone ?? 'America/Los_Angeles'}
        required
      /></label
    >
  </div>
  <p class="muted">
    Enter dates with an explicit offset (for example, 2026-10-10T09:00:00-07:00). This avoids
    ambiguous daylight-saving times. They will display in the event timezone.
  </p>
  <div class="grid">
    {#each [{ key: 'opensAt', label: 'Applications open' }, { key: 'closesAt', label: 'Applications close' }, { key: 'startsAt', label: 'Event starts' }, { key: 'endsAt', label: 'Event ends' }] as field}<label
        >{field.label}<input
          name={field.key}
          value={event ? new Date(event[field.key as 'opensAt']).toISOString() : ''}
          placeholder="2026-10-10T09:00:00-07:00"
          required
        /></label
      >{/each}
  </div>
  <p class="muted">
    Optional schedule: if blank, decisions are scheduled halfway between application close and event
    start, check-in at event start, and the opening ceremony one hour after check-in (or halfway to
    event end for shorter events). These dates do not publish admission decisions.
  </p>
  <div class="grid">
    {#each [{ key: 'decisionsAt', label: 'Decisions released (scheduled)' }, { key: 'checkInAt', label: 'Check in' }, { key: 'openingCeremonyAt', label: 'Opening ceremony' }] as field}
      {@const value = event?.[field.key as 'decisionsAt']}
      <label
        >{field.label}<input
          name={field.key}
          value={value == null ? '' : new Date(value).toISOString()}
          placeholder="Use default schedule"
        /></label
      >
    {/each}
  </div>
</fieldset>
