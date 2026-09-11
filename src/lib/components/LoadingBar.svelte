<script lang="ts">
  import { navigating } from '$app/state';
  import { MediaQuery } from 'svelte/reactivity';
  import { fly } from 'svelte/transition';
  const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
  const visible = $derived(Boolean(navigating.to));
</script>

{#if visible}
  <div
    class="loading-bar"
    role="progressbar"
    aria-label="Loading page"
    in:fly={{ y: -4, duration: reducedMotion.current ? 0 : 150 }}
    out:fly={{ y: -4, duration: reducedMotion.current ? 0 : 150 }}
  >
    <span></span>
  </div>
{/if}

<style>
  .loading-bar {
    position: fixed;
    inset: 0 0 auto;
    z-index: 100;
    height: 4px;
    background: var(--color-primary);
    box-shadow: 0 1px 6px #00000030;
    pointer-events: none;
  }
  span {
    display: block;
    height: 100%;
    background: color-mix(in srgb, var(--color-primary-foreground) 30%, transparent);
    transform-origin: left;
    animation: progress 2s ease-out forwards;
  }
  @keyframes progress {
    from {
      transform: scaleX(0);
    }
    50% {
      transform: scaleX(0.6);
    }
    to {
      transform: scaleX(0.95);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .loading-bar,
    span {
      animation: none;
    }
    span {
      transform: scaleX(0.6);
    }
  }
</style>
