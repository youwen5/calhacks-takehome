<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
  let { data, form } = $props();
  let dialog: HTMLDialogElement;
  let selected = $state(''),
    name = $state(''),
    message = $state('');
  const link = $derived.by(() => {
    try {
      const u = new URL(selected);
      return ['https:', 'http:'].includes(u.protocol) ? u.href : null;
    } catch {
      return null;
    }
  });
  function show(code: string, sponsor: string) {
    selected = code;
    name = sponsor;
    message = '';
    dialog.showModal();
  }
  $effect(() => {
    if (form?.ok && typeof form.result === 'string' && dialog && !dialog.open)
      show(form.result, 'Your sponsor code');
  });
  async function copy() {
    try {
      await navigator.clipboard.writeText(selected);
      message = 'Code copied.';
    } catch {
      message = 'Could not copy. Select and copy the code below.';
    }
  }
</script>

<svelte:head><title>Sponsor codes · Colmena</title></svelte:head>
<div class="page-head"><h1>Sponsor Codes</h1></div>
<ActionNotice {form} />
{#if !data.attendance?.checkedInAt}<p class="notice">
    Check in at the event before redeeming sponsor codes.
  </p>
  <a href="/events/{data.event.slug}/check-in">View your event pass →</a>{/if}
<div class="grid" style="margin-top:24px">
  {#each data.sponsors as sponsor}<section class="panel sponsor">
      <div class="sponsor-heading">
        <h2>{sponsor.name}</h2>
        <span class="badge" class:accepted={!!sponsor.ownCode}
          >{sponsor.ownCode ? 'Redeemed' : sponsor.available ? 'Available' : 'Sold out'}</span
        >
      </div>
      {#if sponsor.ownCode}<button
          class="secondary"
          disabled={!ready}
          onclick={() => show(sponsor.ownCode!, sponsor.name)}>View code</button
        >{:else}<form use:enhance method="POST" action="?/redeem">
          <input type="hidden" name="sponsorId" value={sponsor.id} /><button
            disabled={!sponsor.available ||
              !data.attendance?.checkedInAt ||
              data.event.status !== 'published'}>Redeem code</button
          >
        </form>{/if}
    </section>{/each}
</div>
{#if !data.sponsors.length}<p class="notice">No sponsor codes are available yet.</p>{/if}
<dialog bind:this={dialog}>
  <div class="row spread">
    <h2>{name}</h2>
    <button class="secondary" onclick={() => dialog.close()} aria-label="Close code">×</button>
  </div>
  <p>Your code</p>
  <pre>{selected}</pre>
  <div class="row">
    <button onclick={copy}>Copy code</button>{#if link}<a
        class="button secondary"
        href={link}
        target="_blank"
        rel="noopener noreferrer">Open link ↗</a
      >{/if}
  </div>
  <p role="status">{message}</p>
</dialog>

<style>
  .sponsor {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .sponsor form button {
    width: 100%;
  }
  .sponsor-heading .badge {
    margin-top: 8px;
  }
  .sponsor h2 {
    margin: 0;
  }
  .sponsor > button,
  .sponsor > form {
    margin-top: auto;
    width: 100%;
  }
  dialog {
    /* Restore native modal centering after the global margin reset. */
    margin: auto;
    inset: 0;
    max-height: calc(100dvh - 32px);
    overflow: auto;
    max-width: 500px;
    width: calc(100% - 32px);
    padding: 24px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-card);
    color: var(--color-foreground);
  }
  dialog::backdrop {
    background: #0008;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    padding: 16px;
    background: var(--color-muted);
    border-radius: 8px;
  }
</style>
