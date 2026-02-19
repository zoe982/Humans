<script lang="ts">
  import { COUNTRY_PHONE_CODES, type CountryPhoneCode } from "@humans/shared";

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
  }
</script>

<div class="relative">
  <input type="hidden" {name} value={combinedValue} />
  <div class="flex gap-1">
    <button
      type="button"
      class="glass-input mt-1 flex items-center gap-1 px-2 py-1.5 text-sm whitespace-nowrap shrink-0"
      onclick={() => { showDropdown = !showDropdown; }}
      onblur={() => { setTimeout(() => { showDropdown = false; codeSearch = ""; }, 200); }}
    >
      <span>{selectedCode.flag}</span>
      <span class="text-text-secondary">{selectedCode.dialCode}</span>
      <span class="text-text-muted text-xs">&#9662;</span>
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
    <div class="absolute z-50 mt-1 w-72 rounded-lg border border-white/15 bg-[#1a3a58] shadow-lg">
      <div class="p-2 border-b border-white/10">
        <input
          type="text"
          bind:value={codeSearch}
          placeholder="Search country or code..."
          autocomplete="off"
          class="glass-input block w-full text-sm"
          onfocus={(e) => { e.stopPropagation(); }}
        />
      </div>
      <div class="max-h-48 overflow-y-auto">
        {#each filteredCodes as code (code.iso2)}
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors {code.iso2 === selectedCode.iso2 ? 'bg-white/12 text-text-primary' : 'text-text-secondary hover:bg-white/8 hover:text-text-primary'}"
            onmousedown={(e) => { e.preventDefault(); selectCode(code); }}
          >
            <span>{code.flag}</span>
            <span class="flex-1 truncate">{code.name}</span>
            <span class="text-text-muted">{code.dialCode}</span>
          </button>
        {/each}
        {#if filteredCodes.length === 0}
          <div class="px-3 py-2 text-sm text-text-muted">No matches</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
