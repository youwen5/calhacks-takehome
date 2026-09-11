<script lang="ts">
  import QrScanner from '$lib/components/QrScanner.svelte';
  import { meals, scannedUser } from '$lib/domain/event-day';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
  let { data } = $props();
  let search = $state(''),
    filter = $state('all'),
    scanning = $state(false),
    pass = $state(''),
    error = $state('');
  let opening = false;
  onMount(() => {
    try {
      scanning = localStorage.getItem('colmena-scanner-enabled') === 'true';
    } catch {
      /* Storage is optional. */
    }
  });
  function setScanner(open: boolean) {
    scanning = open;
    try {
      localStorage.setItem('colmena-scanner-enabled', String(open));
    } catch {
      /* Storage is optional. */
    }
  }
  const stats = $derived({
    accepted: data.people.filter((p) => p.accepted).length,
    confirmed: data.people.filter((p) => p.confirmedAt).length,
    checked: data.people.filter((p) => p.checkedInAt).length,
    pending: data.people.filter((p) => p.confirmedAt && !p.checkedInAt).length,
  });
  const funnel = $derived([
    { label: 'Accepted', count: stats.accepted, color: '#10b981' },
    { label: 'Confirmed', count: stats.confirmed, color: '#8b5cf6' },
    { label: 'Checked in', count: stats.checked, color: '#3b82f6' },
  ]);
  const percentage = (n: number, total: number) => (total ? Math.min(100, (n / total) * 100) : 0);
  const filtered = $derived(
    data.people.filter(
      (p) =>
        (filter === 'all' ||
          (filter === 'accepted'
            ? p.accepted
            : filter === 'confirmed'
              ? !!p.confirmedAt
              : !!p.checkedInAt)) &&
        `${p.name} ${p.email} ${p.organization ?? ''}`.toLowerCase().includes(search.toLowerCase()),
    ),
  );
  function scan(value: string) {
    if (opening) return;
    const id = scannedUser(value, data.event.slug, location.origin);
    if (!id) {
      error = 'This is not a valid pass for this event.';
      return;
    }
    opening = true;
    scanning = false;
    void goto(`/organizer/${data.event.slug}/check-in/${id}`);
  }
</script>

<svelte:head><title>Check-in management · Colmena</title></svelte:head>
<div class="page-head row spread">
  <h1>Check-In and Meals</h1>
  <button disabled={!ready} onclick={() => setScanner(!scanning)}>Scan QR Code</button>
</div>
{#if scanning}<QrScanner onScan={scan} onClose={() => setScanner(false)} />{/if}
<div class="grid metrics">
  {#each [...funnel, { label: 'Pending check-in', count: stats.pending, color: '#f59e0b' }] as item}
    <section class="panel">
      <p class="muted">{item.label}</p>
      <strong style:color={item.color}>{item.count}</strong>
    </section>
  {/each}
</div>
<section class="panel chart">
  <h2>Attendee Funnel</h2>
  {#each funnel as item}<div class="bar-row">
      <span>{item.label}</span>
      <div class="track">
        <div
          style:width={percentage(item.count, stats.accepted) + '%'}
          style:background={item.color}
        ></div>
      </div>
      <span>{item.count}</span>
    </div>{/each}
</section>
<section class="panel chart meal-chart">
  <h2>Meal Tickets Used</h2>
  {#each meals as meal, i}{@const count =
      data.mealStats.find((m) => m.meal === meal.id)?.count ?? 0}
    <div class="bar-row">
      <span>{meal.label}</span>
      <div class="track">
        <div
          style:width={percentage(count, stats.checked) + '%'}
          style:background={['#f59e0b', '#10b981', '#f97316', '#8b5cf6'][i]}
        ></div>
      </div>
      <span>{count} / {stats.checked}</span>
    </div>
  {/each}
</section>
<form
  class="row scan-form"
  onsubmit={(e) => {
    e.preventDefault();
    scan(pass);
  }}
>
  <label>Pass URL or user ID<input bind:value={pass} required /></label><button class="secondary"
    >Open pass</button
  >
</form>
{#if error}<p role="alert" class="notice error">{error}</p>{/if}
<div class="row filter-tabs" role="group" aria-label="Attendee status">
  {#each [{ id: 'all', label: 'All', count: data.people.length }, { id: 'accepted', label: 'Accepted', count: stats.accepted }, { id: 'confirmed', label: 'Confirmed', count: stats.confirmed }, { id: 'checked', label: 'Checked in', count: stats.checked }] as option}
    <button
      disabled={!ready}
      class:secondary={filter !== option.id}
      aria-pressed={filter === option.id}
      onclick={() => (filter = option.id)}>{option.label} ({option.count})</button
    >
  {/each}
</div>
<div class="row filters">
  <label
    >Search attendees<input
      disabled={!ready}
      bind:value={search}
      placeholder="Name, email, or organization"
    /></label
  >
</div>
<div class="panel table-wrap">
  <table>
    <thead
      ><tr
        ><th>Name</th><th>Email</th><th>Organization</th><th>Accepted</th><th>Confirmed</th><th
          >Checked in</th
        ><th></th></tr
      ></thead
    ><tbody
      >{#each filtered as person}<tr
          ><td>{person.name}</td><td>{person.email}</td><td>{person.organization || '—'}</td><td
            >{person.accepted ? 'Yes' : 'No'}</td
          ><td>{person.confirmedAt ? 'Yes' : 'No'}</td><td
            ><span class="badge" class:accepted={!!person.checkedInAt}
              >{person.checkedInAt ? 'Checked in' : 'Pending'}</span
            ></td
          ><td><a href="/organizer/{data.event.slug}/check-in/{person.id}">View</a></td></tr
        >{/each}</tbody
    >
  </table>
  {#if !filtered.length}<p>No attendees match these filters.</p>{/if}
</div>

<style>
  .metrics {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-bottom: 24px;
    gap: 16px;
  }
  .metrics strong {
    font-size: 24px;
  }
  .chart {
    margin-bottom: 24px;
    padding: 16px;
  }
  .chart h2 {
    font-size: 14px;
    margin-bottom: 16px;
  }
  .bar-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
    font-size: 12px;
  }
  .bar-row > span:first-child {
    width: 80px;
  }
  .bar-row > span:last-child {
    width: 64px;
    text-align: right;
  }
  .track {
    flex: 1;
    background: var(--color-muted);
    border-radius: 6px;
    height: 12px;
    overflow: hidden;
  }
  .track > div {
    height: 100%;
    border-radius: 6px;
  }
  .meal-chart .track {
    height: 32px;
  }
  .filter-tabs {
    margin-bottom: 16px;
  }
  .scan-form,
  .filters {
    align-items: end;
    margin-bottom: 24px;
  }
  .scan-form label,
  .filters label {
    margin: 0;
    flex: 1;
    min-width: 180px;
  }
  @media (max-width: 600px) {
    .metrics {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
