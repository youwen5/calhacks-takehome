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
</fieldset>
