<script lang="ts">
  import '../app.css';
  import LoadingBar from '$lib/components/LoadingBar.svelte';
  import { destinations, canNavigate, destinationUrl, type Destination } from '$lib/navigation';
  import Icon from '$lib/components/Icon.svelte';
  import { page, navigating } from '$app/state';
  import { goto, onNavigate } from '$app/navigation';
  import { MediaQuery } from 'svelte/reactivity';
  import { authClient } from '$lib/auth-client';
  import { onMount } from 'svelte';
  let { data, children } = $props();
  let signoutError = $state(''),
    ready = $state(false),
    menuOpen = $state(false),
    dark = $state(false);
  let content: HTMLElement | undefined = $state();
  let navigationVersion = 0;
  const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
  const isAuth = $derived(
    ['/login', '/register', '/forgot-password', '/reset-password'].includes(page.url.pathname),
  );
  const selectedEvent = $derived(data.navigationEvent);
  const organizerLinks = $derived(
    destinations.filter(
      (d) =>
        d.scope !== 'applicant' &&
        (data.access.memberships.some((m) => canNavigate(d, m.eventId, data.access)) ||
          (d.scope === 'settings' && data.access.administrator)),
    ),
  );
  function navHref(destination: Destination) {
    return selectedEvent && canNavigate(destination, selectedEvent.id, data.access)
      ? destinationUrl(destination, selectedEvent.slug)
      : '/select-event?for=' + destination.key;
  }
  function isCurrent(destination: Destination) {
    if (page.url.pathname === '/select-event')
      return page.url.searchParams.get('for') === destination.key;
    if (!selectedEvent) return false;
    const base = destinationUrl(destination, selectedEvent.slug);
    return (
      page.url.pathname === base ||
      (destination.key === 'review'
        ? page.url.pathname.startsWith(base + '/applications/')
        : page.url.pathname.startsWith(base + '/'))
    );
  }
  const currentDestination = $derived(destinations.find(isCurrent) ?? destinations[0]);
  onMount(() => {
    dark = document.documentElement.dataset.theme === 'dark';
    ready = true;
  });
  function toggleTheme() {
    dark = !dark;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      /* Storage may be disabled. */
    }
  }
  // Storke's page motion: 150ms up/fade out, then 300ms left/fade in.
  // Animate a single DOM tree so forms and their labels are never duplicated.
  onNavigate(async () => {
    menuOpen = false;
    const version = ++navigationVersion;
    const node = content;
    if (!node || reducedMotion.current) return;
    node.getAnimations().forEach((animation) => animation.cancel());
    const exit = node.animate(
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-10px)' },
      ],
      { duration: 150, easing: 'cubic-bezier(.215,.61,.355,1)', fill: 'forwards' },
    );
    await exit.finished.catch(() => {});
    return () => {
      exit.cancel();
      if (version !== navigationVersion || reducedMotion.current) return;
      content?.animate(
        [
          { opacity: 0, transform: 'translateX(-20px)' },
          { opacity: 1, transform: 'translateX(0)' },
        ],
        { duration: 300, easing: 'cubic-bezier(.215,.61,.355,1)' },
      );
    };
  });
  async function signout() {
    const result = await authClient.signOut();
    if (result.error) signoutError = 'Could not sign out. Please try again.';
    else await goto('/login', { invalidateAll: true });
  }
</script>

<svelte:head
  ><title>Colmena</title><meta
    name="description"
    content="Apply to Cal Hacks events as a hacker or mentor."
  /></svelte:head
>
<a href="#main" class="button skip">Skip to content</a>
<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape') menuOpen = false;
  }}
