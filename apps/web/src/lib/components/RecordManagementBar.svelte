<script lang="ts">
  import type { Snippet } from "svelte";
  import StatusBadge from "./StatusBadge.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { ArrowLeft } from "lucide-svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/stores";
  import { entityLabelFromPath, isValidFromPath } from "$lib/utils/back-navigation";

  type Props = {
    backHref: string;
    backLabel: string;
    title: string;
    status?: string;
    statusOptions?: string[];
    statusColorMap?: Record<string, string>;
    statusLabels?: Record<string, string>;
    statusLabel?: string;
    statusFormAction?: string;
    onStatusChange?: (newStatus: string) => void;
    statusDisabled?: boolean;
    statusHint?: string;
    actions?: Snippet;
  };

  let {
    backHref,
    backLabel,
    title,
    status,
    statusOptions = [],
    statusColorMap = {},
    statusLabels,
    statusLabel,
    statusFormAction,
    onStatusChange,
    statusDisabled = false,
    statusHint,
    actions,
  }: Props = $props();

  const fromParam = $derived($page.url.searchParams.get("from"));
  const effectiveBackHref = $derived(
    fromParam && isValidFromPath(fromParam) ? fromParam : backHref
  );
  const effectiveBackLabel = $derived(
    fromParam && isValidFromPath(fromParam)
      ? (entityLabelFromPath(fromParam) ?? backLabel)
      : backLabel
  );

  let selectedStatus = $state("");

  function initStatus() {
    selectedStatus = status ?? "";
  }
  initStatus();

  // When statusLabels is provided, remap colorMap keys from raw values to display labels
  // so StatusBadge can look up colors by the display label it renders
  let displayColorMap = $derived(
    statusLabels
      // eslint-disable-next-line security/detect-object-injection
      ? Object.fromEntries(Object.entries(statusColorMap).map(([k, v]) => [statusLabels[k] ?? k, v]))
      : statusColorMap
  );

  function handleBitsStatusChange(value: string | undefined) {
    if (!value) return;
    selectedStatus = value;
    onStatusChange?.(value);
  }
</script>

<div class="glass-card-strong p-4 mb-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="flex items-center gap-4">
      <a href={resolve(effectiveBackHref)} class="inline-flex items-center gap-1 text-text-muted hover:text-text-primary text-sm" aria-label="Back to {effectiveBackLabel}">
        <ArrowLeft size={16} aria-hidden="true" /> {effectiveBackLabel}
      </a>
      <h1 class="text-xl font-bold text-text-primary">{title}</h1>
      {#if status}
        {#if statusLabel}
          <span class="inline-flex items-center gap-2 bg-glass/30 px-3 py-1 rounded-lg">
            <span class="text-sm font-medium text-text-secondary">{statusLabel}:</span>
            <!-- eslint-disable-next-line security/detect-object-injection -->
            <StatusBadge status={statusLabels?.[status] ?? status} colorMap={displayColorMap} />
          </span>
        {:else}
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <StatusBadge status={statusLabels?.[status] ?? status} colorMap={displayColorMap} />
        {/if}
      {/if}
    </div>
    <div class="flex items-center gap-3">
      {#if status && statusOptions.length > 0}
        <div class="flex flex-col">
          {#if onStatusChange}
            <Select.Root type="single" value={selectedStatus} onValueChange={handleBitsStatusChange} disabled={statusDisabled}>
              <Select.Trigger class="w-52 text-sm" aria-label="Status">
                <!-- eslint-disable-next-line security/detect-object-injection -->
                {statusLabels?.[selectedStatus] ?? selectedStatus ?? "Select status..."}
              </Select.Trigger>
              <Select.Content>
                {#each statusOptions as opt (opt)}
                  <!-- eslint-disable-next-line security/detect-object-injection -->
                  <Select.Item value={opt}>{statusLabels?.[opt] ?? opt}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          {:else if statusFormAction}
            <form method="POST" action={statusFormAction} class="flex items-center gap-2">
              <input type="hidden" name="status" value={selectedStatus} />
              <Select.Root type="single" value={selectedStatus} onValueChange={(v) => { if (v) selectedStatus = v; }} disabled={statusDisabled}>
                <Select.Trigger class="w-52 text-sm" aria-label="Status">
                  <!-- eslint-disable-next-line security/detect-object-injection -->
                  {statusLabels?.[selectedStatus] ?? selectedStatus ?? "Select status..."}
                </Select.Trigger>
                <Select.Content>
                  {#each statusOptions as opt (opt)}
                    <!-- eslint-disable-next-line security/detect-object-injection -->
                    <Select.Item value={opt}>{statusLabels?.[opt] ?? opt}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              <Button variant="ghost" size="sm" type="submit">Update</Button>
            </form>
          {/if}
          {#if statusHint}
            <p class="text-xs text-text-muted mt-1">{statusHint}</p>
          {/if}
        </div>
      {/if}
      {#if actions}
        {@render actions()}
      {/if}
    </div>
  </div>
</div>
