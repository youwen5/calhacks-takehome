<script lang="ts">
  import { forms } from '$lib/domain/forms';
  let { data } = $props();
  const date = (n: number) =>
    new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: data.event.timezone,
    }).format(n);
</script>

<svelte:head><title>{data.event.name} · Cal Hacks</title></svelte:head>
<a href="/events" class="muted">← All events</a>
<div class="page-head" style="margin-top:2rem">
  <p class="eyebrow">HYPOTHETICAL CAL HACKS EVENT</p>
  <h1>{data.event.name}</h1>
  <p>{data.event.description}</p>
  <div class="row">
    <span class="badge {data.event.status}">{data.event.status}</span><span>{data.event.venue}</span
    >
  </div>
</div>
<div class="panel" style="margin-bottom:2rem">
  <div class="grid">
    <div>
      <h3>The event</h3>
      <p class="muted">{date(data.event.startsAt)} – {date(data.event.endsAt)}</p>
    </div>
    <div>
      <h3>Application window</h3>
      <p class="muted">{date(data.event.opensAt)} – {date(data.event.closesAt)}</p>
    </div>
  </div>
  <small
    >All dates shown in {data.event.timezone}. Decisions appear here after organizer release.</small
  >
</div>
<h2>How will you be part of it?</h2>
<p class="muted">
  Choose an application below. You can apply to more than one type; each is reviewed separately.
</p>
<div class="grid">
  {#each data.event.types as offered}{@const definition = forms[offered.type]}{@const app =
      data.applications.find((a) => a.type === offered.type)?.application}
    <article class="panel">
      <div class="row spread">
        <p class="eyebrow">
          {offered.type === 'hacker' ? 'BRING YOUR CURIOSITY' : 'SHARE WHAT YOU KNOW'}
        </p>
        {#if app}<span class="badge {app.status}">{app.status}</span>{/if}
      </div>
      <h2>{definition.label}</h2>
      <p class="muted">{definition.description}</p>
      <a
        class="button"
        href={data.user ? `/events/${data.event.slug}/applications/${offered.type}` : '/login'}
        >{app
          ? app.status === 'draft'
            ? 'Continue application'
            : 'View application'
          : 'Apply as a ' + offered.type} ↗</a
      >
    </article>{/each}
</div>
