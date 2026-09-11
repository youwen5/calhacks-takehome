<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import EventFields from '$lib/components/EventFields.svelte';
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
  let { data, form } = $props();
  let creating = $state(false);
  $effect(() => {
    if (form?.ok === false && page.url.searchParams.has('/create')) creating = true;
  });
</script>

<svelte:head><title>Manage events · Colmena</title></svelte:head>
<div class="page-head row spread">
  <h1>Manage events</h1>
  {#if data.access.administrator}<button
      class="secondary"
      disabled={!ready}
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
  {#each data.events as { event, applicationCount }}<article class="panel event-card">
      <div class="row spread">
        <h2>{event.name}</h2>
        <span class="badge {event.status}">{event.status}</span>
      </div>
      <p class="muted">{event.venue}</p>
      <p>{applicationCount} applications</p>
      <div class="row">
        <a class="button secondary" href="/organizer/{event.slug}/settings">Edit event</a>
        {#if event.status === 'published'}<form method="POST" action="?/archive">
            <input type="hidden" name="slug" value={event.slug} /><input
              type="hidden"
              name="version"
              value={event.version}
            />
            <button class="secondary">Archive event</button>
          </form>{/if}
      </div>
      {#if data.access.administrator && applicationCount === 0}<details>
          <summary>Delete event</summary>
          <form method="POST" action="?/delete">
            <input type="hidden" name="slug" value={event.slug} /><input
              type="hidden"
              name="version"
              value={event.version}
            />
            <p>Deleting this event permanently removes its settings and team assignments.</p>
            <label
              >Type {event.slug} to confirm<input
                name="confirmation"
                required
                autocomplete="off"
              /></label
            >
            <button class="danger">Permanently delete event</button>
          </form>
        </details>{:else if applicationCount > 0}<small
          >Events with applications are retained. Archive them to stop new activity.</small
        >{/if}
    </article>{/each}
</div>
{#if !data.events.length}<p class="notice">No events to manage yet.</p>{/if}

<style>
  .event-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .event-card h2,
  .event-card p {
    margin: 0;
  }
  .event-card .row form {
    margin: 0;
  }
  .event-card details {
    border-top: 1px solid var(--color-border);
    padding-top: 16px;
  }
  .event-card summary {
    cursor: pointer;
    font-size: 14px;
    color: var(--color-destructive);
  }
  .event-card details form {
    margin-top: 16px;
  }
</style>
