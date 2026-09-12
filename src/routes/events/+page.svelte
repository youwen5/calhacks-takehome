<script lang="ts">
  import { demoAccounts, demoPassword } from '$lib/demo-accounts';
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
{#if data.demoAccounts}
  <aside class="demo-banner" aria-labelledby="demo-heading">
    <h2 id="demo-heading">Try the demo</h2>
    <p>Use any account below. Password for all accounts: <code>{demoPassword}</code></p>
    <div class="demo-accounts">
      {#each demoAccounts as account}<div>
          <strong>{account.role}</strong>
          <code>{account.email}</code>
          <small>{account.description}</small>
        </div>{/each}
    </div>
    <div class="row spread">
      <small>These accounts are shared. Changes are visible to everyone.</small><a
        class="button secondary"
        href="/login">Sign in to the demo →</a
      >
    </div>
  </aside>
{/if}
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
  .demo-banner {
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-card);
    padding: 24px;
    margin-bottom: 32px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .demo-banner h2,
  .demo-banner p {
    margin: 0;
  }
  .demo-accounts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
    gap: 18px 24px;
  }
  .demo-accounts > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .demo-banner code {
    overflow-wrap: anywhere;
  }
  .demo-banner small {
    margin: 0;
  }

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
