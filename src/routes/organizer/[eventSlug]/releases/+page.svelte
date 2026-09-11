<script lang="ts">
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  let { data, form } = $props();
</script>

<svelte:head><title>Decision releases · Colmena</title></svelte:head>
<div class="page-head">
  <p class="eyebrow">{data.event.name}</p>
  <h1>Decision releases</h1>
  <p class="muted">
    Select prepared decisions to create an exact release preview. Nothing becomes visible until you
    publish it.
  </p>
</div>
<ActionNotice {form} />
<div class="notice">
  {data.counts.prepared} prepared · {data.counts.unfinished} excluded because the application or review
  is unfinished · {data.counts.total} total applications (excluding your own).
</div>
<form method="POST" class="panel">
  <div class="table-wrap">
    <table>
      <thead><tr><th>Select</th><th>Applicant</th><th>Type</th><th>Decision</th></tr></thead><tbody
        >{#each data.candidates as item}<tr
            ><td
              ><input
                type="checkbox"
                name="revisionIds"
                value={item.revisionId}
                aria-label="Release decision for {item.name}, {item.type}"
              /></td
            ><td>{item.name}</td><td>{item.type}</td><td
              ><span class="badge {item.value}">{item.value}</span></td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div>
  {#if !data.candidates.length}<p class="muted">
      No prepared decisions. Complete reviews and prepare decisions first.
    </p>{/if}<button
    style="margin-top:1.5rem"
    disabled={!data.candidates.length || data.event.status !== 'published'}
    >Create release preview →</button
  ><small
    >Up to 500 prepared decisions are shown. Your own applications are excluded. Incomplete reviews
    cannot enter a release.</small
  >
</form>
{#if data.batches.length}<section class="panel" style="margin-top:1.5rem">
    <h2>Recent release previews & publications</h2>
    {#each data.batches as batch}<p>
        <a href="/organizer/{data.event.slug}/releases/{batch.id}"
          >{new Date(batch.createdAt).toLocaleString()} · {batch.publishedAt
            ? 'Published'
            : 'Preview'}</a
        >
      </p>{/each}<small>Showing the most recent 50 releases you can access.</small>
  </section>{/if}
