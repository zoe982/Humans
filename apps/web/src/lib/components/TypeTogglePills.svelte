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
    { value: "client", label: "Client", activeClass: "bg-[rgba(59,130,246,0.25)] text-blue-300 border-blue-400/40" },
    { value: "trainer", label: "Trainer", activeClass: "bg-[rgba(34,197,94,0.25)] text-green-300 border-green-400/40" },
    { value: "travel_agent", label: "Travel Agent", activeClass: "bg-[rgba(168,85,247,0.25)] text-purple-300 border-purple-400/40" },
    { value: "flight_broker", label: "Flight Broker", activeClass: "bg-[rgba(249,115,22,0.25)] text-orange-300 border-orange-400/40" },
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
  <div class="flex flex-wrap gap-2">
    {#each typeConfigs as tc (tc.value)}
      {@const active = current.includes(tc.value)}
      <button
        type="button"
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
    <p class="mt-1 text-sm text-red-400">At least one type is required.</p>
  {/if}
</div>

<svelte:document on:submit={handleFormValidation} />
