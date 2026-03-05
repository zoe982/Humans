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

<div role="group" aria-label="View mode">
  <button
    aria-label="Table view"
    aria-pressed={viewMode === "table"}
    data-viewmode="table"
    onclick={() => switchTo("table")}
  >
    Table
  </button>
  <button
    aria-label="Kanban view"
    aria-pressed={viewMode === "kanban"}
    data-viewmode="kanban"
    onclick={() => switchTo("kanban")}
  >
    Kanban
  </button>
</div>
