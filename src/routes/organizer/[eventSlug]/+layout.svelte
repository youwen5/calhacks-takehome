<script lang="ts">
  let { data, children } = $props();
</script>

<div class="row spread" style="margin-bottom:1rem">
  <a class="muted" href="/organizer">← Organizer workspace</a><span class="badge"
    >{data.role ?? 'Platform administrator'}</span
  >
</div>
<nav
  aria-label="Event organizer navigation"
  class="row"
  style="border-bottom:1px solid var(--color-border);padding-bottom:1rem;margin-bottom:2rem"
>
  {#if data.role}<a class="button secondary" href="/organizer/{data.event.slug}">Applications</a
    >{/if}
  {#if data.role === 'manager'}<a
      class="button secondary"
      href="/organizer/{data.event.slug}/releases">Decision releases</a
    >{/if}
  {#if data.role === 'manager' || data.access.administrator}<a
      class="button secondary"
      href="/organizer/{data.event.slug}/settings">Event & team settings</a
    >{/if}
  <a href="/events/{data.event.slug}">View event ↗</a>
</nav>
{@render children()}
