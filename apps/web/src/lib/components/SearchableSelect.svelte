<script lang="ts">
  type Props = {
    options: readonly string[];
    name: string;
    value?: string;
    placeholder?: string;
    id?: string;
  };

  let { options, name, value = "", placeholder = "Search...", id }: Props = $props();

  let query = $state(value);
  let open = $state(false);
  let highlightIndex = $state(-1);

  const filtered = $derived(
    query.trim() === ""
      ? [...options]
      : options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
  );

  function select(option: string) {
    query = option;
    open = false;
    highlightIndex = -1;
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
</script>

<div class="relative">
  <input type="hidden" {name} value={query} />
  <input
    type="text"
    {id}
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
    <ul class="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-white/15 bg-[#1a3a58] backdrop-blur-xl shadow-lg">
      {#each filtered as option, i}
        <li>
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-sm transition-colors {i === highlightIndex ? 'bg-white/12 text-text-primary' : 'text-text-secondary hover:bg-white/8 hover:text-text-primary'}"
            onmousedown={(e: MouseEvent) => { e.preventDefault(); select(option); }}
            onmouseenter={() => { highlightIndex = i; }}
          >
            {option}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  {#if open && query.trim() !== "" && filtered.length === 0}
    <div class="absolute z-50 mt-1 w-full rounded-lg border border-white/15 bg-[#1a3a58] backdrop-blur-xl shadow-lg px-3 py-2 text-sm text-text-muted">
      No breeds found
    </div>
  {/if}
</div>
