<script lang="ts">
  import { enhance } from '$app/forms';
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  let { data, form } = $props();
  let filter = $state('all'),
    search = $state('');
  const redeemed = $derived(data.codes.filter((c) => c.redeemedAt !== null).length);
  const filtered = $derived(
    data.codes.filter(
      (c) =>
        (filter === 'all' ||
          (filter === 'redeemed' ? c.redeemedAt !== null : c.redeemedAt === null)) &&
        `${c.value} ${c.name ?? ''} ${c.email ?? ''}`.toLowerCase().includes(search.toLowerCase()),
    ),
  );
</script>

<svelte:head><title>{data.sponsor.name} codes · Colmena</title></svelte:head>
<a href="/organizer/{data.event.slug}/sponsors">← All sponsors</a>
<div class="page-head row spread" style="margin-top:24px">
  <h1>{data.sponsor.name}</h1>
  <a
    class="button secondary"
    href="/organizer/{data.event.slug}/sponsors/{data.sponsor.id}/export"
    download>Export CSV</a
  >
</div>
<ActionNotice {form} />
<div class="grid" style="margin-bottom:24px">
  {#each [{ label: 'Total codes', value: data.codes.length }, { label: 'Available', value: data.codes.length - redeemed }, { label: 'Redeemed', value: redeemed }] as metric}<section
      class="panel"
    >
      <p class="muted">{metric.label}</p>
      <strong style="font-size:30px">{metric.value}</strong>
    </section>{/each}
</div>
<details class="panel" style="margin-bottom:24px">
  <summary>Add codes</summary>
  <form use:enhance method="POST" action="?/add">
    <label
      >Codes<textarea
        name="codes"
        placeholder="One code per line or separated by commas"
        required
        maxlength="60000"></textarea></label
    ><small>Up to 500 codes per upload. Repeated values are allowed for shared promo codes.</small
    ><button>Add codes</button>
  </form>
</details>
<div class="row filters">
  <label>Search codes<input bind:value={search} /></label><label
    >Status<select bind:value={filter}
      ><option value="all">All codes</option><option value="available">Available</option><option
        value="redeemed">Redeemed</option
      ></select
    ></label
  >
</div>
<div class="panel table-wrap">
  <table>
    <thead
      ><tr><th>Code</th><th>Status</th><th>Redeemed by</th><th>Redeemed at</th><th></th></tr></thead
    ><tbody
      >{#each filtered as code}<tr
          ><td class="code">{code.value}</td><td
            ><span class="badge" class:accepted={!!code.redeemedAt}
              >{code.redeemedAt ? 'Redeemed' : 'Available'}</span
            ></td
          ><td>{code.name ?? '—'}<small>{code.email ?? ''}</small></td><td
            >{code.redeemedAt
              ? new Date(code.redeemedAt).toLocaleString('en-US', { timeZone: data.event.timezone })
              : '—'}</td
          ><td
            >{#if !code.redeemedAt}<form use:enhance method="POST" action="?/deleteCode">
                <input type="hidden" name="codeId" value={code.id} /><button class="secondary"
                  >Delete code</button
                >
              </form>{/if}</td
          ></tr
        >{/each}</tbody
    >
  </table>
  {#if !filtered.length}<p>No codes match these filters.</p>{/if}
</div>
<details style="margin-top:24px">
  <summary>Delete sponsor</summary>
  <p>Unused codes will also be removed. Sponsors with redeemed codes are retained.</p>
  <form use:enhance method="POST" action="?/deleteSponsor">
    <button class="danger" disabled={redeemed > 0}>Delete sponsor and unused codes</button>
  </form>
</details>

<style>
  summary {
    cursor: pointer;
    font-weight: 600;
  }
  .filters {
    align-items: end;
    margin-bottom: 24px;
  }
  .filters label {
    margin: 0;
  }
  .code {
    max-width: 350px;
    overflow-wrap: anywhere;
  }
  details form > button {
    margin-top: 16px;
  }
</style>
