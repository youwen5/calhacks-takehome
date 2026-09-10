<script lang="ts">
  let { form }: { form?: { ok?: boolean; message?: string } | null } = $props();
</script>

{#if form?.message}<div class="notice error" role="alert">
    {form.message}
  </div>{:else if form?.ok}<div class="notice" role="status">Changes saved.</div>{/if}
