<script lang="ts">
  import { page } from '$app/state';
  let { data } = $props();
  const pageLink = (n: number) => {
    const params = new URLSearchParams(page.url.searchParams);
    params.set('page', String(n));
    return '?' + params;
  };
</script>

<svelte:head><title>Applications · {data.event.name}</title></svelte:head>
<div class="page-head">
  <p class="eyebrow">{data.event.name}</p>
  <div class="row spread">
    <h1>Meet your next community.</h1>
    <span class="badge">{data.queue.total} applications</span>
  </div>
  <p class="muted">Review thoughtfully. Prepare decisions. Publish when you’re ready.</p>
</div>
<form method="GET" class="panel row" style="margin-bottom:1.5rem">
  <label style="flex:2"
    >Search<input
      name="search"
      value={data.filters.search}
      placeholder="Name or email"
      maxlength="100"
    /></label
  ><label style="flex:1"
    >Type<select name="type" value={data.filters.type}
      ><option value="">All types</option><option value="hacker">Hacker</option><option
        value="mentor">Mentor</option
      ></select
    ></label
  ><label style="flex:1"
    >Published status<select name="status" value={data.filters.status}
      ><option value="">All statuses</option
      >{#each ['draft', 'submitted', 'accepted', 'waitlisted', 'rejected'] as status}<option
          value={status}>{status}</option
        >{/each}</select
    ></label
  ><button>Filter</button>
</form>
<div class="panel table-wrap">
  <table>
    <thead
      ><tr
        ><th>Applicant</th><th>Type</th><th>Review</th><th>Visible status</th><th
          >Prepared decision</th
        ></tr
      ></thead
    ><tbody
      >{#each data.queue.rows as row}<tr
          ><td
            >{#if row.submission === 'submitted'}<a
                href="/organizer/{data.event.slug}/applications/{row.id}">{row.name}</a
              >{:else}{row.name}{/if}<small>{row.email}</small></td
          ><td><span class="badge">{row.type}</span></td><td
            >{row.submission === 'draft'
              ? 'Private draft'
              : row.reviewedAt
                ? 'Completed'
                : 'Needs review'}</td
          ><td><span class="badge {row.status}">{row.status}</span></td><td
            >{row.prepared ?? '—'}</td
          ></tr
        >{/each}</tbody
    >
  </table>
  {#if !data.queue.rows.length}<p style="padding-top:1rem" class="muted">
      No applications match these filters.
    </p>{/if}
</div>
<div class="row spread" style="margin-top:1rem">
  <span class="muted">Page {data.queue.page} of {data.queue.pages}</span>
  <div class="row">
    {#if data.queue.page > 1}<a href={pageLink(data.queue.page - 1)}>← Previous</a
      >{/if}{#if data.queue.page < data.queue.pages}<a href={pageLink(data.queue.page + 1)}
        >Next →</a
      >{/if}
  </div>
</div>
