<script lang="ts">
  import { destinationUrl } from '$lib/navigation';
  let { data } = $props();
</script>

<svelte:head><title>Select an event · Colmena</title></svelte:head>
<div class="page-head">
  <h1>Select an event</h1>
  <p class="muted">{data.destination.label}</p>
</div>
<div class="grid">
  {#each data.events as event}<article class="panel event-choice">
      <h2>{event.name}</h2>
      <p class="muted">{event.venue}</p>
      <a class="button secondary" href={destinationUrl(data.destination, event.slug)}
        >Select {event.name} →</a
      >
    </article>{/each}
</div>
{#if !data.events.length}<p class="notice">No events are available for this section.</p>{/if}

<style>
  .event-choice {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .event-choice h2,
  .event-choice p {
    margin: 0;
  }
  .event-choice .button {
    align-self: flex-start;
    margin-top: auto;
  }
</style>
