<script lang="ts">
  import { tick } from 'svelte';
  let {
    name,
    label,
    options,
    value = '',
    disabled = false,
    placeholder = 'Search or select…',
  }: {
    name: string;
    label: string;
    options: readonly string[];
    value?: string;
    disabled?: boolean;
    placeholder?: string;
  } = $props();
  const id = $props.id();
  let selected = $state(''),
    query = $state(''),
    open = $state(false),
    active = $state(0),
    upward = $state(false);
  let container: HTMLDivElement, input: HTMLInputElement, hidden: HTMLInputElement;
  $effect(() => {
    selected = value;
  });
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const indexed = $derived(
    options.map((option) => ({
      option,
      search: normalize(
        option +
          ' ' +
          option.replace('University of California,', 'UC') +
          ' ' +
          option
            .split(/\W+/)
            .map((w) => w[0] || '')
            .join(''),
      ),
    })),
  );
  const matches = $derived(
    indexed.filter((o) =>
      normalize(query)
        .split(/\s+/)
        .every((word) => o.search.includes(word)),
    ),
  );
  const shown = $derived(matches.slice(0, 100));
  function expand() {
    if (disabled) return;
    if (!open) {
      query = '';
      active = 0;
      const bounds = input.getBoundingClientRect();
      upward = innerHeight - bounds.bottom < 330 && bounds.top > innerHeight - bounds.bottom;
    }
    open = true;
  }
  async function choose(option: string) {
    selected = option;
    open = false;
    query = '';
    await tick();
    hidden.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  }
  async function keys(e: KeyboardEvent) {
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      if (!open) {
        expand();
        return;
      }
      active = Math.max(0, Math.min(shown.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
      await tick();
      document.getElementById(id + '-option-' + active)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (shown[active]) void choose(shown[active].option);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      open = false;
    } else if (e.key === 'Tab') open = false;
  }
</script>

<svelte:window
  onpointerdown={(e) => {
    if (container && !container.contains(e.target as Node)) open = false;
  }}
/>
<div class="select" bind:this={container}>
  <label for={id}>{label}</label>
  <input type="hidden" {name} value={selected} bind:this={hidden} {disabled} />
  <div class="input-wrap">
    <input
      {id}
      bind:this={input}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={id + '-list'}
      aria-activedescendant={open && shown[active] ? id + '-option-' + active : undefined}
      autocomplete="off"
      {disabled}
      {placeholder}
      value={open ? query : selected}
      onclick={expand}
      oninput={(e) => {
        expand();
        query = e.currentTarget.value;
        active = 0;
      }}
      onkeydown={keys}
      onblur={(e) => {
        if (!container.contains(e.relatedTarget as Node)) open = false;
      }}
    />
    <span class="caret" aria-hidden="true">⌄</span>
  </div>
  {#if open}<div class="popup" class:upward>
      <div role="listbox" id={id + '-list'} aria-label={label}>
        {#each shown as item, i}<button
            type="button"
            role="option"
            id={id + '-option-' + i}
            aria-selected={selected === item.option}
            class:highlight={active === i}
            tabindex="-1"
            onpointerdown={(e) => e.preventDefault()}
            onclick={() => choose(item.option)}
            ><span>{item.option}</span>{#if selected === item.option}<span aria-hidden="true"
                >✓</span
              >{/if}</button
          >{/each}
      </div>
      {#if !shown.length}<p role="status">
          No matches. Try another search.
        </p>{:else if matches.length > 100}<p role="status">
          Showing 100 of {matches.length}. Keep typing to narrow the list.
        </p>{/if}
    </div>{/if}
</div>

<style>
  .select {
    position: relative;
    margin-bottom: 24px;
    min-width: 0;
  }
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
  }
  .input-wrap {
    position: relative;
  }
  input[role='combobox'] {
    padding-right: 36px;
    cursor: text;
    width: 100%;
  }
  .caret {
    position: absolute;
    right: 14px;
    top: 10px;
    pointer-events: none;
  }
  .popup {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 30;
    margin-top: 4px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-card);
    box-shadow: 0 8px 24px #0002;
    max-height: 330px;
    overflow: auto;
  }
  .popup.upward {
    top: auto;
    bottom: 100%;
    margin-bottom: 4px;
  }
  [role='option'] {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    text-align: left;
    white-space: normal;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--color-foreground);
    font-weight: 400;
    padding: 10px 12px;
  }
  [role='option']:hover,
  .highlight {
    background: var(--color-accent);
  }
  .popup p {
    font-size: 12px;
    color: var(--color-muted-foreground);
    padding: 12px;
    margin: 0;
  }
</style>
