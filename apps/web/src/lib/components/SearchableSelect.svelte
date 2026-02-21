<script lang="ts">
  import { Combobox } from "bits-ui";
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

  let {
    options,
    name,
    value = "",
    placeholder = "Search...",
    id,
    emptyMessage = "No matches found",
    emptyOption,
    required,
    onOpenChange,
    onSelect,
  }: Props = $props();

  // Normalize all options to {value, label}
  const normalizedOptions = $derived(
    options.length === 0
      ? []
      : typeof options[0] === "string"
        ? (options as readonly string[]).map((o) => ({ value: o, label: o }))
        : (options as readonly Option[])
  );

  function labelForValue(v: string): string {
    if (emptyOption && v === "") return emptyOption;
    const found = normalizedOptions.find((o) => o.value === v);
    return found ? found.label : v;
  }

  let selectedValue = $state("");
  let searchValue = $state("");
  let open = $state(false);

  // Sync external value prop changes (and initialize on mount)
  $effect(() => {
    selectedValue = value;
  });

  // Notify consumer of open state changes
  $effect(() => {
    onOpenChange?.(open);
  });

  // Filter logic
  const filtered = $derived.by(() => {
    const q = searchValue.trim().toLowerCase();
    if (q === "") return [...normalizedOptions];
    return normalizedOptions.filter((o) => o.label.toLowerCase().includes(q));
  });

  // Display items: prepend empty option if configured
  const displayItems = $derived.by(() => {
    const items = filtered.map((o) => ({ value: o.value, label: o.label }));
    if (!emptyOption) return items;
    return [{ value: "", label: emptyOption }, ...items];
  });

  // All items (unfiltered) for bits-ui typeahead
  const allItems = $derived.by(() => {
    const items = normalizedOptions.map((o) => ({ value: o.value, label: o.label }));
    if (!emptyOption) return items;
    return [{ value: "", label: emptyOption }, ...items];
  });

  // Input display value: show search text when open, selected label when closed
  const inputValue = $derived.by(() => {
    if (open) return searchValue;
    return labelForValue(selectedValue);
  });
</script>

<input type="hidden" {name} value={selectedValue} />
<Combobox.Root
  type="single"
  bind:value={selectedValue}
  bind:open
  {inputValue}
  items={allItems}
  onValueChange={(v) => {
    searchValue = "";
    onSelect?.(v);
  }}
  onOpenChange={(newOpen) => {
    if (!newOpen) searchValue = "";
  }}
>
  <div class="relative">
    <Combobox.Input
      {id}
      {placeholder}
      {required}
      autocomplete="off"
      class="glass-input mt-1 block w-full pr-8"
    >
      {#snippet child({ props })}
        <input
          {...props}
          value={inputValue}
          oninput={(e) => {
            searchValue = e.currentTarget.value;
            if (typeof props.oninput === "function") props.oninput(e);
          }}
          onfocus={() => { open = true; }}
        />
      {/snippet}
    </Combobox.Input>
    <Combobox.Trigger
      class="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 p-0"
    >
      <ChevronDown
        class="h-4 w-4 text-text-muted transition-transform duration-200 {open ? 'rotate-180' : ''}"
        aria-hidden="true"
      />
    </Combobox.Trigger>
  </div>
  <Combobox.Portal>
    <Combobox.Content
      class="glass-popover glass-dropdown-animate z-50 min-w-[8rem] overflow-hidden py-1.5 w-[var(--bits-combobox-anchor-width)]"
      sideOffset={4}
    >
      <Combobox.Viewport class="max-h-[14rem] px-1">
        {#each displayItems as item, i (item.value + '-' + i)}
          {#if emptyOption && i === 1}
            <div role="separator" class="glass-dropdown-separator"></div>
          {/if}
          <Combobox.Item
            value={item.value}
            label={item.label}
            class="glass-dropdown-item flex w-full items-center justify-between gap-3 outline-none data-[highlighted]:bg-[rgba(255,255,255,0.12)] data-[selected]:bg-accent-dim"
          >
            {#snippet children({ selected })}
              <span class="truncate">{item.label}</span>
              <span class="flex h-4 w-4 shrink-0 items-center justify-center">
                {#if selected}
                  <Check class="h-4 w-4 text-accent" aria-hidden="true" />
                {/if}
              </span>
            {/snippet}
          </Combobox.Item>
        {/each}
        {#if displayItems.length === 0 && searchValue.trim() !== ""}
          <div role="status">
            <p class="glass-dropdown-empty">{emptyMessage}</p>
          </div>
        {/if}
      </Combobox.Viewport>
    </Combobox.Content>
  </Combobox.Portal>
</Combobox.Root>
