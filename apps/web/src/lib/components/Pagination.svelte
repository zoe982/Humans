<script lang="ts">
  import { ChevronLeft, ChevronRight } from "lucide-svelte";
  import { buttonVariants } from "$lib/components/ui/button/index.js";

  type Props = {
    page: number;
    limit: number;
    total: number;
    baseUrl?: string;
    onPageChange?: (page: number) => void;
  };

  let { page, limit, total, baseUrl, onPageChange }: Props = $props();

  const totalPages = $derived(Math.ceil(total / limit));
  const start = $derived((page - 1) * limit + 1);
  const end = $derived(Math.min(page * limit, total));
  const hasPrev = $derived(page > 1);
  const hasNext = $derived(page < totalPages);

  function pageUrl(p: number): string {
    const url = new URL(baseUrl ?? "/", "http://placeholder");
    url.searchParams.set("page", String(p));
    url.searchParams.set("limit", String(limit));
    return `${url.pathname}${url.search}`;
  }
</script>

{#if total > 0}
  <nav aria-label="Pagination" class="flex items-center justify-between mt-4 px-1">
    <p class="text-sm text-text-muted">
      Showing <span class="font-medium text-text-secondary">{start}</span>–<span class="font-medium text-text-secondary">{end}</span> of <span class="font-medium text-text-secondary">{total}</span>
    </p>
    <div class="flex items-center gap-2">
      {#if hasPrev}
        {#if onPageChange}
          <button type="button" onclick={() => onPageChange(page - 1)} class="{buttonVariants({ variant: 'ghost', size: 'sm' })} inline-flex items-center gap-1">
            <ChevronLeft size={14} /> Prev
          </button>
        {:else}
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
          <a href={pageUrl(page - 1)} class="{buttonVariants({ variant: 'ghost', size: 'sm' })} inline-flex items-center gap-1">
            <ChevronLeft size={14} /> Prev
          </a>
        {/if}
      {:else}
        <span class="{buttonVariants({ variant: 'ghost', size: 'sm' })} inline-flex items-center gap-1 opacity-40 cursor-not-allowed">
          <ChevronLeft size={14} /> Prev
        </span>
      {/if}
      {#if hasNext}
        {#if onPageChange}
          <button type="button" onclick={() => onPageChange(page + 1)} class="{buttonVariants({ variant: 'ghost', size: 'sm' })} inline-flex items-center gap-1">
            Next <ChevronRight size={14} />
          </button>
        {:else}
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
          <a href={pageUrl(page + 1)} class="{buttonVariants({ variant: 'ghost', size: 'sm' })} inline-flex items-center gap-1">
            Next <ChevronRight size={14} />
          </a>
        {/if}
      {:else}
        <span class="{buttonVariants({ variant: 'ghost', size: 'sm' })} inline-flex items-center gap-1 opacity-40 cursor-not-allowed">
          Next <ChevronRight size={14} />
        </span>
      {/if}
    </div>
  </nav>
{/if}
