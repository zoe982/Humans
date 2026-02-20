<script lang="ts">
  import SearchableSelect from "./SearchableSelect.svelte";
  import { COUNTRIES } from "@humans/shared";
  import { X } from "lucide-svelte";

  type Props = {
    apiUrl: string;
    geoInterestIdName?: string;
    cityName?: string;
    countryName?: string;
    notesName?: string;
    showNotes?: boolean;
  };

  let {
    apiUrl,
    geoInterestIdName = "geoInterestId",
    cityName = "city",
    countryName = "country",
    notesName = "notes",
    showNotes = true,
  }: Props = $props();

  type GeoResult = { id: string; city: string; country: string };

  let mode: "search" | "selected" | "create" = $state("search");
  let searchQuery = $state("");
  let results = $state<GeoResult[]>([]);
  let selectedGeo = $state<GeoResult | null>(null);
  let loading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function doSearch(q: string) {
    clearTimeout(debounceTimer);
    if (q.trim().length === 0) {
      results = [];
      return;
    }
    loading = true;
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/geo-interests/search?q=${encodeURIComponent(q)}`, {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          results = (json.data ?? []) as GeoResult[];
        }
      } catch {
        results = [];
      } finally {
        loading = false;
      }
    }, 300);
  }

  function selectGeo(geo: GeoResult) {
    selectedGeo = geo;
    mode = "selected";
    searchQuery = "";
    results = [];
  }

  function clearSelection() {
    selectedGeo = null;
    mode = "search";
  }

  function switchToCreate() {
    mode = "create";
    searchQuery = "";
    results = [];
  }

  function switchToSearch() {
    mode = "search";
  }
</script>

<div class="space-y-3">
  {#if mode === "search"}
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">Geo-Interest</label>
      <div class="relative">
        <input
          type="text"
          bind:value={searchQuery}
          oninput={() => doSearch(searchQuery)}
          onfocus={() => { if (searchQuery.trim()) doSearch(searchQuery); }}
          onblur={() => { setTimeout(() => { results = []; }, 200); }}
          placeholder="Search existing geo-interests..."
          autocomplete="off"
          class="glass-input block w-full"
        />
        {#if (results.length > 0 || loading) && searchQuery.trim()}
          <div class="glass-popover absolute z-50 mt-1 w-full max-h-48 overflow-y-auto">
            {#if loading && results.length === 0}
              <div class="px-3 py-2 text-sm text-text-muted">Searching...</div>
            {/if}
            {#each results as geo (geo.id)}
              <button
                type="button"
                class="block w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-glass-hover hover:text-text-primary transition-colors"
                onmousedown={(e) => { e.preventDefault(); selectGeo(geo); }}
              >
                {geo.city}, {geo.country}
              </button>
            {/each}
            <button
              type="button"
              class="block w-full px-3 py-2 text-left text-sm text-accent hover:bg-glass-hover transition-colors border-t border-glass-border"
              onmousedown={(e) => { e.preventDefault(); switchToCreate(); }}
            >
              + Create new geo-interest
            </button>
          </div>
        {/if}
        {#if searchQuery.trim() && !loading && results.length === 0}
          <div class="glass-popover absolute z-50 mt-1 w-full">
            <div class="px-3 py-2 text-sm text-text-muted">No matches found</div>
            <button
              type="button"
              class="block w-full px-3 py-2 text-left text-sm text-accent hover:bg-glass-hover transition-colors border-t border-glass-border"
              onmousedown={(e) => { e.preventDefault(); switchToCreate(); }}
            >
              + Create new geo-interest
            </button>
          </div>
        {/if}
      </div>
      <button
        type="button"
        class="mt-1 text-xs text-accent hover:text-cyan-300"
        onclick={switchToCreate}
      >
        or create new
      </button>
    </div>
  {:else if mode === "selected"}
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">Geo-Interest</label>
      <input type="hidden" name={geoInterestIdName} value={selectedGeo?.id ?? ""} />
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1 rounded-full bg-[rgba(6,182,212,0.15)] text-accent px-3 py-1 text-sm">
          {selectedGeo?.city}, {selectedGeo?.country}
          <button
            type="button"
            class="ml-1 text-accent hover:text-cyan-300"
            aria-label="Clear selection"
            onclick={clearSelection}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </span>
      </div>
    </div>
  {:else}
    <div>
      <div class="flex items-center justify-between mb-1">
        <label class="block text-sm font-medium text-text-secondary">New Geo-Interest</label>
        <button
          type="button"
          class="text-xs text-accent hover:text-cyan-300"
          onclick={switchToSearch}
        >
          search existing instead
        </button>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="block text-xs text-text-muted mb-0.5">City</label>
          <input
            name={cityName}
            type="text"
            class="glass-input block w-full"
            placeholder="e.g. Doha"
          />
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-0.5">Country</label>
          <SearchableSelect
            options={COUNTRIES}
            name={countryName}
            placeholder="Search countries..."
            emptyMessage="No countries found"
          />
        </div>
      </div>
    </div>
  {/if}

  {#if showNotes}
    <div>
      <label class="block text-sm font-medium text-text-secondary">Notes</label>
      <textarea
        name={notesName}
        rows="2"
        class="glass-input mt-1 block w-full"
        placeholder="Optional context..."
      ></textarea>
    </div>
  {/if}
</div>
