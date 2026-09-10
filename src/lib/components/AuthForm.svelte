<script lang="ts">
  import { authClient } from '$lib/auth-client';
  import { onMount } from 'svelte';
  let { mode }: { mode: 'login' | 'register' | 'forgot' | 'reset' } = $props();
  let name = $state(''),
    email = $state(''),
    password = $state(''),
    busy = $state(false),
    message = $state(''),
    failed = $state(false);
  let ready = $state(false);
  onMount(() => {
    // Wait until hydration has settled before accepting edits or client actions.
    const frame = requestAnimationFrame(() => {
      ready = true;
    });
    return () => cancelAnimationFrame(frame);
  });
  const titles = {
    login: 'Welcome back.',
    register: 'Start something great.',
    forgot: 'A fresh start.',
    reset: 'Choose a new password.',
  };
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = '';
    failed = false;
    try {
      const response =
        mode === 'login'
          ? await authClient.signIn.email({ email, password })
          : mode === 'register'
            ? await authClient.signUp.email({ name, email, password, callbackURL: '/events' })
            : mode === 'forgot'
              ? await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })
              : await authClient.resetPassword({
                  newPassword: password,
                  token: new URL(window.location.href).searchParams.get('token') || '',
                });
      if (response.error) {
        failed = true;
        message = response.error.message || 'Please try again.';
      } else if (mode === 'login' || mode === 'register') window.location.assign('/events');
      else
        message =
          mode === 'forgot'
            ? 'If that account exists, a reset link was requested. Check your inbox or local development outbox; if nothing arrives, try again later.'
            : 'Password updated. You can now sign in.';
    } catch {
      failed = true;
      message = 'Unable to reach the service. Please try again.';
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>{titles[mode]} · Cal Hacks</title></svelte:head>
<div class="auth-wrap">
  <p class="eyebrow">MAKE ROOM FOR WHAT’S NEXT</p>
  <h1>{titles[mode]}</h1>
  <p class="muted">One account. A world of people to build with.</p>
  <form class="panel" method="POST" onsubmit={submit}>
    <noscript>Enable JavaScript to use secure account authentication.</noscript>
    <fieldset disabled={!ready || busy} style="border:0;padding:0;margin:0">
      {#if message}<div class="notice" class:error={failed} role="status">{message}</div>{/if}
      {#if mode === 'register'}<label
          >Your name<input
            bind:value={name}
            name="name"
            autocomplete="name"
            required
            maxlength="100"
          /></label
        >{/if}
      {#if mode !== 'reset'}<label
          >Email address<input
            bind:value={email}
            name="email"
            type="email"
            autocomplete="email"
            required
          /></label
        >{/if}
      {#if mode !== 'forgot'}<label
          >Password<input
            aria-label="Password"
            bind:value={password}
            name="password"
            type="password"
            autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
            minlength="12"
            maxlength="128"
            required
          /><small>At least 12 characters.</small></label
        >{/if}
      <button disabled={busy} type="submit"
        >{busy
          ? 'Please wait…'
          : mode === 'register'
            ? 'Create account ↗'
            : mode === 'login'
              ? 'Sign in ↗'
              : mode === 'forgot'
                ? 'Send reset link'
                : 'Update password'}</button
      >
    </fieldset>
    {#if mode === 'login'}<p class="links">
        <a href="/forgot-password">Forgot password?</a> <a href="/register">Create an account</a>
      </p>{:else}<p class="links"><a href="/login">Back to sign in</a></p>{/if}
  </form>
  <small>This portal hosts hypothetical demo events.</small>
</div>

<style>
  .auth-wrap {
    max-width: 500px;
    margin: 2rem auto;
  }
  .auth-wrap > small {
    margin-top: 1rem;
  }
  .links {
    margin: 1.5rem 0 0;
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
  }
</style>
