<script lang="ts">
  import { enhance } from '$app/forms';
  import { meals } from '$lib/domain/event-day';
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  let { data, form } = $props();
</script>

<svelte:head><title>Check in {data.person.name} · Colmena</title></svelte:head>
<div class="attendee">
  <a href="/organizer/{data.event.slug}/check-in">← Back to check-in</a>
  <div class="page-head" style="margin-top:24px">
    <h1>{data.person.name}</h1>
    <p class="muted">{data.person.email}</p>
  </div>
  <ActionNotice {form} />
  {#if data.attendance?.checkedInAt}<section class="panel checked-banner">
      <span aria-hidden="true">✓</span>
      <h2>Checked In</h2>
      <p>
        {new Date(data.attendance.checkedInAt).toLocaleString('en-US', {
          timeZone: data.event.timezone,
        })}
      </p>
    </section>{/if}
  <section class="panel" style="margin-top:24px">
    <h2>Meal Tickets</h2>
    <div class="meal-grid">
      {#each meals as meal}{@const ticket = data.meals.find((m) => m.meal === meal.id)}
        <form use:enhance method="POST" action="?/meal">
          <input type="hidden" name="meal" value={meal.id} /><input
            type="hidden"
            name="version"
            value={ticket?.version ?? 0}
          /><input type="hidden" name="used" value={ticket?.usedAt ? 'false' : 'true'} /><button
            class="meal"
            class:used={!!ticket?.usedAt}
            disabled={!data.attendance?.checkedInAt || data.event.status !== 'published'}
            aria-label={`Toggle ${meal.label} ticket`}
            ><span>{meal.emoji}</span><strong>{meal.label}</strong><small
              >{ticket?.usedAt ? '✓ Used' : 'Available'}</small
            ></button
          >
        </form>{/each}
    </div>
    <p class="hint" style="margin-top:16px">
      Click a meal to mark it as used. Click again to undo.
    </p>
    {#if !data.attendance?.checkedInAt}<p class="notice">
        Check in the attendee before managing meal tickets.
      </p>{/if}
    <div class="dietary">
      <h3>Dietary restrictions</h3>
      <p class="prose">{data.attendance?.dietary || 'None specified'}</p>
    </div>
  </section>

  <section class="panel information">
    <h2>Core Information</h2>
    <dl>
      <div>
        <dt>Name</dt>
        <dd>{data.person.name}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>{data.person.email}</dd>
      </div>
      <div>
        <dt>School or organization</dt>
        <dd>{data.person.organization || '—'}</dd>
      </div>
    </dl>
  </section>
  <section class="panel information">
    <h2>Status</h2>
    <dl>
      <div>
        <dt>Application status</dt>
        <dd>
          <span class="badge" class:accepted={data.accepted}
            >{data.accepted ? 'Accepted' : 'Not accepted'}</span
          >
        </dd>
      </div>
      <div>
        <dt>Attendance</dt>
        <dd>
          <span class="badge" class:accepted={!!data.attendance}
            >{data.attendance ? 'Confirmed' : 'Not confirmed'}</span
          >
        </dd>
      </div>
    </dl>
  </section>
  {#if !data.attendance?.checkedInAt}<form
      use:enhance
      class="admit"
      method="POST"
      action="?/checkIn"
    >
      <button disabled={!data.accepted || !data.attendance || data.event.status !== 'published'}
        >Check in attendee</button
      >
    </form>{/if}
</div>

<style>
  .attendee {
    max-width: 768px;
    margin: 24px auto;
  }
  .checked-banner {
    text-align: center;
    background: #10b98115;
    border-color: #10b98180;
  }
  .checked-banner > span {
    font-size: 36px;
    color: #10b981;
  }
  .checked-banner h2 {
    color: #059669;
  }
  :global([data-theme='dark']) .checked-banner h2 {
    color: #34d399;
  }
  .attendee h2 {
    font-size: 18px;
  }
  .information {
    margin-top: 24px;
  }
  .information h2 {
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  dt {
    font-size: 14px;
    color: var(--color-muted-foreground);
  }
  dd {
    margin: 4px 0 0;
    overflow-wrap: anywhere;
  }
  .dietary {
    border-top: 1px solid var(--color-border);
    margin-top: 24px;
    padding-top: 16px;
  }
  .dietary h3 {
    font-size: 14px;
    color: var(--color-muted-foreground);
    margin-bottom: 12px;
  }
  .admit {
    margin-top: 32px;
  }
  .admit button {
    width: 100%;
    font-size: 20px;
    padding: 20px;
  }

  .meal-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .meal-grid form {
    margin: 0;
  }
  .meal {
    width: 100%;
    min-height: 170px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-card);
    color: var(--color-foreground);
  }
  .meal > span {
    font-size: 36px;
  }
  .meal strong {
    font-size: 18px;
  }
  .meal small {
    margin: 0;
  }
  .meal.used {
    background: #10b98120;
    border-color: #10b981;
    color: #059669;
  }
  :global([data-theme='dark']) .meal.used {
    color: #34d399;
  }
  @media (max-width: 767px) {
    .meal-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
