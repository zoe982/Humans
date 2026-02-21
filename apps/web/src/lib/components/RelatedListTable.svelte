<script lang="ts" generics="T extends { id: string }">
  import type { Snippet } from "svelte";
  import { slide } from "svelte/transition";
  import { Search } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";

  type Column = {
    key: string;
    label: string;
    sortable?: boolean;
    sortValue?: (item: T) => string;
    headerClass?: string;
  };

  type Props = {
    title: string;
    items: T[];
    columns: Column[];
    defaultSortKey?: string;
    defaultSortDirection?: "asc" | "desc";
    searchFilter?: (item: T, query: string) => boolean;
    emptyMessage?: string;
    searchEmptyMessage?: string;
    addLabel?: string;
    onFormToggle?: (open: boolean) => void;
    row: Snippet<[item: T, searchQuery: string]>;
    addForm?: Snippet;
  };

  let {
    title,
    items,
    columns,
    defaultSortKey,
    defaultSortDirection = "asc",
    searchFilter,
    emptyMessage = "None yet.",
    searchEmptyMessage = "No results match your search.",
    addLabel,
    onFormToggle,
    row,
    addForm,
  }: Props = $props();

  let showForm = $state(false);
  let searchQuery = $state("");
  let sortKey = $state(defaultSortKey ?? "");
  let sortDirection = $state<"asc" | "desc">(defaultSortDirection);

  function toggleSort(key: string) {
    if (sortKey === key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDirection = "asc";
    }
  }

  function sortArrow(key: string): string {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " \u25B2" : " \u25BC";
  }

  function ariaSort(key: string): "ascending" | "descending" | "none" {
    if (sortKey !== key) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  }

  const filteredSortedItems = $derived.by(() => {
    let result = items;
    const q = searchQuery.trim().toLowerCase();
    if (q && searchFilter) {
      result = result.filter((item) => searchFilter!(item, q));
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortValue) {
        const dir = sortDirection === "asc" ? 1 : -1;
        const sv = col.sortValue;
        result = [...result].sort((a, b) => sv(a).localeCompare(sv(b)) * dir);
      }
    }
    return result;
  });

  const colCount = $derived(columns.length);
</script>

<div class="glass-card overflow-hidden">
  <div class="flex items-center justify-between px-5 pt-5 pb-4">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">{title}</h2>
      {#if !showForm && items.length > 0 && searchFilter}
        <div class="relative">
          <Search size={14} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            bind:value={searchQuery}
            class="glass-input w-48 pl-8 pr-3 py-1.5 text-sm"
          />
        </div>
      {/if}
    </div>
    {#if addForm && addLabel}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onclick={() => { showForm = !showForm; onFormToggle?.(showForm); }}
      >
        {showForm ? "Cancel" : `+ Add ${addLabel}`}
      </Button>
    {/if}
  </div>

  {#if showForm && addForm}
    <div
      transition:slide={{ duration: 250 }}
      class="mx-5 mb-4 p-4 rounded-lg border border-glass-border"
      style="background: rgba(255,255,255,0.06);"
    >
      {@render addForm()}
    </div>
  {/if}

  {#if items.length === 0}
    <p class="text-text-muted text-sm px-5 pb-5">{emptyMessage}</p>
  {:else}
    <div class="border-t border-glass-border"></div>
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead class="glass-thead">
          <tr>
            {#each columns as col}
              <th scope="col" class={col.headerClass ?? ""} aria-sort={col.sortable ? ariaSort(col.key) : undefined}>
                {#if col.sortable}
                  <button type="button" class="cursor-pointer select-none" onclick={() => toggleSort(col.key)}>{col.label}<span aria-hidden="true">{sortArrow(col.key)}</span></button>
                {:else}
                  {col.label}
                {/if}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each filteredSortedItems as item (item.id)}
            <tr class="glass-row-hover">
              {@render row(item, searchQuery)}
            </tr>
          {:else}
            <tr>
              <td colspan={colCount} class="px-6 py-8 text-center text-sm text-text-muted">{searchEmptyMessage}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
