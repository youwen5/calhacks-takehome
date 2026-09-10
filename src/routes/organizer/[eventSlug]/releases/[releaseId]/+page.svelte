<script lang="ts">
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  let { data, form } = $props();
</script>

<svelte:head><title>Release preview · Cal Hacks</title></svelte:head>
<div class="page-head">
  <p class="eyebrow">EXACT RELEASE PREVIEW</p>
  <h1>{data.release.publishedAt ? 'The next chapter is open.' : 'One last look.'}</h1>
  <p class="muted">
    {data.release.items.length} decisions in this release. Publication makes these results visible to
    their applicants.
  </p>
</div>
<ActionNotice {form} />
<div class="row" style="margin-bottom:1.5rem">
  {#each ['accepted', 'waitlisted', 'rejected'] as value}<span class="badge {value}"
      >{value}: {data.release.items.filter((i) => i.value === value).length}</span
    >{/each}
</div>
<div class="panel table-wrap">
  <p class="muted">
    Hacker: {data.release.items.filter((i) => i.type === 'hacker').length} · Mentor: {data.release.items.filter(
      (i) => i.type === 'mentor',
    ).length}
  </p>
  <table>
    <thead><tr><th>Applicant</th><th>Type</th><th>Decision</th><th>Revision</th></tr></thead><tbody
      >{#each data.release.items as item}<tr
          ><td>{item.name}</td><td>{item.type}</td><td>{item.value}</td><td>#{item.sequence}</td
          ></tr
        >{/each}</tbody
    >
  </table>
  {#if data.release.publishedAt}<p class="notice" style="margin-top:1.5rem">
      Published {new Date(data.release.publishedAt).toLocaleString()}. Applicants can now see these
      decisions.
    </p>{:else}<form method="POST">
      <p class="muted" style="margin-top:1.5rem">
        If any decision changed since this preview, the entire release will be rejected. No partial
        publication.
      </p>
      <button disabled={data.event.status !== 'published'}
        >Publish {data.release.items.length} decisions</button
      >
    </form>{/if}
  <p style="margin-top:1rem">
    <a href="/organizer/{data.event.slug}/releases">← Back to prepared decisions</a>
  </p>
</div>
