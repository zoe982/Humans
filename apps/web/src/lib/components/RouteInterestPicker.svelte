<script lang="ts">
  import SearchableSelect from "./SearchableSelect.svelte";
  import { COUNTRIES } from "@humans/shared";
  import { X, ArrowLeftRight } from "lucide-svelte";

  type Props = {
    apiUrl: string;
    routeInterestIdName?: string;
    originCityName?: string;
    originCountryName?: string;
    destinationCityName?: string;
    destinationCountryName?: string;
    frequencyName?: string;
    travelYearName?: string;
    travelMonthName?: string;
    travelDayName?: string;
    notesName?: string;
    showNotes?: boolean;
    showFrequency?: boolean;
    showTravelDate?: boolean;
  };

  let {
    apiUrl,
    routeInterestIdName = "routeInterestId",
    originCityName = "originCity",
    originCountryName = "originCountry",
    destinationCityName = "destinationCity",
    destinationCountryName = "destinationCountry",
    frequencyName = "frequency",
    travelYearName = "travelYear",
    travelMonthName = "travelMonth",
    travelDayName = "travelDay",
    notesName = "notes",
    showNotes = true,
    showFrequency = true,
    showTravelDate = true,
  }: Props = $props();

  type CityResult = { city: string; country: string };
  type RouteResult = { id: string; originCity: string; originCountry: string; destinationCity: string; destinationCountry: string };

  let mode: "create" | "selected" = $state("create");
  let selectedRoute = $state<RouteResult | null>(null);

  // Origin fields
  let originCityValue = $state("");
  let originCountryValue = $state("");
  let originCityResults = $state<CityResult[]>([]);
  let originCityLoading = $state(false);
  let originDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  // Destination fields
  let destCityValue = $state("");
  let destCountryValue = $state("");
  let destCityResults = $state<CityResult[]>([]);
  let destCityLoading = $state(false);
  let destDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  function searchCities(q: string, target: "origin" | "dest") {
    const timer = target === "origin" ? originDebounceTimer : destDebounceTimer;
    clearTimeout(timer);
    if (q.trim().length === 0) {
      if (target === "origin") originCityResults = [];
      else destCityResults = [];
      return;
    }
    if (target === "origin") originCityLoading = true;
    else destCityLoading = true;

    const newTimer = setTimeout(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/route-interests/cities?q=${encodeURIComponent(q)}`, {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          const results = (json.data ?? []) as CityResult[];
          if (target === "origin") originCityResults = results;
          else destCityResults = results;
        }
      } catch {
        if (target === "origin") originCityResults = [];
        else destCityResults = [];
      } finally {
        if (target === "origin") originCityLoading = false;
        else destCityLoading = false;
      }
    }, 300);

    if (target === "origin") originDebounceTimer = newTimer;
    else destDebounceTimer = newTimer;
  }

  function selectCity(city: CityResult, target: "origin" | "dest") {
    if (target === "origin") {
      originCityValue = city.city;
      originCountryValue = city.country;
      originCityResults = [];
    } else {
      destCityValue = city.city;
      destCountryValue = city.country;
      destCityResults = [];
    }
  }

  function swapOriginDest() {
    const tmpCity = originCityValue;
    const tmpCountry = originCountryValue;
    originCityValue = destCityValue;
    originCountryValue = destCountryValue;
    destCityValue = tmpCity;
    destCountryValue = tmpCountry;
  }

  const MONTH_OPTIONS = [
    { value: "1", label: "01 - January" },
    { value: "2", label: "02 - February" },
    { value: "3", label: "03 - March" },
    { value: "4", label: "04 - April" },
    { value: "5", label: "05 - May" },
    { value: "6", label: "06 - June" },
    { value: "7", label: "07 - July" },
    { value: "8", label: "08 - August" },
    { value: "9", label: "09 - September" },
    { value: "10", label: "10 - October" },
    { value: "11", label: "11 - November" },
    { value: "12", label: "12 - December" },
  ];

  function clearSelection() {
    selectedRoute = null;
    mode = "create";
  }
</script>

<div class="space-y-3">
  {#if mode === "selected" && selectedRoute}
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">Route Interest</label>
      <input type="hidden" name={routeInterestIdName} value={selectedRoute.id} />
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1 rounded-full bg-[rgba(6,182,212,0.15)] text-accent px-3 py-1 text-sm">
          {selectedRoute.originCity}, {selectedRoute.originCountry} &rarr; {selectedRoute.destinationCity}, {selectedRoute.destinationCountry}
          <button
            type="button"
            class="ml-1 text-accent hover:text-[var(--link-hover)]"
            aria-label="Clear selection"
            onclick={clearSelection}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </span>
      </div>
    </div>
  {:else}
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">Route Interest</label>

      <!-- Origin -->
      <div class="mb-2">
        <span class="text-xs font-medium text-text-muted uppercase tracking-wide">Origin</span>
        <div class="grid gap-3 sm:grid-cols-2 mt-1">
          <div class="relative">
            <label class="block text-xs text-text-muted mb-0.5">City</label>
            <input
              name={originCityName}
              type="text"
              class="glass-input block w-full"
              placeholder="e.g. London"
              bind:value={originCityValue}
              oninput={() => searchCities(originCityValue, "origin")}
              onfocus={() => { if (originCityValue.trim()) searchCities(originCityValue, "origin"); }}
              onblur={() => { setTimeout(() => { originCityResults = []; }, 200); }}
              autocomplete="off"
            />
            {#if originCityResults.length > 0 && originCityValue.trim()}
              <div class="glass-popover absolute z-50 mt-1 w-full max-h-48 overflow-y-auto">
                {#each originCityResults as city}
                  <button
                    type="button"
                    class="block w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-glass-hover hover:text-text-primary transition-colors"
                    onmousedown={(e) => { e.preventDefault(); selectCity(city, "origin"); }}
                  >
                    {city.city}, {city.country}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-0.5">Country</label>
            <SearchableSelect
              options={COUNTRIES}
              name={originCountryName}
              placeholder="Search countries..."
              emptyMessage="No countries found"
              value={originCountryValue}
              onSelect={(v) => { originCountryValue = v; }}
            />
          </div>
        </div>
      </div>

      <!-- Reverse button -->
      <div class="flex justify-center my-1">
        <button
          type="button"
          class="text-accent hover:text-[var(--link-hover)] p-1 rounded-lg hover:bg-glass-hover transition-colors"
          aria-label="Swap origin and destination"
          onclick={swapOriginDest}
        >
          <ArrowLeftRight size={16} />
        </button>
      </div>

      <!-- Destination -->
      <div>
        <span class="text-xs font-medium text-text-muted uppercase tracking-wide">Destination</span>
        <div class="grid gap-3 sm:grid-cols-2 mt-1">
          <div class="relative">
            <label class="block text-xs text-text-muted mb-0.5">City</label>
            <input
              name={destinationCityName}
              type="text"
              class="glass-input block w-full"
              placeholder="e.g. Paris"
              bind:value={destCityValue}
              oninput={() => searchCities(destCityValue, "dest")}
              onfocus={() => { if (destCityValue.trim()) searchCities(destCityValue, "dest"); }}
              onblur={() => { setTimeout(() => { destCityResults = []; }, 200); }}
              autocomplete="off"
            />
            {#if destCityResults.length > 0 && destCityValue.trim()}
              <div class="glass-popover absolute z-50 mt-1 w-full max-h-48 overflow-y-auto">
                {#each destCityResults as city}
                  <button
                    type="button"
                    class="block w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-glass-hover hover:text-text-primary transition-colors"
                    onmousedown={(e) => { e.preventDefault(); selectCity(city, "dest"); }}
                  >
                    {city.city}, {city.country}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-0.5">Country</label>
            <SearchableSelect
              options={COUNTRIES}
              name={destinationCountryName}
              placeholder="Search countries..."
              emptyMessage="No countries found"
              value={destCountryValue}
              onSelect={(v) => { destCountryValue = v; }}
            />
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if showFrequency}
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">Frequency</label>
      <SearchableSelect
        options={[{ value: "one_time", label: "One-time" }, { value: "repeat", label: "Repeat" }]}
        name={frequencyName}
        placeholder="Select frequency..."
        emptyMessage="No match"
        value="one_time"
      />
    </div>
  {/if}

  {#if showTravelDate}
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">Travel Date (optional)</label>
      <div class="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div>
          <label class="block text-xs text-text-muted mb-0.5">Year</label>
          <input
            name={travelYearName}
            type="number"
            min="2020"
            max="2100"
            placeholder="Year"
            class="glass-input block w-full appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-0.5">Month</label>
          <SearchableSelect
            options={MONTH_OPTIONS}
            name={travelMonthName}
            placeholder="Month..."
            emptyOption="None"
            emptyMessage="No match"
          />
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-0.5">Day</label>
          <input
            name={travelDayName}
            type="number"
            min="1"
            max="31"
            placeholder="Day"
            class="glass-input block w-full appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>
    </div>
  {/if}

  {#if showNotes}
    <div>
      <label class="block text-sm font-medium text-text-secondary">Notes</label>
      <textarea
        name={notesName}
        rows="2"
        class="glass-input mt-1 block w-full"
        placeholder="Optional context..."
      ></textarea>
    </div>
  {/if}
</div>
