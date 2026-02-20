<script lang="ts">
  type Props = {
    options: readonly string[];
    name: string;
    value?: string;
    placeholder?: string;
    id?: string;
    emptyMessage?: string;
    onOpenChange?: (isOpen: boolean) => void;
    onSelect?: (value: string) => void;
  };

  let { options, name, value = "", placeholder = "Search...", id, emptyMessage = "No matches found", onOpenChange, onSelect }: Props = $props();

  let query = $state(value);
  let open = $state(false);
  let highlightIndex = $state(-1);

  const listboxId = $derived(`${id ?? name}-listbox`);

  const filtered = $derived(
    query.trim() === ""
      ? [...options]
      : options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
  );

  const activeDescendantId = $derived(
    highlightIndex >= 0 ? `${listboxId}-option-${highlightIndex}` : undefined
  );

  function select(option: string) {
    query = option;
    open = false;
    highlightIndex = -1;
    onSelect?.(option);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      open = true;
      e.preventDefault();
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightIndex = Math.min(highlightIndex + 1, filtered.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightIndex = Math.max(highlightIndex - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        select(filtered[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      open = false;
      highlightIndex = -1;
    }
  }

  function handleInput() {
    open = true;
    highlightIndex = -1;
  }

  $effect(() => {
    onOpenChange?.(open);
  });
</script>

<div class="relative">
  <input type="hidden" {name} value={query} />
  <input
    type="text"
    {id}
    role="combobox"
    aria-expanded={open && filtered.length > 0}
    aria-controls={listboxId}
    aria-activedescendant={activeDescendantId}
    aria-autocomplete="list"
    bind:value={query}
    oninput={handleInput}
    onfocus={() => { open = true; }}
    onblur={() => { setTimeout(() => { open = false; }, 150); }}
    onkeydown={handleKeydown}
    {placeholder}
    autocomplete="off"
    class="glass-input mt-1 block w-full"
  />
  {#if open && filtered.length > 0}
    <ul id={listboxId} role="listbox" class="glass-popover absolute z-50 mt-1 max-h-48 w-full overflow-auto">
      {#each filtered as option, i}
        <li
          id="{listboxId}-option-{i}"
          role="option"
          aria-selected={i === highlightIndex}
        >
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-sm transition-colors {i === highlightIndex ? 'bg-glass-hover text-text-primary' : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary'}"
            onmousedown={(e: MouseEvent) => { e.preventDefault(); select(option); }}
            onmouseenter={() => { highlightIndex = i; }}
            tabindex="-1"
          >
            {option}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  {#if open && query.trim() !== "" && filtered.length === 0}
    <div class="glass-popover absolute z-50 mt-1 w-full px-3 py-2 text-sm text-text-muted" role="status">
      {emptyMessage}
    </div>
  {/if}
</div>
