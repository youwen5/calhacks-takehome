<script lang="ts">
  import EventFields from '$lib/components/EventFields.svelte';
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  let { data, form } = $props();
  let creating = $state(false);
  $effect(() => {
    if (form?.ok === false) creating = true;
  });
</script>

<svelte:head><title>Organizer workspace · Colmena</title></svelte:head>
<div class="page-head row spread">
  <h1>Organizer workspace</h1>
  {#if data.access.administrator}<button
      class="secondary"
      aria-expanded={creating}
      aria-controls="create-event"
      onclick={() => (creating = !creating)}>{creating ? 'Cancel' : 'Create event'}</button
    >{/if}
</div>
<ActionNotice {form} />
{#if data.access.administrator && creating}<section
    class="panel"
    id="create-event"
    style="margin-bottom:2rem"
  >
    <h2>Create an event</h2>
    <form method="POST" action="?/create">
      <EventFields /><label
        >Initial manager email<input name="manager" type="email" required /></label
      ><button>Create draft event</button>
    </form>
  </section>{/if}
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
