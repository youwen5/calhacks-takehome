<script lang="ts">
  let {
    name,
  }: {
    name:
      | 'qr'
      | 'gift'
      | 'chart'
      | 'trophy'
      | 'database'
      | 'send'
      | 'settings'
      | 'calendar'
      | 'files'
      | 'menu'
      | 'close'
      | 'moon'
      | 'sun'
      | 'logout'
      | 'user';
  } = $props();
</script>

<svg
  width="20"
  height="20"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.7"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'qr'}<path
      d="M3 3h6v6H3ZM15 3h6v6h-6ZM3 15h6v6H3ZM15 15h3v3h3v3h-6ZM12 3v3M12 12h3M3 12h3M12 18v3M21 12v3"
    />
  {:else if name === 'gift'}<path d="M3 9h18v4H3ZM5 13v8h14v-8M12 9v12" /><path
      d="M12 9C4 9 5 2 8 3c3 0 4 6 4 6Zm0 0c8 0 7-7 4-6-3 0-4 6-4 6Z"
    />
  {:else if name === 'calendar'}<rect x="3" y="5" width="18" height="16" rx="2" /><path
      d="M16 3v4M8 3v4M3 11h18M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01"
    />
  {:else if name === 'files'}<path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6M8 13h8M8 17h6"
    />
  {:else if name === 'chart'}<path d="M4 3v18h17M8 16v-4M13 16V8M18 16V5" />
  {:else if name === 'trophy'}<path
      d="M8 3h8v5a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 12v6M8 21v-3h8v3"
    />
  {:else if name === 'database'}<ellipse cx="12" cy="5" rx="8" ry="3" /><path
      d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"
    />
  {:else if name === 'send'}<path d="m3 3 18 9-18 9 4-9-4-9Zm4 9h14" />
  {:else if name === 'settings'}<path d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6" />
  {:else if name === 'menu'}<path d="M4 6h16M4 12h16M4 18h16" />
  {:else if name === 'close'}<path d="m6 6 12 12M6 18 18 6" />
  {:else if name === 'moon'}<path d="M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z" />
  {:else if name === 'sun'}<circle cx="12" cy="12" r="4" /><path
      d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"
    />
  {:else if name === 'logout'}<path
      d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M10 12h11m-4-4 4 4-4 4"
    />
  {:else}<circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" />{/if}
</svg>
