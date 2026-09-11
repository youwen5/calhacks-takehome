<script lang="ts">
  import Distribution from '$lib/components/Distribution.svelte';
  let { data } = $props();
  const accepted = $derived(
    data.stats.statuses.find((row) => row.label === 'accepted')?.count ?? 0,
  );
</script>

<svelte:head><title>Application analytics · Colmena</title></svelte:head>
<div class="page-head"><h1>Application analytics</h1></div>
<form method="GET" class="row filters">
  <label
    >Application type<select name="type" value={data.type}
      ><option value="">All types</option><option value="hacker">Hacker</option><option
        value="mentor">Mentor</option
      ></select
    ></label
  ><button>Filter</button>
</form>
<div class="metrics">
  {#each [{ label: 'Applications', value: data.stats.total, tone: 'neutral' }, { label: 'Submitted', value: data.stats.submitted, tone: 'blue' }, { label: 'Needs review', value: data.stats.pending, tone: 'amber' }, { label: 'Accepted applicants', value: accepted, tone: 'emerald' }, { label: 'Reviewed', value: data.stats.reviewed, tone: 'violet' }, { label: 'Drafts', value: data.stats.drafts, tone: 'neutral' }] as metric}
    <section class="panel">
      <p class="muted">{metric.label}</p>
      <strong class={metric.tone}>{metric.value}</strong>
    </section>
  {/each}
</div>
<div class="charts">
  <div class="full-width">
    <Distribution title="Published statuses" rows={data.stats.statuses} statusColors />
  </div>
  <Distribution title="Application types" rows={data.stats.types} tone="blue" />
  <Distribution
    title="Completed review scores (out of 15)"
    rows={data.stats.scores}
    tone="violet"
  />
  <section class="full-width schools">
    <h2>Schools and organizations</h2>
    <div class="panel table-wrap">
      <table>
        <caption class="sr-only">Top schools and organizations from submitted applications</caption>
        <thead
          ><tr
            ><th scope="col">Rank</th><th scope="col">School or organization</th><th
              scope="col"
              class="numeric">Applications</th
            ><th scope="col" class="numeric">Percentage</th></tr
          ></thead
        >
        <tbody
          >{#each data.stats.organizations as row, i}<tr
              ><td>{i + 1}</td><td>{row.label}</td><td class="numeric">{row.count}</td><td
                class="numeric"
                >{(data.stats.submitted ? (row.count / data.stats.submitted) * 100 : 0).toFixed(
                  1,
                )}%</td
              ></tr
            >{/each}</tbody
        >
      </table>
      {#if !data.stats.organizations.length}<p class="muted">No submitted applications yet.</p>{/if}
    </div>
  </section>
  <div class="full-width">
    <Distribution
      title="Applications by submission date"
      rows={data.stats.timeline}
      tone="emerald"
    />
  </div>
</div>
<p class="hint" style="margin-top:16px">
  Dates use {data.event.timezone}. Organizations show the top 20 from submitted applications. Score
  totals exclude your own applications.
</p>

<style>
  .filters {
    align-items: end;
    margin-bottom: 24px;
  }
  .filters label {
    margin: 0;
  }
  .metrics {
    margin-bottom: 24px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
  }
  .metrics strong {
    font-size: 32px;
  }
  .charts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 32px 24px;
  }
  .full-width {
    grid-column: 1 / -1;
    min-width: 0;
  }
  .schools h2 {
    font-size: 24px;
    margin-bottom: 16px;
  }
  .numeric {
    text-align: right;
  }
  .blue {
    color: #2563eb;
  }
  .amber {
    color: #b45309;
  }
  .emerald {
    color: #059669;
  }
  .violet {
    color: #7c3aed;
  }
  :global([data-theme='dark']) .blue {
    color: #60a5fa;
  }
  :global([data-theme='dark']) .amber {
    color: #fbbf24;
  }
  :global([data-theme='dark']) .emerald {
    color: #34d399;
  }
  :global([data-theme='dark']) .violet {
    color: #a78bfa;
  }
  @media (max-width: 767px) {
    .metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .charts {
      grid-template-columns: 1fr;
    }
  }
</style>
