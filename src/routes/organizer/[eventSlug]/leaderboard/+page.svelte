<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>Reviewer leaderboard · Colmena</title></svelte:head>
<div class="page-head"><h1>Reviewer leaderboard</h1></div>
<nav class="row" aria-label="Leaderboard period" style="margin-bottom:24px">
  {#each [{ value: 'all', label: 'All time' }, { value: 'week', label: 'Last 7 days' }, { value: 'today', label: 'Today' }] as period}
    <a
      class="button"
      class:secondary={data.period !== period.value}
      href={`?period=${period.value}`}
      aria-current={data.period === period.value ? 'page' : undefined}>{period.label}</a
    >{/each}
</nav>
<div class="panel table-wrap">
  <table>
    <caption class="muted">Completed reviews · {data.event.timezone}</caption>
    <thead
      ><tr
        ><th>Rank</th><th>Reviewer</th><th>Reviews</th><th>Accepted</th><th>Waitlisted</th><th
          >Rejected</th
        ><th>Unreleased</th></tr
      ></thead
    >
    <tbody
      >{#each data.leaders as leader, i}<tr
          ><td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td><td>{leader.name}</td
          ><td>{leader.total}</td><td>{leader.accepted}</td><td>{leader.waitlisted}</td><td
            >{leader.rejected}</td
          ><td>{leader.unreleased}</td></tr
        >{/each}</tbody
    >
  </table>
  {#if !data.leaders.length}<p>No completed reviews in this period.</p>{/if}
</div>
<p class="hint" style="margin-top:16px">
  Outcomes reflect the latest published decision. Review counts include completed reviews awaiting
  release.
</p>
