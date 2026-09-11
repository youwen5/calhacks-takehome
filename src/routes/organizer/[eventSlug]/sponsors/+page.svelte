<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
  let { data, form } = $props();
  let creating = $state(false);
</script>

<svelte:head><title>Manage sponsor codes · Colmena</title></svelte:head>
<div class="page-head row spread">
  <h1>Sponsor Management</h1>
  <button disabled={!ready} onclick={() => (creating = !creating)}>Add Sponsor</button>
</div>
<ActionNotice {form} />
{#if creating}<form
    use:enhance
    class="panel"
    method="POST"
    action="?/create"
    style="margin-bottom:24px"
  >
    <label>Sponsor name<input name="name" required maxlength="100" /></label><button
      >Create sponsor</button
    >
  </form>{/if}
<div class="grid">
  {#each data.sponsors as sponsor}<section class="panel">
      <h2>{sponsor.name}</h2>
      <div class="row spread">
        <p>{sponsor.total} codes</p>
        <p>{sponsor.redeemed} redeemed</p>
      </div>
      <div class="track">
        <div style:width={`${sponsor.total ? (sponsor.redeemed / sponsor.total) * 100 : 0}%`}></div>
      </div>
      <a class="button secondary" href="/organizer/{data.event.slug}/sponsors/{sponsor.id}"
        >Manage codes →</a
      >
    </section>{/each}
</div>
{#if !data.sponsors.length}<p class="notice">
    No sponsors yet. Add a sponsor to upload their codes.
  </p>{/if}

<style>
  .track {
    height: 8px;
    background: var(--color-muted);
    border-radius: 4px;
    margin-bottom: 24px;
    overflow: hidden;
  }
  .track > div {
    height: 100%;
    background: #10b981;
  }
</style>
