<script lang="ts">
  let { title, rows }: { title: string; rows: { label: string; count: number }[] } = $props();
  const max = $derived(Math.max(1, ...rows.map((row) => row.count)));
</script>

<section class="panel">
  <h2>{title}</h2>
  {#if rows.length}<ul aria-label={title}>
      {#each rows as row}<li>
          <div class="row spread"><span>{row.label}</span><strong>{row.count}</strong></div>
          <div class="track" aria-hidden="true">
            <div style:width={`${(row.count / max) * 100}%`}></div>
          </div>
        </li>{/each}
    </ul>{:else}<p class="muted">No data yet.</p>{/if}
</section>

<style>
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 16px;
  }
  .track {
    height: 8px;
    border-radius: 4px;
    background: var(--color-muted);
    margin-top: 6px;
    overflow: hidden;
  }
  .track > div {
    height: 100%;
    background: var(--color-primary);
    border-radius: 4px;
  }
</style>
