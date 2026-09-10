<script lang="ts">
  import { formDefinition, rubricAnchors } from '$lib/domain/forms';
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  import { onMount } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  let { data, form } = $props();
  const definition = $derived(formDefinition(data.application.type, data.application.formVersion));
  const review = $derived(form?.reviewValues ?? data.review);
  const mine = $derived(
    !!data.claim && data.claim.userId === data.user?.id && data.claim.expiresAt > Date.now(),
  );
  let dirty = $state(false);
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
</script>

<svelte:head><title>Review {data.application.name} · Cal Hacks</title></svelte:head>
<svelte:window
  onbeforeunload={(e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }}
/>
<div class="page-head">
  <p class="eyebrow">{definition.label} APPLICATION</p>
  <h1>{data.application.name}</h1>
  <p class="muted">{data.application.organization}</p>
  <div class="row">
    <span class="badge {data.published?.value ?? ''}"
      >Visible: {data.published?.value ?? 'submitted'}</span
    ><span class="badge">{data.review?.completedAt ? 'Review completed' : 'Awaiting review'}</span>
  </div>
</div>
<ActionNotice {form} />
<div class="grid">
  <section class="panel">
    <h2>Their story</h2>
    <h3>Introduction</h3>
    <p class="prose">{data.application.introduction}</p>
    {#if data.application.link}<p>
        <a href={data.application.link} target="_blank" rel="noopener noreferrer"
          >Portfolio / profile ↗</a
        >
      </p>{/if}{#each definition.fields as field}<h3>{field.label}</h3>
      <p class="prose">
        {(data.answers as Record<string, string> | undefined)?.[field.key]}
      </p>{/each}
  </section>
  <div class="stack">
    <section class="panel">
      <h2>A thoughtful review</h2>
      <p class="muted">Score the evidence in the application. Grades stay internal.</p>
      {#if !data.review?.completedAt}<form method="POST" action="?/claim">
          <input type="hidden" name="token" value={data.claim?.token ?? ''} />
          <div class="row">
            {#if mine}<button class="secondary" name="operation" value="renew"
                >Renew 20-minute claim</button
              ><button class="secondary" name="operation" value="release">Release claim</button
              >{:else}<button name="operation" value="acquire">Claim application</button
              >{#if data.role === 'manager' && data.claim}<button
                  class="secondary"
                  name="operation"
                  value="release">Release existing claim</button
                >{/if}{/if}
          </div>
          {#if data.claim}<small
              >Claim expires {new Date(data.claim.expiresAt).toLocaleTimeString()}.</small
            >{/if}
        </form>{/if}
      <form
        method="POST"
        action="?/review"
        oninput={() => (dirty = true)}
        onsubmit={() => (dirty = false)}
      >
        <input type="hidden" name="token" value={data.claim?.token ?? ''} /><input
          type="hidden"
          name="version"
          value={data.review?.version ?? 0}
        />
        <fieldset
          disabled={!ready ||
            !mine ||
            !!data.review?.completedAt ||
            data.event.status !== 'published'}
          style="border:0;padding:0"
        >
          {#each definition.rubric as criterion, i}{@const key = `score${i + 1}` as
              'score1' | 'score2' | 'score3'}<label
              >{criterion}<select aria-label={criterion} name={key} value={review?.[key] ?? ''}
                ><option value="">Not scored</option>{#each rubricAnchors as anchor, score}<option
                    value={score + 1}>{anchor}</option
                  >{/each}</select
              ></label
            >{/each}
          <label
            >Internal notes<textarea name="notes" maxlength="5000">{review?.notes ?? ''}</textarea
            ></label
          >
          {#if !data.review?.completedAt}<div class="row">
              <button class="secondary" name="intent" value="save">Save grades</button><button
                name="intent"
                value="complete">Complete review</button
              >
            </div>
            <small>Completion locks grades. Decisions are prepared separately.</small>{/if}
        </fieldset>
      </form>
      {#if data.review?.completedAt}<p class="notice">
          Completed · {(data.review.score1 ?? 0) +
            (data.review.score2 ?? 0) +
            (data.review.score3 ?? 0)} / 15
        </p>{/if}
    </section>
    {#if data.role === 'manager'}<section class="panel">
        <h2>Prepare a decision</h2>
        <p class="muted">This stays private until you publish a release.</p>
        {#if data.prepared}<div class="notice">Prepared: {data.prepared.value}</div>
          <form method="POST" action="?/cancel">
            <input type="hidden" name="revisionId" value={data.prepared.id} /><button
              class="secondary">Cancel preparation</button
            >
          </form>{/if}
        <form method="POST" action="?/decision">
          <input type="hidden" name="sequence" value={data.history[0]?.sequence ?? 0} /><label
            >Decision<select aria-label="Decision" name="value"
              ><option value="accepted">Accept</option><option value="waitlisted">Waitlist</option
              ><option value="rejected">Reject</option></select
            ></label
          ><label
            >Reason<textarea
              name="reason"
              maxlength="2000"
              placeholder="Required for promotions and corrections"></textarea></label
          ><button disabled={!data.review?.completedAt || data.event.status !== 'published'}
            >Prepare decision</button
          >
        </form>
        <p style="margin-top:1rem">
          <a href="/organizer/{data.event.slug}/releases">Go to decision releases →</a>
        </p>
      </section>{/if}
  </div>
</div>
{#if data.history.length}<section class="panel" style="margin-top:1.5rem">
    <h2>Decision history</h2>
    {#each data.history as revision}<p>
        <strong>#{revision.sequence} · {revision.value}</strong>
        <span class="badge"
          >{revision.publishedAt
            ? 'Published'
            : data.prepared?.id === revision.id
              ? 'Prepared'
              : 'Superseded / cancelled'}</span
        ><span class="hint">{revision.reason || 'Initial decision'}</span>
      </p>{/each}
  </section>{/if}
