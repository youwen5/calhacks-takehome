<script lang="ts">
  import { enhance } from '$app/forms';
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  let { data, form } = $props();
  let pending = $state(false);
</script>

<svelte:head><title>Confirm attendance · Colmena</title></svelte:head>
<div class="confirmation">
  <div class="page-head"><h1>Confirm attendance</h1></div>
  <section class="panel">
    <h2>{data.event.name}</h2>
    <p>
      Your application was accepted. Confirm that you’ll attend to unlock your event pass and
      sponsor codes.
    </p>
    <ActionNotice {form} />
    {#if data.applicationDietary}<p>
        Dietary restrictions on your application: {data.applicationDietary}
      </p>{/if}
    <form
      method="POST"
      use:enhance={() => {
        pending = true;
        return async ({ update }) => {
          try {
            await update();
          } finally {
            pending = false;
          }
        };
      }}
    >
      <label
        >Dietary restrictions (optional)<textarea name="dietary" maxlength="1000" disabled={pending}
        ></textarea></label
      >
      <button disabled={pending || data.event.status !== 'published'}
        >{pending ? 'Confirming…' : 'Confirm attendance'}</button
      >
    </form>
    {#if data.event.status !== 'published'}<p class="notice">
        Attendance confirmation is closed for this event.
      </p>{/if}
  </section>
</div>

<style>
  .confirmation {
    max-width: 640px;
    margin: 24px auto;
  }
  .panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .panel h2,
  .panel p {
    margin: 0;
  }
</style>
