<script lang="ts">
  import { goto } from "$app/navigation";
  import { Search, Users, Building2, ClipboardList, Globe2, FileText, X } from "lucide-svelte";

  type Props = {
    open: boolean;
    onClose: () => void;
  };

  let { open, onClose }: Props = $props();

  type SearchResult = {
    id: string;
    label: string;
    sublabel?: string;
    href: string;
    category: string;
  };

  let query = $state("");
  let results = $state<SearchResult[]>([]);
  let highlightIndex = $state(0);
  let loading = $state(false);
  let inputEl = $state<HTMLInputElement>();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function close() {
    query = "";
    results = [];
    highlightIndex = 0;
    onClose();
  }

  function navigate(href: string) {
    close();
    goto(href);
  }

  async function search(q: string) {
    if (q.trim().length < 2) {
      results = [];
      return;
    }

    loading = true;
    try {
      const res = await fetch(`/api/command-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        results = [];
        return;
      }
      const data = await res.json();
      results = data.results ?? [];
      highlightIndex = 0;
    } finally {
      loading = false;
    }
  }

  function handleInput() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => search(query), 200);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightIndex = Math.min(highlightIndex + 1, results.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightIndex = Math.max(highlightIndex - 1, 0);
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      navigate(results[highlightIndex].href);
    }
  }

  const categoryIcons: Record<string, typeof Users> = {
    Humans: Users,
    Accounts: Building2,
    Activities: ClipboardList,
    "Geo-Interests": Globe2,
    "Route Signups": FileText,
  };

  $effect(() => {
    if (open) {
      requestAnimationFrame(() => inputEl?.focus());
    }
  });
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm"
    onclick={close}
    onkeydown={(e) => { if (e.key === "Escape") close(); }}
    role="presentation"
  ></div>

  <!-- Palette -->
  <div class="fixed inset-x-0 top-[15%] z-60 mx-auto max-w-lg px-4" role="dialog" aria-modal="true" aria-label="Command palette">
    <div class="glass-card-strong overflow-hidden shadow-2xl">
      <!-- Search input -->
      <div class="flex items-center gap-3 border-b border-glass-border px-4 py-3">
        <Search size={18} class="text-text-muted shrink-0" />
        <input
          type="text"
          bind:this={inputEl}
          bind:value={query}
          oninput={handleInput}
          onkeydown={handleKeydown}
          placeholder="Search humans, accounts, activities..."
          class="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted outline-none"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="command-palette-results"
          aria-activedescendant={results.length > 0 ? `cmd-result-${highlightIndex}` : undefined}
        />
        {#if query}
          <button type="button" onclick={() => { query = ""; results = []; }} aria-label="Clear" class="text-text-muted hover:text-text-secondary">
            <X size={14} />
          </button>
        {/if}
        <kbd class="hidden sm:inline-flex text-xs text-text-muted border border-glass-border rounded px-1.5 py-0.5">esc</kbd>
      </div>

      <!-- Results -->
      <div id="command-palette-results" role="listbox" class="max-h-80 overflow-y-auto">
        {#if loading && results.length === 0}
          <div class="px-4 py-6 text-center text-sm text-text-muted">Searching...</div>
        {:else if query.trim().length >= 2 && !loading && results.length === 0}
          <div class="px-4 py-6 text-center text-sm text-text-muted">No results found.</div>
        {:else}
          {#each results as result, i (result.id)}
            {@const Icon = categoryIcons[result.category] ?? Search}
            <button
              id="cmd-result-{i}"
              type="button"
              role="option"
              aria-selected={i === highlightIndex}
              class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors {i === highlightIndex ? 'bg-glass-hover' : 'hover:bg-glass-hover'}"
              onclick={() => navigate(result.href)}
              onmouseenter={() => { highlightIndex = i; }}
            >
              <Icon size={16} class="text-text-muted shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-sm text-text-primary truncate">{result.label}</p>
                {#if result.sublabel}
                  <p class="text-xs text-text-muted truncate">{result.sublabel}</p>
                {/if}
              </div>
              <span class="text-xs text-text-muted shrink-0">{result.category}</span>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      {#if results.length === 0 && query.trim().length < 2}
        <div class="border-t border-glass-border px-4 py-3">
          <p class="text-xs text-text-muted">Type at least 2 characters to search. Navigate with <kbd class="border border-glass-border rounded px-1">↑</kbd> <kbd class="border border-glass-border rounded px-1">↓</kbd> and <kbd class="border border-glass-border rounded px-1">Enter</kbd></p>
        </div>
      {/if}
    </div>
  </div>
{/if}
