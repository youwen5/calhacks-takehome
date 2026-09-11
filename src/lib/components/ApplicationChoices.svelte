<script lang="ts">
  import { forms, type ApplicationType } from '$lib/domain/forms';
  let {
    event,
    applications,
    signedIn,
  }: {
    event: { slug: string; types: { type: ApplicationType }[] };
    applications: { type: ApplicationType; application: { status: string } | null }[];
    signedIn: boolean;
  } = $props();
</script>

<section class="event-applications" aria-labelledby="applications-heading">
  <h2 id="applications-heading">Applications</h2>
  <p class="muted">
    Choose an application below. You can apply to more than one type; each is reviewed separately.
  </p>
  <div class="grid">
    {#each event.types as offered}{@const definition = forms[offered.type]}{@const app =
        applications.find((a) => a.type === offered.type)?.application}
      <article class="panel application-card">
        <div class="application-card-heading">
          <h2>{definition.label}</h2>
          {#if app}<span class="badge {app.status}">{app.status}</span>{/if}
        </div>
        <p class="muted">{definition.description}</p>
        <a
          class="button"
          href={signedIn ? `/events/${event.slug}/applications/${offered.type}` : '/login'}
          >{app
            ? app.status === 'draft'
              ? 'Continue application'
              : 'View application'
            : 'Apply as a ' + offered.type} ↗</a
        >
      </article>{/each}
  </div>
</section>

<style>
  .application-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .application-card-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 32px;
  }
  .application-card h2,
  .application-card p {
    margin: 0;
  }
  .application-card .button {
    margin-top: auto;
    align-self: flex-start;
  }
  .event-applications > p {
    margin: 12px 0 20px;
  }
</style>
