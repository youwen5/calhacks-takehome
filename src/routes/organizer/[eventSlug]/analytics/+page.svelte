<script lang="ts">
  import Distribution from '$lib/components/Distribution.svelte';
  let { data } = $props();
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
<div class="grid metrics">
  {#each [{ label: 'Applications', value: data.stats.total }, { label: 'Drafts', value: data.stats.drafts }, { label: 'Submitted', value: data.stats.submitted }, { label: 'Reviewed', value: data.stats.reviewed }, { label: 'Needs review', value: data.stats.pending }] as metric}
    <section class="panel">
      <p class="muted">{metric.label}</p>
      <strong>{metric.value}</strong>
    </section>{/each}
</div>
<div class="grid">
  <Distribution title="Published statuses" rows={data.stats.statuses} />
  <Distribution title="Application types" rows={data.stats.types} />
  <Distribution title="Applications by submission date" rows={data.stats.timeline} />
  <Distribution title="Schools and organizations" rows={data.stats.organizations} />
  <Distribution title="Completed review scores (out of 15)" rows={data.stats.scores} />
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
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
  .metrics strong {
    font-size: 32px;
  }
</style>
