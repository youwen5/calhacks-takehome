<script lang="ts">
  let { data } = $props();
  const date = (n: number, tz: string) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: tz,
    }).format(n);
</script>

<svelte:head><title>Explore events · Colmena</title></svelte:head>
<div class="row spread page-head">
  <h1>Upcoming events</h1>
  <span class="badge">{data.events.length} events</span>
</div>
{#if !data.events.length}<div class="panel">
    <h2>No upcoming events</h2>
    <p class="muted">No events have been published yet. Check back soon.</p>
  </div>{/if}
<div class="grid">
  {#each data.events as event}<article class="panel event-card">
      <div class="row spread">
        <p class="eyebrow">{date(event.startsAt, event.timezone)}</p>
        <span class="badge {event.status}">{event.status}</span>
      </div>
      <h2>{event.name}</h2>
      <p class="muted">{event.venue}</p>
      <p>{event.description.slice(0, 180)}</p>
      <a class="button secondary" href="/events/{event.slug}">Explore event ↗</a>
    </article>{/each}
</div>

<style>
  .event-card {
    padding: 1.3rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .event-card .eyebrow {
    margin: 0;
  }
  .event-card h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  .event-card p {
    margin: 0;
  }
  .event-card .button {
    align-self: flex-start;
    margin-top: auto;
  }
</style>
