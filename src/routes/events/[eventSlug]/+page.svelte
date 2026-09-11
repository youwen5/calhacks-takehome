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

<svelte:head><title>{data.event.name} · Colmena</title></svelte:head>
<a href="/events" class="muted">← All events</a>
<div class="event-layout">
  <div class="event-poster">
    <strong>{data.event.name}</strong><span>{date(data.event.startsAt)}</span>
  </div>
  <div>
    <div class="page-head">
      <h1>{data.event.name}</h1>
      <p>{data.event.description}</p>
      <div class="row">
        <span class="badge {data.event.status}">{data.event.status}</span><span
          >{data.event.venue}</span
        >
      </div>
    </div>
    <ol class="timeline" aria-label="Event timeline">
      {#each [{ title: 'Applications open', at: data.event.opensAt, detail: 'Start your hacker or mentor application.' }, { title: 'Applications close', at: data.event.closesAt, detail: 'Submit your application before this deadline.' }, { title: 'Event starts', at: data.event.startsAt, detail: data.event.venue }, { title: 'Event ends', at: data.event.endsAt, detail: 'The weekend wraps up.' }] as step}
        <li class:completed={Date.now() >= step.at}>
          <span class="timeline-dot" aria-hidden="true">{Date.now() >= step.at ? '✓' : ''}</span
          ><time datetime={new Date(step.at).toISOString()}>{date(step.at)}</time>
          <h3>{step.title}</h3>
          <p>{step.detail}</p>
        </li>
      {/each}
    </ol>
    <p class="hint">
      Times shown in {data.event.timezone}. Admission decisions appear after organizer release.
    </p>
    <h2>Applications</h2>
    <p class="muted">
      Choose an application below. You can apply to more than one type; each is reviewed separately.
    </p>
    <div class="grid">
      {#each data.event.types as offered}{@const definition = forms[offered.type]}{@const app =
          data.applications.find((a) => a.type === offered.type)?.application}
        <article class="panel">
          <div class="row spread">
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
  </div>
</div>

<style>
  .event-layout {
    display: grid;
    grid-template-columns: 1fr 3fr;
    gap: 24px;
    margin-top: 24px;
    align-items: start;
  }
  .event-poster {
    border-radius: 12px;
    padding: 16px;
    min-height: 360px;
    background:
      linear-gradient(#0008, #0008),
      url(/auth-splash.svg) center/cover;
    color: white;
  }
  .event-poster strong {
    display: block;
    font-size: 28px;
    line-height: 1.2;
  }
  .event-poster span {
    display: block;
    margin-top: 12px;
    font-size: 18px;
  }
  .timeline {
    list-style: none;
    padding: 0;
    margin: 24px 0;
  }
  .timeline li {
    position: relative;
    margin-left: 12px;
    padding: 0 0 32px 28px;
    border-left: 1px solid var(--color-border);
  }
  .timeline li:last-child {
    border-left-color: transparent;
    padding-bottom: 0;
  }
  .timeline-dot {
    position: absolute;
    left: -12px;
    top: 0;
    display: grid;
    place-items: center;
    border: 1px solid var(--color-border);
    background: var(--color-background);
    border-radius: 50%;
    width: 24px;
    height: 24px;
    font-size: 14px;
  }
  .completed .timeline-dot {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border: 0;
  }
  .timeline time {
    color: var(--color-muted-foreground);
    font-size: 12px;
  }
  .timeline h3 {
    font-size: 14px;
    font-weight: 600;
    margin: 4px 0;
  }
  .timeline p {
    font-size: 14px;
    color: var(--color-muted-foreground);
    margin: 0;
  }
  @media (max-width: 767px) {
    .event-layout {
      grid-template-columns: 1fr;
    }
    .event-poster {
      min-height: 180px;
    }
  }
</style>
