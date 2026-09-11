<script lang="ts">
  import { enhance } from '$app/forms';
  import QRCode from 'qrcode';
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { meals } from '$lib/domain/event-day';
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  let { data, form } = $props();
  let qr = $state(''),
    qrError = $state(''),
    enlarged = $state(false);
  let qrButton = $state<HTMLButtonElement>();
  let wake: WakeLockSentinel | null = null;
  const used = $derived(data.meals.filter((m) => m.usedAt !== null).length);
  $effect(() => {
    let cancelled = false;
    QRCode.toDataURL(`${location.origin}/organizer/${data.event.slug}/check-in/${data.user!.id}`, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
      .then((value) => {
        if (!cancelled) qr = value;
      })
      .catch(() => {
        qrError = 'Could not generate your pass. Reload to try again.';
      });
    return () => {
      cancelled = true;
    };
  });
  async function enlarge() {
    if (!qrButton) return;
    enlarged = !enlarged;
    try {
      if (enlarged && qrButton.requestFullscreen) await qrButton.requestFullscreen();
      else if (!enlarged && document.fullscreenElement === qrButton)
        await document.exitFullscreen();
    } catch {
      /* The viewport overlay remains available when native fullscreen is unsupported. */
    }
    if (enlarged && 'wakeLock' in navigator) {
      try {
        wake = await navigator.wakeLock.request('screen');
      } catch {
        /* Optional on unsupported/low-power devices. */
      }
    } else {
      await wake?.release();
      wake = null;
    }
  }
  onMount(() => {
    const fullscreenChanged = () => {
      if (!document.fullscreenElement) {
        enlarged = false;
        void wake?.release();
        wake = null;
      }
    };
    document.addEventListener('fullscreenchange', fullscreenChanged);
    const refresh = () => {
      if (document.visibilityState === 'visible' && !enlarged) void invalidateAll();
    };
    const timer = setInterval(refresh, 15_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      document.removeEventListener('fullscreenchange', fullscreenChanged);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      void wake?.release();
    };
  });
</script>

<svelte:head><title>Your event pass · Colmena</title></svelte:head>
<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && enlarged) void enlarge();
  }}
/>
<div class="pass">
  <header>
    <h1>Your Event Pass</h1>
    <p class="muted">Hi, {data.user?.name}</p>
  </header>
  <ActionNotice {form} />
  {#if !data.accepted}<p class="notice">A published acceptance is required for this event.</p>
    <a href="/events/{data.event.slug}/applications">View your applications</a>
  {:else}
    {#if !data.attendance}<section class="panel">
        <h2>Confirm attendance</h2>
        <form use:enhance method="POST" action="?/confirm">
          <label
            >Dietary restrictions (optional)<textarea name="dietary" maxlength="1000"
            ></textarea></label
          ><button disabled={data.event.status !== 'published'}>Confirm attendance</button>
        </form>
      </section>{/if}
    <button
      bind:this={qrButton}
      class="qr-button"
      class:enlarged
      onclick={enlarge}
      aria-label={enlarged ? 'Close enlarged QR code' : 'Tap to view QR code fullscreen'}
      >{#if qr}<img src={qr} alt="QR code for check-in and meal ticketing" />{:else}<span
          >{qrError || 'Generating QR code…'}</span
        >{/if}<span class="enlarge-tip">{enlarged ? 'Tap anywhere to exit' : 'Tap to enlarge'}</span
      ></button
    >
    <div class="instruction">
      <span>🎟️</span>
      <div><strong>Event Check-In</strong><small>Show to an organizer at the venue</small></div>
    </div>
    <div class="instruction">
      <span>🍴</span>
      <div><strong>Meal Ticket</strong><small>Also your ticket for all meals</small></div>
    </div>
    <p class="tip muted">Keep this page handy throughout the event</p>
    <section class="check-status">
      <h2>Check-in Status</h2>
      <div class="instruction" class:used={!!data.attendance?.checkedInAt}>
        <span>{data.attendance?.checkedInAt ? '✓' : '◷'}</span>
        <div>
          <strong>{data.attendance?.checkedInAt ? 'Checked In' : 'Not Checked In'}</strong><small
            >{data.attendance?.checkedInAt
              ? 'You’re all set! Enjoy the event.'
              : 'Show this QR code to an organizer'}</small
          >
        </div>
      </div>
    </section>
    <section>
      <div class="row spread">
        <h2>Your Meal Tickets</h2>
        <small>{used}/{meals.length} used</small>
      </div>
      <div class="meal-grid">
        {#each meals as meal}{@const isUsed = data.meals.some(
            (m) => m.meal === meal.id && m.usedAt !== null,
          )}
          <div class="instruction" class:used={isUsed}>
            <span>{meal.emoji}</span>
            <div><strong>{meal.label}</strong><small>{isUsed ? 'Used' : 'Available'}</small></div>
          </div>{/each}
      </div>
    </section>
    {#if data.sponsors.length}<section>
        <h2>Sponsor Codes</h2>
        <a class="instruction perk" href="/events/{data.event.slug}/codes"
          ><span>🎁</span>
          <div>
            <strong>Redeem Free Perks</strong><small
              >{data.sponsors.map((s) => s.name).join(', ')}</small
            >
          </div>
          <span>›</span></a
        >
      </section>{/if}
  {/if}
</div>

<style>
  .pass {
    max-width: 320px;
    margin: 24px auto;
    padding-bottom: 24px;
  }
  header {
    text-align: center;
    margin-bottom: 16px;
  }
  h1 {
    font-size: 24px;
    margin-bottom: 4px;
  }
  h2 {
    font-size: 14px;
    margin-bottom: 12px;
  }
  section {
    margin-top: 20px;
  }
  .qr-button {
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    background: white;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    overflow: hidden;
    margin: 16px 0;
    aspect-ratio: 1;
  }
  .qr-button img {
    display: block;
    width: 100%;
    height: auto;
  }
  .enlarge-tip {
    position: absolute;
    bottom: 8px;
    right: 8px;
    color: white;
    background: #000b;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
  }
  .qr-button.enlarged {
    position: fixed;
    inset: 0;
    z-index: 100;
    width: 100vw;
    height: 100dvh;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 0;
  }
  .enlarged img {
    width: min(85vw, 85vh);
    height: auto;
  }
  .instruction {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-card);
    margin-top: 8px;
  }
  .instruction strong {
    font-size: 14px;
    display: block;
  }
  .instruction small {
    font-size: 12px;
    display: block;
    margin: 0;
  }
  .instruction > span {
    font-size: 22px;
  }
  .used {
    border-color: #10b98180;
    background: #10b98115;
  }
  .used strong,
  .used small {
    color: #059669;
  }
  :global([data-theme='dark']) .used strong,
  :global([data-theme='dark']) .used small {
    color: #34d399;
  }
  .tip {
    font-size: 12px;
    text-align: center;
    margin: 16px 0;
  }
  .check-status {
    border-top: 1px solid var(--color-border);
    padding-top: 16px;
  }
  .meal-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .meal-grid .instruction {
    margin: 0;
    gap: 8px;
  }
  .perk {
    text-decoration: none;
  }
  .perk:hover {
    background: var(--color-accent);
  }
</style>
