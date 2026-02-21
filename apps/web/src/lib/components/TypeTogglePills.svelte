<script lang="ts">
  type TypeConfig = {
    value: string;
    label: string;
    activeClass: string;
  };

  type Props = {
    selected?: string[];
    name?: string;
    onchange?: (selected: string[]) => void;
  };

  let { selected = [], name = "types", onchange }: Props = $props();

  const typeConfigs: TypeConfig[] = [
    { value: "client", label: "Client", activeClass: "badge-blue border-[var(--badge-blue-text)]/30" },
    { value: "trainer", label: "Trainer", activeClass: "badge-green border-[var(--badge-green-text)]/30" },
    { value: "travel_agent", label: "Travel Agent", activeClass: "badge-purple border-[var(--badge-purple-text)]/30" },
    { value: "flight_broker", label: "Flight Broker", activeClass: "badge-orange border-[var(--badge-orange-text)]/30" },
  ];

  let current = $state<string[]>([...selected]);
  let showError = $state(false);

  $effect(() => {
    current = [...selected];
  });

  function toggle(value: string) {
    if (current.includes(value)) {
      current = current.filter((v) => v !== value);
    } else {
      current = [...current, value];
    }
    showError = false;
    onchange?.(current);
  }

  function handleFormValidation(e: Event) {
    if (current.length === 0) {
      e.preventDefault();
      showError = true;
    }
  }
</script>

<div>
  <div role="group" aria-label="Types" class="flex flex-wrap gap-2">
    {#each typeConfigs as tc (tc.value)}
      {@const active = current.includes(tc.value)}
      <button
        type="button"
        aria-pressed={active}
        onclick={() => toggle(tc.value)}
        class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border transition-colors
          {active ? tc.activeClass : 'border-glass-border text-text-muted hover:text-text-secondary hover:border-text-muted'}"
      >
        {tc.label}
      </button>
    {/each}
  </div>

  {#each current as value (value)}
    <input type="hidden" {name} {value} />
  {/each}

  {#if showError}
    <p class="mt-1 text-sm text-destructive-foreground">At least one type is required.</p>
  {/if}
</div>

<svelte:document on:submit={handleFormValidation} />
