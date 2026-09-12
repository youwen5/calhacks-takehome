<script lang="ts">
  import { formDefinition } from '$lib/domain/forms';
  import { authClient } from '$lib/auth-client';
  import { onMount } from 'svelte';
  import HackerFields from '$lib/components/HackerFields.svelte';
  import MlhAgreements from '$lib/components/MlhAgreements.svelte';
  import { deserialize } from '$app/forms';
  import { invalidateAll, beforeNavigate } from '$app/navigation';
  let { data, form } = $props();
  let dirty = $state(false),
    verificationMessage = $state(''),
    demoVerified = $state(false),
    verifying = $state(false);
  let formElement: HTMLFormElement;
  let saving = $state(false),
    submitting = $state(false),
    saveError = $state(false),
    saveMessage = $state('');
  let savedVersion = $state<number | null>(null),
    savedAt = $state<number | null>(null),
    savedId = $state<string | null>(null);
  let savedResume = $state<{ filename: string } | null | undefined>(undefined);
  const currentResume = $derived(
    savedResume === undefined ? data.application?.resume : savedResume,
  );
  let editSerial = 0,
    editorKey = '',
    timer: ReturnType<typeof setTimeout> | undefined,
    mounted = false;
  $effect(() => {
    const key = data.event.id + data.type;
    if (editorKey !== key) {
      editorKey = key;
      clearTimeout(timer);
      savedVersion = null;
      savedAt = null;
      savedId = null;
      savedResume = undefined;
      saveMessage = '';
      saveError = false;
      dirty = false;
      editSerial = 0;
    }
  });
  function scheduleSave() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (dirty && editable) void persist(false, true);
    }, 15000);
  }
  function changed() {
    dirty = true;
    editSerial++;
    if (ready && editable) scheduleSave();
  }
  async function persist(submit: boolean, automatic = false) {
    if (saving) return;
    clearTimeout(timer);
    saving = true;
    submitting = submit;
    saveError = false;
    saveMessage = automatic ? 'Saving draft…' : 'Saving…';
    const serial = editSerial,
      operationKey = editorKey,
      payload = new FormData(formElement);
    payload.set('intent', submit ? 'submit' : 'save');
    payload.set('version', String(savedVersion ?? data.application?.version ?? 0));
    try {
      const response = await fetch(location.pathname, {
        method: 'POST',
        body: payload,
        headers: { 'x-sveltekit-action': 'true', accept: 'application/json' },
      });
      const result = deserialize(await response.text());
      if (editorKey !== operationKey) return;
      if (result.type !== 'success' || !result.data?.ok) {
        saveError = true;
        saveMessage =
          result.type === 'failure'
            ? String(result.data?.message || 'Unable to save. Please try again.')
            : 'Unable to save. Sign in again if your session expired.';
        return;
      }
      savedVersion = Number(result.data.version);
      savedAt = Number(result.data.savedAt);
      savedId = String(result.data.applicationId);
      savedResume = result.data.resume as { filename: string } | null;
      dirty = editSerial !== serial;
      saveMessage = submit ? 'Application submitted.' : 'Draft saved.';
      const fileInput = formElement.querySelector<HTMLInputElement>('input[type=file]');
      // Clear only the upload that was actually committed; keep a replacement selected mid-save.
      const sent = payload.get('resume');
      if (fileInput?.files?.[0] === sent) fileInput.value = '';
      if (submit) await invalidateAll();
      else if (dirty && mounted) scheduleSave();
    } catch {
      saveError = true;
      saveMessage = 'Unable to save. Your changes are still here; try again.';
    } finally {
      saving = false;
      submitting = false;
    }
  }
  beforeNavigate(({ cancel, willUnload }) => {
    if (dirty && !willUnload && !window.confirm('Leave without saving your changes?')) cancel();
  });
  let ready = $state(false);
  onMount(() => {
    mounted = true;
    // Wait until hydration has settled before accepting edits or client actions.
    const frame = requestAnimationFrame(() => {
      ready = true;
    });
    return () => {
      mounted = false;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
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
  async function bypassVerification() {
    verifying = true;
    verificationMessage = '';
    try {
      const response = await fetch('/api/demo/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const result = await response.json();
      if (!response.ok || result.verified !== true) throw new Error('Verification failed');
      // Do not reload/invalidate the form: preserve unsaved answers and selected PDFs.
      demoVerified = true;
    } catch {
      verificationMessage = 'Unable to bypass verification. Please try again.';
    } finally {
      verifying = false;
    }
  }
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
<div class="application-page">
  <a class="muted" href="/events/{data.event.slug}">← {data.event.name}</a>
  <div class="page-head" style="margin-top:2rem">
    <h1>{definition.label} application</h1>
    <p class="muted">{definition.description}</p>
    <span class="badge {data.application?.status ?? 'draft'}"
      >{data.application?.status ?? (savedVersion ? 'draft' : 'Not started')}</span
    >
  </div>
  {#if data.application?.status === 'waitlisted'}<div class="notice">
      You’re on the waitlist. Your application is still in consideration. Check here for a released
      update.
    </div>{/if}
  {#if data.application?.status === 'accepted'}<div class="notice">
      You’re accepted as a {data.type}!
    </div>{/if}
  {#if data.application?.status === 'rejected'}<div class="notice">
      Thank you for applying. We’re unable to offer you a place for this application. We hope to see
      you at another event.
    </div>{/if}
  {#if saveMessage}<div
      class="notice"
      class:error={saveError}
      role={saveError ? 'alert' : 'status'}
    >
      {saveMessage}
    </div>{/if}
  {#if form?.message}<div class="notice error" role="alert">
      {form.message}
    </div>{:else if form?.ok}<div class="notice" role="status">
      Your application was saved.
    </div>{/if}
  {#if !data.user?.emailVerified && !demoVerified}<div class="notice">
      <p>
        {data.emailEnabled
          ? 'Verify your email before submitting. You can save a draft now.'
          : 'This demo does not send email. Use the verification bypass below to submit your application.'}
      </p>
      <div class="row">
        {#if data.emailEnabled}<button
            class="secondary"
            disabled={!ready || verifying}
            onclick={resend}>Resend verification</button
          >{/if}
        {#if data.demoEmailVerification}<button
            class="secondary"
            disabled={!ready || verifying}
            onclick={bypassVerification}
            >{verifying ? 'Verifying…' : 'Bypass email verification (demo)'}</button
          >{/if}
      </div>
      <small role="status">{verificationMessage}</small>
    </div>{/if}
  {#if !editable}<div class="notice">
      {data.application && data.application.status !== 'draft'
        ? 'Your submitted answers are locked. Admission decisions appear after organizers publish them.'
        : 'Applications are currently closed for editing.'}
    </div>{/if}
  <form
    method="POST"
    enctype="multipart/form-data"
    class="application-form"
    bind:this={formElement}
    oninput={changed}
    onsubmit={(e) => {
      e.preventDefault();
      void persist((e.submitter as HTMLButtonElement)?.value === 'submit');
    }}
  >
    <input type="hidden" name="version" value={savedVersion ?? data.application?.version ?? 0} />
    <fieldset disabled={!editable || !ready || submitting} style="border:0;padding:0;margin:0">
      <section class="panel">
        <h2>{data.type === 'hacker' ? 'About you' : 'Personal information'}</h2>
        <label
          >Your name<input
            name="name"
            value={values.name ?? data.user?.name ?? ''}
            maxlength="200"
          /></label
        >
        {#if data.type === 'mentor'}<label
            >School or organization<input
              name="organization"
              value={values.organization ?? ''}
              maxlength="200"
            /></label
          >
        {/if}<label
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
      </section>
      {#if data.type === 'hacker'}<HackerFields
          {values}
          disabled={!editable || !ready || submitting}
        />{/if}
      <section class="panel">
        <h2>Application essays</h2>
        {#if data.type === 'hacker'}<p class="hint">
            Optional, but highly recommended. Max 500 characters each.
          </p>{/if}
        {#each definition.fields as field}<label
            >{field.label}<small>{field.hint}</small><textarea
              name={field.key}
              maxlength={data.type === 'hacker' ? 500 : 3000}>{values[field.key] ?? ''}</textarea
            ></label
          >{/each}
      </section>
      <section class="panel">
        <h2>Resume</h2>
        <label
          >Resume PDF ({data.type === 'hacker' ? 'required' : 'optional'})<input
            type="file"
            name="resume"
            accept="application/pdf,.pdf"
          /></label
        >
        <small>PDF, up to 2 MB. Saved with your application and locked on submission.</small>
        {#if currentResume}<p>{currentResume.filename}</p>
          <label
            ><input type="checkbox" name="removeResume" value="yes" /> Remove saved resume</label
          >
        {/if}
      </section>
      {#if data.type === 'hacker'}<MlhAgreements {values} />{/if}
      {#if editable}<div class="row">
          <button disabled={saving} name="intent" value="save" class="secondary">Save draft</button
          ><button disabled={saving} name="intent" value="submit">Submit application ↗</button>
        </div>
        <small>Submitting locks your answers. Review them before continuing.</small>{/if}
    </fieldset>
    {#if savedAt || data.application}<small
        >Last saved {new Date(savedAt ?? data.application!.updatedAt).toLocaleString('en-US', {
          timeZone: data.event.timezone,
        })} ({data.event.timezone})</small
      >{/if}
  </form>
  {#if currentResume}<section class="panel" style="margin-top:24px">
      <h2>Saved resume</h2>
      <a
        href="/events/{data.event.slug}/resumes/{savedId ?? data.application?.id}"
        target="_blank"
        rel="noopener">Open resume PDF ↗</a
      >
      <iframe
        title="Your resume PDF"
        src="/events/{data.event.slug}/resumes/{savedId ??
          data.application?.id}#view=FitH&navpanes=0"
        style="width:100%;height:600px;border:0;margin-top:16px"
      ></iframe>
    </section>{/if}
</div>

<style>
  .application-page {
    max-width: 768px;
    margin: auto;
    padding-bottom: 32px;
  }
  fieldset {
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-width: 0;
  }
  .panel label:last-child {
    margin-bottom: 0;
  }
</style>