/>
<LoadingBar />
{#snippet brand()}<a class="brand" href="/events"
    ><img src="/favicon.png" alt="" /><span>Colmena</span></a
  >{/snippet}
{#snippet themeButton()}<button
    class="nav-control"
    onclick={toggleTheme}
    disabled={!ready}
    aria-label="Toggle theme"
    ><Icon name={dark ? 'sun' : 'moon'} /><span>{dark ? 'Light Mode' : 'Dark Mode'}</span></button
  >{/snippet}
{#if isAuth}
  <div class="auth-tools">{@render themeButton()}</div>
  <main id="main" class="auth-host" bind:this={content}>{@render children()}</main>
{:else if data.user}
  <header class="mobile-header">
    {@render brand()}<button
      class="nav-control"
      aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={menuOpen}
      aria-controls="portal-sidebar"
      onclick={() => (menuOpen = !menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button
    >
  </header>
  <aside id="portal-sidebar" class:open={menuOpen}>
    <div class="sidebar-brand">{@render brand()}</div>
    <!-- Keep links from using the outgoing event while its page transition finishes. -->
    <nav aria-label="Main navigation" inert={!!navigating.to} aria-busy={!!navigating.to}>
      {#if selectedEvent}<div class="event-context">
          <span class="nav-section-label">Event</span><strong>{selectedEvent.name}</strong><a
            href={'/select-event?for=' + currentDestination.key}>Change event</a
          >
        </div>{/if}
      <a href="/events" class:current={page.url.pathname === '/events'}
        ><Icon name="calendar" />Explore events</a
      >
      {#if selectedEvent}<a
          href={'/events/' + selectedEvent.slug}
          class:current={page.url.pathname === '/events/' + selectedEvent.slug}
          ><Icon name="calendar" />Event info</a
        >{/if}
      <div class="nav-section">Applications</div>
      <a
        href={navHref(destinations[0])}
        class:current={isCurrent(destinations[0])}
        aria-current={isCurrent(destinations[0]) ? 'page' : undefined}
        ><Icon name="files" />My applications</a
      >
      {#if organizerLinks.length || data.access.administrator}<div class="nav-section">
          Administration
        </div>
        <a href="/organizer" class:current={page.url.pathname === '/organizer'}
          ><Icon name="calendar" />Organizer workspace</a
        >
        {#each organizerLinks as destination}<a
            href={navHref(destination)}
            class:current={isCurrent(destination)}
            aria-current={isCurrent(destination) ? 'page' : undefined}
            ><Icon name={destination.icon} />{destination.label}</a
          >{/each}
      {/if}
    </nav>
    <div class="sidebar-settings">{@render themeButton()}</div>
    <div class="identity">
      <div class="account">
        <span class="avatar"><Icon name="user" /></span>
        <div><strong>{data.user.name}</strong><small>{data.user.email}</small></div>
      </div>
      <button class="nav-control" disabled={!ready} onclick={signout}
        ><Icon name="logout" />Sign out</button
      >{#if signoutError}<p role="alert">{signoutError}</p>{/if}
      <small class="demo-note">Cal Hacks</small>
    </div>
  </aside>
  <div class="workspace">
    <main id="main" class="portal-main" bind:this={content}>{@render children()}</main>
  </div>
{:else}
  <main id="main" class="public-main" bind:this={content}>
    <header class="public-header">
      {@render brand()}
      <nav aria-label="Main navigation">
        <a href="/login">Sign in</a><a class="button secondary" href="/register"
          >Create an account</a
        >{@render themeButton()}
      </nav>
    </header>
    {@render children()}
  </main>
{/if}

<style>
  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    font-size: 1.25rem;
    font-weight: 600;
    white-space: nowrap;
  }
  .brand img {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }
  aside {
    width: 256px;
    position: fixed;
    inset: 0 auto 0 0;
    display: flex;
    flex-direction: column;
    background: var(--color-card);
    border-right: 1px solid var(--color-border);
    z-index: 40;
  }
  .sidebar-brand {
    height: 64px;
    display: flex;
    align-items: center;
    padding: 0 24px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  aside nav {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: auto;
    padding: 16px;
  }
  aside nav > * {
    flex-shrink: 0;
  }
  aside nav a,
  .nav-control {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    color: var(--color-muted-foreground);
    background: transparent;
    border: 0;
    min-height: 36px;
  }
  aside nav a:hover,
  .nav-control:hover,
  aside nav a.current {
    background: var(--color-accent);
    color: var(--color-accent-foreground);
  }
  .event-context {
    padding: 8px 12px 16px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--color-border);
  }
  .event-context strong {
    display: block;
    font-size: 14px;
  }
  .event-context a {
    padding: 8px 0;
    min-height: 0;
    text-decoration: underline;
    font-size: 12px;
  }
  .nav-section-label {
    display: block;
    font-size: 12px;
    color: var(--color-muted-foreground);
    margin-bottom: 4px;
  }
  .nav-section {
    border-top: 1px solid var(--color-border);
    margin-top: 12px;
    padding-top: 16px;
    margin-bottom: 4px;
    font-weight: 600;
  }
  .sidebar-settings,
  .identity {
    border-top: 1px solid var(--color-border);
    padding: 16px;
  }
  .sidebar-settings .nav-control,
  .identity .nav-control {
    width: 100%;
    justify-content: flex-start;
  }
  .account {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    margin-bottom: 4px;
  }
  .account > div {
    min-width: 0;
  }
  .account strong,
  .account small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 500;
    margin: 0;
  }
  .account small {
    font-size: 12px;
    font-weight: 400;
  }
  .avatar {
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }
  .demo-note {
    font-size: 12px;
    padding: 8px 12px 0;
  }
  .workspace {
    margin-left: 256px;
  }
  .portal-main,
  .public-main {
    width: 100%;
    max-width: 1280px;
    margin: auto;
    padding: 24px;
  }
  .public-main {
    max-width: 816px;
    padding: 48px 24px;
  }
  .mobile-header {
    display: none;
  }
  .public-header {
    margin-bottom: 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .public-header nav {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
  }
  .auth-tools {
    position: absolute;
    right: 16px;
    top: 12px;
    z-index: 20;
  }
  .auth-host {
    min-height: 100vh;
  }
  @media (max-width: 1023px) {
    .mobile-header {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      padding: 0 24px;
      background: var(--color-card);
      border-bottom: 1px solid var(--color-border);
    }
    aside {
      top: 64px;
      width: 100%;
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.15s;
    }
    aside.open {
      visibility: visible;
      opacity: 1;
    }
    .sidebar-brand {
      display: none;
    }
    .workspace {
      margin-left: 0;
    }
  }
  @media (max-width: 600px) {
    .public-header {
      flex-wrap: wrap;
      padding: 0;
    }
    .public-header nav {
      gap: 12px;
      flex-wrap: wrap;
    }
    .portal-main,
    .public-main {
      padding: 24px 16px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    aside {
      transition: none;
    }
  }
</style>
