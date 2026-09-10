<script lang="ts">
  let { data } = $props();
  const date = (n: number, tz: string) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: tz,
    }).format(n);
</script>

<svelte:head><title>Explore events · Cal Hacks</title></svelte:head>
<section class="hero">
  <div>
    <p class="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</p>
    <h1>Your next great idea<br />starts here.</h1>
    <p>
      Find a weekend worth making things for.<br />Join as a hacker. Give back as a mentor. Make it
      yours.
    </p>
    <a href="#events" class="button">Find your event <span aria-hidden="true">↘</span></a>
  </div>
  <div class="art" aria-hidden="true">
    <span class="asterisk">✳</span><span class="orbit"></span><span class="tiny"
      >BUILD / LEARN / BELONG</span
    >
  </div>
</section>
<div id="events" class="row spread page-head">
  <div>
    <p class="eyebrow">FIND YOUR PEOPLE</p>
    <h2>Upcoming & past events</h2>
  </div>
  <span class="badge">{data.events.length} events</span>
</div>
{#if !data.events.length}<div class="panel">
    <h2>Good things are on the way.</h2>
    <p class="muted">No events have been published yet. Check back soon.</p>
  </div>{/if}
<div class="grid">
  {#each data.events as event, i}<article class="panel event-card">
      <div class="event-art" class:gold={i % 2 === 1}>
        <span aria-hidden="true">{i % 2 ? '↗' : '✳'}</span><span class="badge"
          >HYPOTHETICAL EVENT</span
        >
      </div>
      <div class="row spread">
        <p class="eyebrow">{date(event.startsAt, event.timezone)}</p>
        <span class="badge {event.status}">{event.status}</span>
      </div>
      <h2>{event.name}</h2>
      <p class="muted">{event.venue}</p>
      <p>{event.description.slice(0, 180)}</p>
      <a class="button secondary" href="/events/{event.slug}">Explore event ↗</a>
    </article>{/each}
</div>

<style>
  .hero {
    display: flex;
    overflow: hidden;
    position: relative;
    background: #e5ebd9;
    border: 1px solid #d9e2cd;
    border-radius: 18px;
    padding: 2.7rem;
    margin-bottom: 3rem;
    min-height: 345px;
  }
  .hero h1 {
    font-size: clamp(2.6rem, 4vw, 4rem);
  }
  .hero p:not(.eyebrow) {
    color: #51644b;
    font-size: 0.95rem;
  }
  .hero > div:first-child {
    position: relative;
    z-index: 1;
  }
  .art {
    flex: 1;
    position: relative;
    min-width: 200px;
  }
  .asterisk {
    font-size: 260px;
    color: #698c54;
    position: absolute;
    right: 0;
    top: -55px;
    line-height: 1.4;
    transform: rotate(12deg);
  }
  .orbit {
    border: 1px solid #8ca279;
    border-radius: 50%;
    position: absolute;
    width: 260px;
    height: 260px;
    right: -40px;
    top: 30px;
  }
  .tiny {
    position: absolute;
    right: 8px;
    bottom: 0;
    font-size: 0.6rem;
    letter-spacing: 0.15em;
  }
  .event-card {
    padding: 1.3rem;
  }
  .event-art {
    height: 115px;
    background: #dbe7df;
    border-radius: 9px;
    position: relative;
    overflow: hidden;
    margin-bottom: 1.5rem;
  }
  .event-art > span:first-child {
    position: absolute;
    font-size: 150px;
    color: #749c84;
    top: -55px;
    right: 25px;
  }
  .event-art .badge {
    position: absolute;
    left: 1rem;
    bottom: 1rem;
    font-size: 0.55rem;
    letter-spacing: 0.12em;
    background: #ffffffbd;
  }
  .event-art.gold {
    background: #f0e8ca;
  }
  .event-art.gold > span:first-child {
    color: #b69b46;
  }
  .event-card .eyebrow {
    margin: 0;
  }
  .event-card h2 {
    margin-top: 1.1rem;
    font-size: 1.5rem;
  }
  @media (max-width: 1100px) {
    .art {
      display: none;
    }
  }
  @media (max-width: 640px) {
    .hero {
      padding: 1.5rem;
    }
  }
</style>
