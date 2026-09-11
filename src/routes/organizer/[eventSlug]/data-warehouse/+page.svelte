<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>Data warehouse · Colmena</title></svelte:head>
<div class="page-head"><h1>Data warehouse</h1></div>
<div class="grid">
  {#each [{ kind: 'participants', title: 'Participants', count: data.counts.participants, detail: 'Names, emails, and verification status for people with an application to this event.' }, { kind: 'applications', title: 'Submitted applications', count: data.counts.applications, detail: 'Applicant details, responses, resume filenames, and published status. Draft responses stay private.' }, { kind: 'accepted', title: 'Accepted applicants', count: data.counts.accepted, detail: 'Submitted applications with a currently published acceptance, including released waitlist promotions.' }] as item}
    <section class="panel export-card">
      <h2>{item.title}</h2>
      <strong>{item.count} records</strong>
      <p class="muted">{item.detail}</p>
      <div class="row">
        {#each ['csv', 'json'] as format}<a
            class="button"
            class:secondary={format === 'json'}
            href={`/organizer/${data.event.slug}/data-warehouse/${item.kind}?format=${format}`}
            download>Export {format.toUpperCase()}</a
          >{/each}
      </div>
    </section>{/each}
</div>

<style>
  .export-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .export-card h2,
  .export-card p {
    margin: 0;
  }
  .export-card .row {
    margin-top: auto;
  }
</style>
