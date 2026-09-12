<script lang="ts">
  import { page } from '$app/state';
  import { authClient } from '$lib/auth-client';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  let { mode }: { mode: 'login' | 'register' | 'forgot' | 'reset' } = $props();
  let name = $state(''),
    lastName = $state(''),
    rememberMe = $state(false),
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
    login: 'Log In to Cal Hacks',
    register: 'Register to apply',
    forgot: 'Reset your password',
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
          ? await authClient.signIn.email({ email, password, rememberMe })
          : mode === 'register'
            ? await authClient.signUp.email({
                name: `${name.trim()} ${lastName.trim()}`,
                email,
                password,
                callbackURL: '/events',
              })
            : mode === 'forgot'
              ? await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })
              : await authClient.resetPassword({
                  newPassword: password,
                  token: new URL(window.location.href).searchParams.get('token') || '',
                });
      if (response.error) {
        failed = true;
        message = response.error.message || 'Please try again.';
      } else if (mode === 'login' || mode === 'register')
        await goto('/events', { invalidateAll: true });
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

<svelte:head><title>{titles[mode]} · Colmena</title></svelte:head>
<div class="auth-page">
  <div class="auth-art" aria-hidden="true"></div>
  <div class="auth-pane">
    <div class="auth-wrap">
      <a class="auth-brand" href="/events"><img src="/favicon.png" alt="" />Colmena</a>
      <form class="auth-form" method="POST" onsubmit={submit}>
        <h1>{titles[mode]}</h1>
        <noscript>Enable JavaScript to use account authentication.</noscript>
        {#if mode === 'forgot' && !page.data.emailEnabled}
          <p class="auth-message">
            Password reset is unavailable because this demo does not send email.
          </p>
        {:else}
          <fieldset disabled={!ready || busy}>
            {#if mode === 'register'}<div class="name-fields">
                <label
                  >First name<input
                    name="firstName"
                    bind:value={name}
                    autocomplete="given-name"
                    required
                    maxlength="100"
                  /></label
                ><label
                  >Last name<input
                    name="lastName"
                    bind:value={lastName}
                    autocomplete="family-name"
                    required
                    maxlength="100"
                  /></label
                >
              </div>{/if}
            {#if mode !== 'reset'}<label
                >Email address<input
                  name="email"
                  type="email"
                  bind:value={email}
                  autocomplete="email"
                  required
                /></label
              >{/if}
            {#if mode !== 'forgot'}<label
                >Password<input
                  aria-label="Password"
                  name="password"
                  type="password"
                  bind:value={password}
                  autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minlength="12"
                  maxlength="128"
                  required
                />{#if mode !== 'login'}<small>At least 12 characters.</small>{/if}</label
              >{/if}
            {#if mode === 'login'}<div class="login-options">
                <label class="remember"
                  ><input type="checkbox" bind:checked={rememberMe} />Remember me</label
                >{#if page.data.emailEnabled}<a href="/forgot-password">Forgot Password?</a>{/if}
              </div>{/if}
            <button type="submit" disabled={busy} aria-busy={busy}
              >{#if busy}<span class="spinner" aria-hidden="true"></span>{mode === 'login'
                  ? 'Signing in…'
                  : 'Please wait…'}{:else}{mode === 'register'
                  ? 'Create account'
                  : mode === 'login'
                    ? 'Sign in'
                    : mode === 'forgot'
                      ? 'Send reset link'
                      : 'Update password'}{/if}</button
            >
            {#if message}<div class="auth-message" class:error={failed} role="status">
                {message}
              </div>{/if}
          </fieldset>
        {/if}
        {#if mode === 'login'}<a class="button secondary" href="/register">New? Create an Account</a
          >{:else}<a class="button secondary" href="/login"
            >{mode === 'register' ? 'Already have an account? Login instead' : 'Back to sign in'}</a
          >{/if}
      </form>
    </div>
  </div>
</div>

<style>
  .auth-page {
    display: grid;
    grid-template-columns: 1fr 2fr;
    min-height: 100vh;
  }
  .auth-art {
    background:
      linear-gradient(#0000004d, #0000004d),
      url('/auth-splash.svg') center/cover no-repeat;
  }
  .auth-pane {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
  }
  .auth-wrap {
    width: 100%;
    max-width: 448px;
  }
  .auth-brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 600;
    text-decoration: none;
    margin-bottom: 24px;
  }
  .auth-brand img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
  .auth-form,
  fieldset {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  h1 {
    font-size: 36px;
    line-height: 40px;
    font-weight: 800;
    letter-spacing: normal;
    margin: 0;
  }
  label {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  input:not([type='checkbox']) {
    background: var(--color-background);
    border-color: var(--color-input);
    border-radius: 6px;
    height: 40px;
    font-size: 18px;
    margin-top: 8px;
  }
  input[type='password'] {
    font-size: 20px;
  }
  .name-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .login-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .remember {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 400;
  }
  .login-options a {
    text-decoration: underline;
    color: var(--color-link);
  }
  button,
  .button {
    width: 100%;
    height: 40px;
    font-weight: 500;
  }
  .auth-message {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 16px;
  }
  .auth-message.error {
    background: color-mix(in srgb, var(--color-destructive) 50%, transparent);
    border-color: var(--color-destructive);
    color: var(--color-destructive-foreground);
    text-align: center;
    font-style: italic;
  }
  .spinner {
    height: 16px;
    width: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (max-width: 1023px) {
    .auth-page {
      grid-template-columns: 1fr;
    }
    .auth-art {
      display: none;
    }
    .auth-pane {
      min-height: 100vh;
    }
  }
  @media (max-width: 480px) {
    h1 {
      font-size: 30px;
      line-height: 36px;
    }
    .name-fields {
      grid-template-columns: 1fr;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
  }
</style>
