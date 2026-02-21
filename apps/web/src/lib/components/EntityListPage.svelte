<script lang="ts" generics="T extends { id: string }">
  import type { Snippet } from "svelte";
  import { Search } from "lucide-svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import Pagination from "$lib/components/Pagination.svelte";

  type Column = {
    key: string;
    label: string;
    sortable?: boolean;
    sortValue?: (item: T) => string;
  };

  type PaginationInfo = {
    page: number;
    limit: number;
    total: number;
    baseUrl: string;
  };

  type Props = {
    title: string;
    pageTitle?: string;
    breadcrumbs: { label: string; href?: string }[];
    newHref?: string;
    newLabel?: string;
    error?: string | null;

    items: T[];
    columns: Column[];

    searchFilter?: (item: T, query: string) => boolean;
    searchPlaceholder?: string;

    defaultSortKey?: string;
    defaultSortDirection?: "asc" | "desc";

    deleteAction?: string;
    deleteMessage?: string;
    canDelete?: boolean;

    pagination?: PaginationInfo;

    desktopRow: Snippet<[item: T]>;
    mobileCard: Snippet<[item: T]>;
    headerAction?: Snippet;
    searchForm?: Snippet;
    beforeTable?: Snippet;
    emptyMessage?: string;
  };

  let {
    title,
    pageTitle,
    breadcrumbs,
    newHref,
    newLabel,
    error,
    items,
    columns,
    searchFilter,
    searchPlaceholder = "Search...",
    defaultSortKey: initialSortKey,
    defaultSortDirection: initialSortDir = "asc",
    deleteAction = "?/delete",
    deleteMessage = "Are you sure? This cannot be undone.",
    canDelete = false,
    pagination,
    desktopRow,
    mobileCard,
    headerAction,
    searchForm,
    beforeTable,
    emptyMessage = "No items found.",
  }: Props = $props();

  let search = $state("");
  let sortKey = $state(initialSortKey ?? "");
  let sortDirection = $state<"asc" | "desc">(initialSortDir);

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

  const filteredSorted = $derived.by(() => {
    let result = items;
    const q = search.trim().toLowerCase();
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

  let pendingDeleteId = $state<string | null>(null);
  let deleteFormEl = $state<HTMLFormElement>();

  const colCount = $derived(columns.length + (canDelete ? 1 : 0));
</script>

<svelte:head>
  <title>{pageTitle ?? `${title} - Humans`}</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader {title} {breadcrumbs}>
    {#snippet action()}
      {#if headerAction}
        {@render headerAction()}
      {:else if newHref}
        <a href={newHref} class="btn-primary">{newLabel ?? `Add ${title}`}</a>
      {/if}
    {/snippet}
  </PageHeader>

  {#if error}
    <AlertBanner type="error" message={error} />
  {/if}

  {#if searchForm}
    {@render searchForm()}
  {:else if searchFilter}
    <div class="mt-4 mb-6">
      <div class="relative max-w-md">
        <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input type="text" bind:value={search} placeholder={searchPlaceholder} class="glass-input w-full pl-9 pr-3 py-2 text-sm" />
      </div>
    </div>
  {/if}

  {#if beforeTable}
    {@render beforeTable()}
  {/if}

  <!-- Mobile card view -->
  <div class="sm:hidden space-y-3">
    {#each filteredSorted as item (item.id)}
      {@render mobileCard(item)}
    {:else}
      <div class="glass-card p-6 text-center text-sm text-text-muted">{emptyMessage}</div>
    {/each}
  </div>

  <!-- Desktop table view -->
  <div class="glass-card overflow-hidden hidden sm:block">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          {#each columns as col}
            <th scope="col" aria-sort={col.sortable ? ariaSort(col.key) : undefined}>
              {#if col.sortable}
                <button type="button" class="cursor-pointer select-none" onclick={() => toggleSort(col.key)}>
                  {col.label}<span aria-hidden="true">{sortArrow(col.key)}</span>
                </button>
              {:else}
                {col.label}
              {/if}
            </th>
          {/each}
          {#if canDelete}
            <th scope="col">Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each filteredSorted as item (item.id)}
          <tr class="glass-row-hover">
            {@render desktopRow(item)}
            {#if canDelete}
              <td>
                <button type="button" class="text-destructive-foreground hover:opacity-80 text-sm" onclick={() => { pendingDeleteId = item.id; }}>Delete</button>
              </td>
            {/if}
          </tr>
        {:else}
          <tr>
            <td colspan={colCount} class="px-6 py-8 text-center text-sm text-text-muted">{emptyMessage}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if pagination}
    <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} baseUrl={pagination.baseUrl} />
  {/if}
</div>

{#if canDelete}
  <form method="POST" action={deleteAction} bind:this={deleteFormEl} class="hidden">
    <input type="hidden" name="id" value={pendingDeleteId ?? ""} />
  </form>

  <ConfirmDialog
    open={pendingDeleteId !== null}
    message={deleteMessage}
    onConfirm={() => { deleteFormEl?.requestSubmit(); pendingDeleteId = null; }}
    onCancel={() => { pendingDeleteId = null; }}
  />
{/if}
