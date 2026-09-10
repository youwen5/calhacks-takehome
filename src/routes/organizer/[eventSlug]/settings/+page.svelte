<script lang="ts">
  import { onMount } from 'svelte';
  let ready = $state(false);
  onMount(() => {
    const frame = requestAnimationFrame(() => {
      ready = true;
    });
    return () => cancelAnimationFrame(frame);
  });
  import EventFields from '$lib/components/EventFields.svelte';
  import ActionNotice from '$lib/components/ActionNotice.svelte';
  let { data, form } = $props();
</script>

<svelte:head><title>Event settings · {data.event.name}</title></svelte:head>
<div class="page-head">
  <p class="eyebrow">{data.event.name}</p>
  <h1>Set the stage.</h1>
  <p class="muted">Manage the event, application types, and the people organizing it.</p>
</div>
<ActionNotice {form} />
<div class="stack">
  {#if data.role === 'manager'}<form class="panel" method="POST" action="?/configure">
      <fieldset disabled={!ready} style="border:0;margin:0;padding:0">
        <h2>Event details</h2>
        <input type="hidden" name="version" value={data.event.version} /><EventFields
          event={data.event}
        />
        <fieldset style="border:0;padding:0">
          <legend>Application types</legend>
          <div class="row">
            {#each ['hacker', 'mentor'] as type}<label class="row"
                ><input
                  type="checkbox"
                  name="types"
                  value={type}
                  checked={data.event.types.some((t) => t.type === type)}
                />{type}</label
              >{/each}
          </div>
        </fieldset>
        <label
          >Event lifecycle<select name="status" value={data.event.status}
            >{#if data.event.status === 'draft'}<option value="draft"
                >Draft — organizers only</option
              >{/if}<option value="published">Published</option><option value="archived"
              >Archived — read-only</option
            ></select
          ></label
        ><button>{data.event.status === 'archived' ? 'Unarchive event' : 'Save event'}</button
        ><small
          >Unarchiving only changes lifecycle. Edit details after unarchiving. Existing applications
          keep their form versions.</small
        >
      </fieldset>
    </form>{/if}
  <section class="panel">
    <h2>The organizing team</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody
          >{#each data.members as member}<tr
              ><td>{member.name}</td><td>{member.email}</td><td>{member.role}</td></tr
            >{/each}</tbody
        >
      </table>
    </div>
    <form method="POST" action="?/member">
      <fieldset disabled={!ready} style="border:0;margin:0;padding:0">
        <label>Existing account email<input type="email" name="email" required /></label><label
          >Action<select name="role"
            ><option value="reviewer">Assign reviewer</option>{#if data.access.administrator}<option
                value="manager">Assign manager</option
              >{/if}<option value="remove">Remove event access</option></select
          ></label
        ><button>Update membership</button><small
          >Manager changes require a platform administrator. Removing access immediately invalidates
          review claims.</small
        >
      </fieldset>
    </form>
  </section>
</div>
