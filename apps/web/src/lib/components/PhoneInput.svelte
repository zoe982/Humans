<script lang="ts">
  import { COUNTRY_PHONE_CODES, type CountryPhoneCode } from "@humans/shared";
  import { ChevronDown } from "lucide-svelte";

  type Props = {
    name: string;
    value?: string;
    id?: string;
  };

  let { name, value = "", id }: Props = $props();

  // Default to US
  const defaultCode = COUNTRY_PHONE_CODES.find((c) => c.iso2 === "US") ?? COUNTRY_PHONE_CODES[0];
  let selectedCode = $state<CountryPhoneCode>(defaultCode);
  let digits = $state("");
  let showDropdown = $state(false);
  let codeSearch = $state("");
  let highlightIndex = $state(-1);

  // Parse initial value like "+1 5551234567"
  if (value) {
    const match = value.match(/^(\+[\d-]+)\s*(.*)$/);
    if (match) {
      const foundCode = COUNTRY_PHONE_CODES.find((c) => c.dialCode === match[1]);
      if (foundCode) {
        selectedCode = foundCode;
        digits = match[2];
      } else {
        digits = value;
      }
    } else {
      digits = value;
    }
  }

  const combinedValue = $derived(
    digits.trim() ? `${selectedCode.dialCode} ${digits.trim()}` : ""
  );

  const filteredCodes = $derived(
    codeSearch.trim().length === 0
      ? [...COUNTRY_PHONE_CODES]
      : COUNTRY_PHONE_CODES.filter(
          (c) =>
            c.name.toLowerCase().includes(codeSearch.toLowerCase()) ||
            c.dialCode.includes(codeSearch)
        )
  );

  function selectCode(code: CountryPhoneCode) {
    selectedCode = code;
    showDropdown = false;
    codeSearch = "";
    highlightIndex = -1;
  }

  function handleDropdownKeydown(e: KeyboardEvent) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightIndex = Math.min(highlightIndex + 1, filteredCodes.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightIndex = Math.max(highlightIndex - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filteredCodes.length) {
        selectCode(filteredCodes[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      showDropdown = false;
      highlightIndex = -1;
    }
  }
</script>

<div class="relative">
  <input type="hidden" {name} value={combinedValue} />
  <div class="flex gap-1">
    <button
      type="button"
      aria-label="Select country code"
      aria-expanded={showDropdown}
      aria-haspopup="listbox"
      class="glass-input mt-1 flex items-center gap-1 px-2 py-1.5 text-sm whitespace-nowrap shrink-0"
      onclick={() => { showDropdown = !showDropdown; highlightIndex = -1; }}
      onblur={() => { setTimeout(() => { showDropdown = false; codeSearch = ""; highlightIndex = -1; }, 200); }}
    >
      <span>{selectedCode.flag}</span>
      <span class="text-text-secondary">{selectedCode.dialCode}</span>
      <ChevronDown size={14} class="text-text-muted" />
    </button>
    <input
      type="tel"
      {id}
      bind:value={digits}
      placeholder="Phone number"
      class="glass-input mt-1 block w-full"
    />
  </div>
  {#if showDropdown}
    <div class="glass-popover absolute z-50 mt-1 w-72">
      <div class="p-2 border-b border-glass-border">
        <input
          type="text"
          bind:value={codeSearch}
          placeholder="Search country or code..."
          autocomplete="off"
          aria-label="Search countries"
          class="glass-input block w-full text-sm"
          onfocus={(e) => { e.stopPropagation(); }}
          oninput={() => { highlightIndex = -1; }}
          onkeydown={handleDropdownKeydown}
        />
      </div>
      <div role="listbox" aria-label="Country codes" class="max-h-48 overflow-y-auto">
        {#each filteredCodes as code, i (code.iso2)}
          <button
            type="button"
            role="option"
            aria-selected={code.iso2 === selectedCode.iso2}
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors {i === highlightIndex || code.iso2 === selectedCode.iso2 ? 'bg-glass-hover text-text-primary' : 'text-text-secondary hover:bg-glass-hover hover:text-text-primary'}"
            onmousedown={(e) => { e.preventDefault(); selectCode(code); }}
            onmouseenter={() => { highlightIndex = i; }}
            tabindex="-1"
          >
            <span>{code.flag}</span>
            <span class="flex-1 truncate">{code.name}</span>
            <span class="text-text-muted">{code.dialCode}</span>
          </button>
        {/each}
        {#if filteredCodes.length === 0}
          <div class="px-3 py-2 text-sm text-text-muted" role="status">No matches</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
