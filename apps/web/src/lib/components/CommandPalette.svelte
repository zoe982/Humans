<script lang="ts">
  import { goto } from "$app/navigation";
  import { Command as CommandPrimitive, Dialog as DialogPrimitive } from "bits-ui";
  import { Search, Users, Building2, ClipboardList, Globe2, FileText, X } from "lucide-svelte";

  type Props = {
    open: boolean;
  };

  let { open = $bindable(false) }: Props = $props();

  type SearchResult = {
    id: string;
    label: string;
    sublabel?: string;
    href: string;
    category: string;
  };

  let query = $state("");
  let results = $state<SearchResult[]>([]);
  let loading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function close() {
    open = false;
    query = "";
    results = [];
    loading = false;
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
    } finally {
      loading = false;
    }
  }

  function handleInput(e: Event) {
    query = (e.currentTarget as HTMLInputElement).value;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => search(query), 200);
  }

  const categoryIcons: Record<string, typeof Users> = {
    Humans: Users,
    Accounts: Building2,
    Activities: ClipboardList,
    "Geo-Interests": Globe2,
    "Route Signups": FileText,
  };

  function handleOpenChange(next: boolean) {
    if (!next) {
      close();
    }
  }
</script>

<DialogPrimitive.Root bind:open onOpenChange={handleOpenChange}>
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
    <DialogPrimitive.Content
      class="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 glass-card-strong overflow-hidden p-0 shadow-2xl"
      aria-label="Command palette"
    >
      <CommandPrimitive.Root shouldFilter={false} class="flex h-full w-full flex-col overflow-hidden">
        <!-- Search input -->
        <div class="flex items-center gap-3 border-b border-glass-border px-4 py-3">
          <Search size={18} class="text-text-muted shrink-0" />
          <input
            type="text"
            value={query}
            oninput={handleInput}
            placeholder="Search humans, accounts, activities..."
            class="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-muted outline-none"
            aria-label="Search"
            data-testid="command-palette-input"
          />
          {#if query}
            <button
              type="button"
              onclick={() => { query = ""; results = []; }}
              aria-label="Clear search"
              class="text-text-muted hover:text-text-secondary"
            >
              <X size={14} />
            </button>
          {/if}
          <kbd class="hidden sm:inline-flex text-xs text-text-muted border border-glass-border rounded px-1.5 py-0.5">esc</kbd>
        </div>

        <!-- Results -->
        <CommandPrimitive.List class="max-h-80 overflow-y-auto">
          {#if loading && results.length === 0}
            <div class="px-4 py-6 text-center text-sm text-text-muted" data-testid="loading-state">Searching...</div>
          {:else if results.length === 0 && query.trim().length >= 2 && !loading}
            <CommandPrimitive.Empty class="px-4 py-6 text-center text-sm text-text-muted">
              No results found.
            </CommandPrimitive.Empty>
          {:else}
            {#each results as result (result.id)}
              {@const Icon = categoryIcons[result.category] ?? Search}
              <CommandPrimitive.Item
                value={result.id}
                onSelect={() => navigate(result.href)}
                class="flex w-full items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-glass-hover data-[highlighted]:bg-glass-hover"
              >
                <Icon size={16} class="text-text-muted shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-text-primary truncate">{result.label}</p>
                  {#if result.sublabel}
                    <p class="text-xs text-text-muted truncate">{result.sublabel}</p>
                  {/if}
                </div>
                <span class="text-xs text-text-muted shrink-0">{result.category}</span>
              </CommandPrimitive.Item>
            {/each}
          {/if}
        </CommandPrimitive.List>

        <!-- Footer hint -->
        {#if results.length === 0 && query.trim().length < 2 && !loading}
          <div class="border-t border-glass-border px-4 py-3">
            <p class="text-xs text-text-muted">
              Type at least 2 characters to search. Navigate with
              <kbd class="border border-glass-border rounded px-1">↑</kbd>
              <kbd class="border border-glass-border rounded px-1">↓</kbd>
              and
              <kbd class="border border-glass-border rounded px-1">Enter</kbd>
            </p>
          </div>
        {/if}
      </CommandPrimitive.Root>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
</DialogPrimitive.Root>
