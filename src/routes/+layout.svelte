<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { authClient } from '$lib/auth-client';
  import { onMount } from 'svelte';
  let { data, children } = $props();
  let signoutError = $state('');
  let ready = $state(false);
  onMount(() => {
    // Wait until hydration has settled before accepting edits or client actions.
    const frame = requestAnimationFrame(() => {
      ready = true;
    });
    return () => cancelAnimationFrame(frame);
  });
  async function signout() {
    const result = await authClient.signOut();
    if (result.error) signoutError = 'Could not sign out. Please try again.';
    else window.location.assign('/login');
  }
</script>

<svelte:head
  ><title>Cal Hacks Portal</title><meta
    name="description"
    content="Your next great idea starts here. Apply to hypothetical Cal Hacks events as a hacker or mentor."
  /></svelte:head
>
<a href="#main" class="button skip">Skip to content</a>
<div class="shell">
  <aside>
    <a class="brand" href="/events"
      ><img src="/favicon.png" alt="Cal Hacks" /><span
        >cal hacks<small>THE APPLICATION PORTAL</small></span
      ></a
    >
    <div class="nav-label">YOUR NEXT CHAPTER</div>
    <nav aria-label="Main navigation">
      <a href="/events" class:current={page.url.pathname.startsWith('/events')}
        ><span aria-hidden="true">◈</span> Explore events</a
      >
      {#if data.access.administrator || data.access.memberships.length}<a
          href="/organizer"
          class:current={page.url.pathname.startsWith('/organizer')}
          ><span aria-hidden="true">▤</span> Organizer workspace</a
        >{/if}
    </nav>
    <div class="sidebar-note">
      <span class="spark" aria-hidden="true">✳</span>
      <p>Good things happen<br />when we build together.</p>
      <small>A hypothetical Cal Hacks<br />take-home project.</small>
    </div>
    <div class="identity">
      {#if data.user}<strong>{data.user.name}</strong><small>{data.user.email}</small><button
          disabled={!ready}
          class="secondary"
          onclick={signout}>Sign out</button
        >{#if signoutError}<p role="alert">{signoutError}</p>{/if}
      {:else}<a class="button" href="/login">Sign in</a><a href="/register">Create an account ↗</a
        >{/if}
    </div>
  </aside>
  <div class="workspace">
    <header>
      <span>Cal Hacks <span class="muted">/ Portal</span></span><span class="live"
        ><span aria-hidden="true">●</span> A place for possibility</span
      >
    </header>
    <main id="main">{@render children()}</main>
    <footer>Built for the people who build. <span>Cal Hacks · Demo events</span></footer>
  </div>
</div>

<style>
  .shell {
    display: grid;
    grid-template-columns: 250px 1fr;
    min-height: 100vh;
  }
  aside {
    background: #f0f3ea;
    border-right: 1px solid #dbe2d6;
    padding: 2rem 1.3rem;
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    text-decoration: none;
    font-size: 1.65rem;
    font-weight: 750;
    letter-spacing: -0.07em;
  }
  .brand img {
    width: 42px;
    height: 42px;
    border-radius: 12px;
  }
  .brand small {
    font-size: 0.52rem;
    letter-spacing: 0.14em;
    margin-top: 0.15rem;
  }
  .nav-label {
    margin: 3rem 0.6rem 1rem;
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    color: #7b8b7a;
    font-weight: 700;
  }
  nav a {
    display: flex;
    gap: 0.7rem;
    padding: 0.85rem 0.65rem;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }
  nav a.current {
    background: #e0e8d6;
    color: #244b31;
  }
  .sidebar-note {
    margin-top: auto;
    padding: 2rem 0.6rem;
  }
  .sidebar-note p {
    font-size: 0.92rem;
    line-height: 1.5;
    font-weight: 600;
  }
  .spark {
    display: block;
    font-size: 3rem;
    color: #859c58;
    margin-bottom: 0.5rem;
  }
  .identity {
    border-top: 1px solid #d5dfcf;
    padding-top: 1.2rem;
    display: grid;
    gap: 0.6rem;
    font-size: 0.8rem;
    overflow-wrap: anywhere;
  }
  .workspace {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  header {
    padding: 1.1rem 3rem;
    border-bottom: 1px solid #e1e6dc;
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 600;
    background: #fafbf7;
  }
  .live {
    color: #6b7b58;
  }
  .live span {
    color: #87a457;
    margin-right: 0.4rem;
  }
  main {
    padding: 3rem;
    max-width: 1300px;
    width: 100%;
    margin-inline: auto;
    flex: 1;
  }
  footer {
    padding: 1.5rem 3rem;
    color: #7b897d;
    font-size: 0.7rem;
    display: flex;
    justify-content: space-between;
  }
  @media (max-width: 900px) {
    .shell {
      grid-template-columns: 1fr;
    }
    aside {
      height: auto;
      position: static;
      padding: 1rem;
      border-right: 0;
      border-bottom: 1px solid #dbe2d6;
    }
    .brand {
      font-size: 1.3rem;
    }
    .brand img {
      width: 32px;
      height: 32px;
    }
    .nav-label,
    .sidebar-note {
      display: none;
    }
    nav {
      display: flex;
      gap: 0.4rem;
      margin-top: 0.8rem;
      flex-wrap: wrap;
    }
    nav a {
      margin: 0;
    }
    .identity {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 0.7rem;
      padding-top: 0.7rem;
    }
    .identity small {
      margin: 0;
    }
    .identity button {
      padding: 0.4rem 0.7rem;
      margin-left: auto;
    }
    main {
      padding: 1.7rem 1rem;
    }
    header,
    footer {
      padding: 1rem;
    }
    .live {
      display: none;
    }
  }
</style>
