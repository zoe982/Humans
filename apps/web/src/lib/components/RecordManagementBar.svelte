<script lang="ts">
  import type { Snippet } from "svelte";
  import StatusBadge from "./StatusBadge.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { ArrowLeft } from "lucide-svelte";

  type Props = {
    backHref: string;
    backLabel: string;
    title: string;
    status?: string;
    statusOptions?: string[];
    statusColorMap?: Record<string, string>;
    statusFormAction?: string;
    onStatusChange?: (newStatus: string) => void;
    actions?: Snippet;
  };

  let {
    backHref,
    backLabel,
    title,
    status,
    statusOptions = [],
    statusColorMap = {},
    statusFormAction,
    onStatusChange,
    actions,
  }: Props = $props();

  let selectedStatus = $state(status ?? "");

  function handleStatusDropdownChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    selectedStatus = value;
    onStatusChange?.(value);
  }
</script>

<div class="glass-card-strong p-4 mb-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="flex items-center gap-4">
      <a href={backHref} class="inline-flex items-center gap-1 text-text-muted hover:text-text-primary text-sm" aria-label="Back to {backLabel}">
        <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
      </a>
      <h1 class="text-xl font-bold text-text-primary">{title}</h1>
      {#if status}
        <StatusBadge {status} colorMap={statusColorMap} />
      {/if}
    </div>
    <div class="flex items-center gap-3">
      {#if status && statusOptions.length > 0}
        {#if onStatusChange}
          <select
            class="glass-input px-3 py-1.5 text-sm"
            value={selectedStatus}
            onchange={handleStatusDropdownChange}
          >
            {#each statusOptions as opt}
              <option value={opt}>{opt}</option>
            {/each}
          </select>
        {:else if statusFormAction}
          <form method="POST" action={statusFormAction} class="flex items-center gap-2">
            <select
              name="status"
              class="glass-input px-3 py-1.5 text-sm"
              bind:value={selectedStatus}
            >
              {#each statusOptions as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
            <Button variant="ghost" size="sm" type="submit">Update</Button>
          </form>
        {/if}
      {/if}
      {#if actions}
        {@render actions()}
      {/if}
    </div>
  </div>
</div>
