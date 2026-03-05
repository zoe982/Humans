<script lang="ts">
  interface Props {
    viewMode: "table" | "kanban";
    onchange?: (mode: "table" | "kanban") => void;
  }

  const { viewMode, onchange }: Props = $props();

  function switchTo(mode: "table" | "kanban") {
    if (mode !== viewMode) {
      onchange?.(mode);
    }
  }
</script>

<div role="group" aria-label="View mode" class="inline-flex items-center rounded-[0.625rem] border border-glass-border bg-glass p-0.5 gap-0.5">
  <button
    aria-label="Table view"
    aria-pressed={viewMode === "table"}
    data-viewmode="table"
    onclick={() => switchTo("table")}
    class={viewMode === "table"
      ? "px-4 py-1.5 rounded-[0.5rem] text-sm font-medium bg-accent text-white shadow-sm transition-all duration-200"
      : "px-4 py-1.5 rounded-[0.5rem] text-sm font-medium text-text-muted hover:text-text-primary hover:bg-glass-hover transition-all duration-200"}
  >
    Table
  </button>
  <button
    aria-label="Kanban view"
    aria-pressed={viewMode === "kanban"}
    data-viewmode="kanban"
    onclick={() => switchTo("kanban")}
    class={viewMode === "kanban"
      ? "px-4 py-1.5 rounded-[0.5rem] text-sm font-medium bg-accent text-white shadow-sm transition-all duration-200"
      : "px-4 py-1.5 rounded-[0.5rem] text-sm font-medium text-text-muted hover:text-text-primary hover:bg-glass-hover transition-all duration-200"}
  >
    Kanban
  </button>
</div>
