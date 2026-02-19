<script lang="ts">
  import type { Snippet } from "svelte";
  import StatusBadge from "./StatusBadge.svelte";

  type Props = {
    backHref: string;
    backLabel: string;
    title: string;
    status?: string;
    statusOptions?: string[];
    statusColorMap?: Record<string, string>;
    statusFormAction?: string;
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
    actions,
  }: Props = $props();

  let selectedStatus = $state(status ?? "");
</script>

<div class="glass-card-strong p-4 mb-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="flex items-center gap-4">
      <a href={backHref} class="text-text-muted hover:text-text-primary text-sm">
        &larr; {backLabel}
      </a>
      <h1 class="text-xl font-bold text-text-primary">{title}</h1>
      {#if status}
        <StatusBadge {status} colorMap={statusColorMap} />
      {/if}
    </div>
    <div class="flex items-center gap-3">
      {#if status && statusOptions.length > 0 && statusFormAction}
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
          <button type="submit" class="btn-ghost text-sm py-1.5">
            Update
          </button>
        </form>
      {/if}
      {#if actions}
        {@render actions()}
      {/if}
    </div>
  </div>
</div>
