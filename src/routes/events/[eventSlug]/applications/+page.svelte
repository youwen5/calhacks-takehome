<script lang="ts">
  import ApplicationChoices from '$lib/components/ApplicationChoices.svelte';
  let { data } = $props();
</script>

<svelte:head><title>My applications · Colmena</title></svelte:head>
<div class="page-head">
  <h1>My applications</h1>
  <p class="muted">{data.event.name}</p>
</div>
<ApplicationChoices event={data.event} applications={data.applications} signedIn />
