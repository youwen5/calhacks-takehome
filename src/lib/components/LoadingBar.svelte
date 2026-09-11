<script lang="ts">
  import { navigating } from '$app/state';
  let visible = $state(false);
  $effect(() => {
    // Match Storke's delayed top bar: quick navigations should not flash.
    if (!navigating.to) {
      visible = false;
      return;
    }
    const timer = setTimeout(() => {
      visible = true;
    }, 200);
    return () => clearTimeout(timer);
  });
</script>

{#if visible}
  <div class="loading-bar" role="progressbar" aria-label="Loading page">
    <span></span>
  </div>
{/if}

<style>
  .loading-bar {
    position: fixed;
    inset: 0 0 auto;
    z-index: 100;
    height: 4px;
    background: #174e3c;
    box-shadow: 0 1px 6px #174e3c40;
    animation: enter 150ms ease-out;
    pointer-events: none;
  }
  span {
    display: block;
    height: 100%;
    background: #ffffff60;
    transform-origin: left;
    animation: progress 2s ease-out forwards;
  }
  @keyframes enter {
    from {
      transform: translateY(-4px);
    }
    to {
      transform: translateY(0);
    }
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
