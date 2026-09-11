<script lang="ts">
  import { formDefinition } from '$lib/domain/forms';
  import { authClient } from '$lib/auth-client';
  import { onMount } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  let { data, form } = $props();
  let dirty = $state(false),
    verificationMessage = $state('');
  beforeNavigate(({ cancel, willUnload }) => {
    if (dirty && !willUnload && !window.confirm('Leave without saving your changes?')) cancel();
  });
  let ready = $state(false);
  onMount(() => {
    // Wait until hydration has settled before accepting edits or client actions.
    const frame = requestAnimationFrame(() => {
      ready = true;
    });
    return () => cancelAnimationFrame(frame);
  });
  const definition = $derived(formDefinition(data.type, data.formVersion));
  const values = $derived(
    (form?.values ?? data.application?.answers ?? {}) as Record<string, string>,
  );
  const editable = $derived(
    (!data.application || data.application.status === 'draft') &&
      data.event.status === 'published' &&
      Date.now() < data.event.closesAt,
  );
  async function resend() {
    try {
      const r = await authClient.sendVerificationEmail({
        email: data.user!.email,
        callbackURL: window.location.pathname,
      });
      verificationMessage = r.error
        ? 'Unable to send. Please try again shortly.'
        : 'Verification requested. Check your email or local development outbox.';
    } catch {
      verificationMessage = 'Unable to send. Please try again.';
    }
  }
</script>

<svelte:head><title>{definition.label} application · Colmena</title></svelte:head>
<svelte:window
  onbeforeunload={(e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }}
/>
<a class="muted" href="/events/{data.event.slug}">← {data.event.name}</a>
<div class="page-head" style="margin-top:2rem">
  <h1>{definition.label} application</h1>
  <p class="muted">{definition.description}</p>
  <span class="badge {data.application?.status ?? 'draft'}"
    >{data.application?.status ?? 'Not started'}</span
  >
</div>
{#if data.application?.status === 'waitlisted'}<div class="notice">
    You’re on the waitlist. Your application is still in consideration. Check here for a released
    update.
  </div>{/if}
{#if data.application?.status === 'accepted'}<div class="notice">
    You’re accepted as a {data.type}! We’re excited to have you join this hypothetical event.
  </div>{/if}
{#if data.application?.status === 'rejected'}<div class="notice">
    Thank you for applying. We’re unable to offer you a place for this application. We hope to see
    you at another event.
  </div>{/if}
{#if form?.message}<div class="notice error" role="alert">
    {form.message}
  </div>{:else if form?.ok}<div class="notice" role="status">Your application was saved.</div>{/if}
{#if !data.user?.emailVerified}<div class="notice">
    <p>Verify your email before submitting. You can save a draft now.</p>
    <button class="secondary" onclick={resend}>Resend verification</button><small role="status"
      >{verificationMessage}</small
    >
  </div>{/if}
{#if !editable}<div class="notice">
    {data.application && data.application.status !== 'draft'
      ? 'Your submitted answers are locked. Admission decisions appear after organizers publish them.'
      : 'Applications are currently closed for editing.'}
  </div>{/if}
<form method="POST" class="panel" oninput={() => (dirty = true)} onsubmit={() => (dirty = false)}>
  <input type="hidden" name="version" value={data.application?.version ?? 0} />
  <fieldset disabled={!editable || !ready} style="border:0;padding:0;margin:0">
    <legend><h2>A little about you</h2></legend>
    <label
      >Your name<input
        name="name"
        value={values.name ?? data.user?.name ?? ''}
        maxlength="200"
      /></label
    >
    <label
      >School or organization<input
        name="organization"
        value={values.organization ?? ''}
        maxlength="200"
      /></label
    >
    <label
      >A short introduction<textarea name="introduction" maxlength="3000"
        >{values.introduction ?? ''}</textarea
      ></label
    >
    <label
      >Portfolio or profile link <span class="muted">(optional)</span><input
        name="link"
        value={values.link ?? ''}
        type="url"
      /></label
    >
    {#each definition.fields as field}<label
        >{field.label}<small>{field.hint}</small><textarea name={field.key} maxlength="3000"
          >{values[field.key] ?? ''}</textarea
        ></label
      >{/each}
    {#if editable}<div class="row">
        <button name="intent" value="save" class="secondary">Save draft</button><button
          name="intent"
          value="submit">Submit application ↗</button
        >
      </div>
      <small>Submitting locks your answers. Review them before continuing.</small>{/if}
  </fieldset>
  {#if data.application}<small
      >Last saved {new Date(data.application.updatedAt).toLocaleString('en-US', {
        timeZone: data.event.timezone,
      })} ({data.event.timezone})</small
    >{/if}
</form>
