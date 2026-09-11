<script lang="ts">
  let {
    title,
    rows,
    tone = 'blue',
    statusColors = false,
  }: {
    title: string;
    rows: { label: string; count: number }[];
    tone?: 'blue' | 'violet' | 'emerald';
    statusColors?: boolean;
  } = $props();
  const total = $derived(rows.reduce((sum, row) => sum + row.count, 0));
  const percentage = (count: number) => (total ? (count / total) * 100 : 0);
  const statuses: Record<string, string> = {
    accepted: '#10b981',
    rejected: '#f43f5e',
    waitlisted: '#f59e0b',
    submitted: '#3b82f6',
    draft: '#6b7280',
  };
  const tones = { blue: '#3b82f6', violet: '#8b5cf6', emerald: '#10b981' };
</script>

<section>
  <h2>{title}</h2>
  <div class="panel">
    {#if rows.length}<ul aria-label={title}>
        {#each rows as row}<li>
            <div class="row spread">
              <span class:status-label={statusColors}>{row.label}</span><span class="muted"
                >{row.count} ({percentage(row.count).toFixed(1)}%)</span
              >
            </div>
            <div class="track" aria-hidden="true">
              <div
                style:width={`${percentage(row.count)}%`}
                style:background={statusColors ? (statuses[row.label] ?? '#6b7280') : tones[tone]}
              ></div>
            </div>
          </li>{/each}
      </ul>{:else}<p class="muted">No data yet.</p>{/if}
  </div>
</section>

<style>
  h2 {
    font-size: 24px;
    margin-bottom: 16px;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 16px;
  }
  li .row {
    font-size: 14px;
  }
  .status-label {
    text-transform: capitalize;
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
    border-radius: 4px;
  }
</style>
