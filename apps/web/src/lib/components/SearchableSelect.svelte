<script lang="ts">
  type Option = { value: string; label: string };

  type Props = {
    options: readonly string[] | readonly Option[];
    name: string;
    value?: string;
    placeholder?: string;
    id?: string;
    emptyMessage?: string;
    emptyOption?: string;
    required?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    onSelect?: (value: string) => void;
  };

  let { options, name, value = "", placeholder = "Search...", id, emptyMessage = "No matches found", emptyOption, required, onOpenChange, onSelect }: Props = $props();

  // Normalize all options to {value, label}
  const normalizedOptions = $derived(
    options.length === 0
      ? []
      : typeof options[0] === "string"
        ? (options as readonly string[]).map((o) => ({ value: o, label: o }))
        : (options as readonly Option[])
  );

  // Find selected option's label for display
  function labelForValue(v: string): string {
    if (emptyOption && v === "") return emptyOption;
    const found = normalizedOptions.find((o) => o.value === v);
    return found ? found.label : v;
  }

  let selectedValue = $state("");
  let query = $state("");
  let open = $state(false);
  let highlightIndex = $state(-1);

  const listboxId = $derived(`${id ?? name}-listbox`);

  // Sync external value prop changes (and initialize on mount)
  $effect(() => {
    selectedValue = value;
    query = labelForValue(value);
  });

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    // If query matches the selected label exactly, show all options
    const selectedLabel = labelForValue(selectedValue).toLowerCase();
    if (q === "" || q === selectedLabel) {
      return [...normalizedOptions];
    }
    return normalizedOptions.filter((o) => o.label.toLowerCase().includes(q));
  });

  // Build display list: prepend empty option if set
  const displayList = $derived.by(() => {
    if (!emptyOption) return filtered;
    const emptyItem: Option = { value: "", label: emptyOption };
    return [emptyItem, ...filtered];
  });

  const activeDescendantId = $derived(
    highlightIndex >= 0 ? `${listboxId}-option-${highlightIndex}` : undefined
  );

  function select(option: Option) {
    selectedValue = option.value;
    query = option.label;
    open = false;
    highlightIndex = -1;
    onSelect?.(option.value);
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
      highlightIndex = Math.min(highlightIndex + 1, displayList.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightIndex = Math.max(highlightIndex - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < displayList.length) {
        select(displayList[highlightIndex]);
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

  function handleBlur() {
    setTimeout(() => {
      open = false;
      // Revert display text to current selection's label
      query = labelForValue(selectedValue);
    }, 150);
  }

  $effect(() => {
    onOpenChange?.(open);
  });
</script>

<div class="relative">
  <input type="hidden" {name} value={selectedValue} />
  <input
    type="text"
    {id}
    role="combobox"
    aria-expanded={open && displayList.length > 0}
    aria-controls={listboxId}
    aria-activedescendant={activeDescendantId}
    aria-autocomplete="list"
    bind:value={query}
    oninput={handleInput}
    onfocus={() => { open = true; }}
    onblur={handleBlur}
    onkeydown={handleKeydown}
    {placeholder}
    {required}
    autocomplete="off"
    class="glass-input mt-1 block w-full"
  />
  {#if open && displayList.length > 0}
    <ul id={listboxId} role="listbox" class="glass-popover absolute z-50 mt-1 max-h-48 w-full overflow-auto">
      {#each displayList as option, i}
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
            {option.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  {#if open && query.trim() !== "" && displayList.length === 0}
    <div class="glass-popover absolute z-50 mt-1 w-full px-3 py-2 text-sm text-text-muted" role="status">
      {emptyMessage}
    </div>
  {/if}
</div>
