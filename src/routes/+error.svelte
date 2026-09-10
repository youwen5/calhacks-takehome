<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="panel">
  <p class="eyebrow">{page.status}</p>
  <h1>Let’s get you back on track.</h1>
  <p>{page.error?.message || 'Something went wrong.'}</p>
  <a class="button" href="/events">Back to events</a>
</div>
