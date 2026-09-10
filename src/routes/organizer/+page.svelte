<script lang="ts">
  import EventFields from '$lib/components/EventFields.svelte';
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  let { data, form } = $props();
</script>

<svelte:head><title>Organizer workspace · Cal Hacks</title></svelte:head>
<div class="page-head">
  <p class="eyebrow">BEHIND EVERY GREAT WEEKEND</p>
  <h1>Organizer workspace</h1>
  <p class="muted">A focused place to welcome the next community of builders.</p>
</div>
<ActionNotice {form} />
<div class="grid">
  {#each data.events as event}<article class="panel">
      <span class="badge {event.status}">{event.status}</span>
      <h2 style="margin-top:1rem">{event.name}</h2>
      <p>{event.venue}</p>
      <a
        class="button secondary"
        href="/organizer/{event.slug}/{data.access.memberships.some((m) => m.eventId === event.id)
          ? ''
          : 'settings'}">Open workspace ↗</a
      >
    </article>{/each}
</div>
{#if !data.events.length}<p class="notice">
    You don’t have any event assignments yet. An event manager can add your registered email.
  </p>{/if}
{#if data.access.administrator}<section class="panel" style="margin-top:2rem">
    <h2>Create an event</h2>
    <p class="muted">Start a new event without changing configuration or redeploying.</p>
    <form method="POST" action="?/create">
      <EventFields /><label
        >Initial manager email<input name="manager" type="email" required /></label
      ><button>Create draft event</button>
    </form>
  </section>{/if}
