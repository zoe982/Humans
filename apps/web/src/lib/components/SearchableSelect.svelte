<script lang="ts">
  import { ChevronDown, Check } from "lucide-svelte";

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
  <div class="relative">
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
      class="glass-input mt-1 block w-full pr-8"
    />
    <ChevronDown
      class="pointer-events-none absolute right-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-text-muted transition-transform duration-200 {open ? 'rotate-180' : ''}"
      aria-hidden="true"
    />
  </div>
  {#if open && displayList.length > 0}
    <ul
      id={listboxId}
      role="listbox"
      class="glass-popover glass-dropdown-animate absolute z-50 mt-1 w-full min-w-[8rem] max-h-56 overflow-auto py-1.5 px-1"
      aria-label="{name} options"
    >
      {#each displayList as option, i}
        {#if emptyOption && i === 1}
          <li role="separator" class="glass-dropdown-separator"></li>
        {/if}
        <li
          id="{listboxId}-option-{i}"
          role="option"
          aria-selected={option.value === selectedValue}
          class="glass-dropdown-item flex items-center justify-between gap-3 text-left {i === highlightIndex ? '!bg-[rgba(255,255,255,0.12)]' : ''} {option.value === selectedValue ? '!bg-accent-dim' : ''}"
          onmousedown={(e) => { e.preventDefault(); select(option); }}
          onmouseenter={() => { highlightIndex = i; }}
        >
          <span class="truncate">{option.label}</span>
          <span class="flex h-4 w-4 shrink-0 items-center justify-center">
            {#if option.value === selectedValue}
              <Check class="h-4 w-4 text-accent" aria-hidden="true" />
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
  {#if open && query.trim() !== "" && displayList.length === 0}
    <div class="glass-popover glass-dropdown-animate absolute z-50 mt-1 w-full py-1" role="status">
      <p class="glass-dropdown-empty">{emptyMessage}</p>
    </div>
  {/if}
</div>
