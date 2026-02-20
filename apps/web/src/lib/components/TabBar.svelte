<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  type Tab = {
    id: string;
    label: string;
  };

  type Props = {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
  };

  let { tabs, activeTab, onTabChange }: Props = $props();

  onMount(() => {
    const hash = $page.url.hash.replace("#", "");
    if (hash && tabs.some((t) => t.id === hash)) {
      onTabChange(hash);
    }
  });

  function selectTab(tabId: string) {
    onTabChange(tabId);
    history.replaceState(null, "", `#${tabId}`);
  }
</script>

<div class="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-[rgba(15,36,64,0.85)] backdrop-blur-md border-b border-glass-border" role="tablist" aria-label="Record sections">
  <div class="flex gap-1 overflow-x-auto py-1 scrollbar-none">
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        role="tab"
        id="tab-{tab.id}"
        aria-selected={activeTab === tab.id}
        aria-controls="panel-{tab.id}"
        tabindex={activeTab === tab.id ? 0 : -1}
        onclick={() => selectTab(tab.id)}
        onkeydown={(e) => {
          const idx = tabs.findIndex((t) => t.id === activeTab);
          if (e.key === "ArrowRight" && idx < tabs.length - 1) {
            e.preventDefault();
            selectTab(tabs[idx + 1].id);
            (e.currentTarget as HTMLElement).nextElementSibling?.focus();
          } else if (e.key === "ArrowLeft" && idx > 0) {
            e.preventDefault();
            selectTab(tabs[idx - 1].id);
            (e.currentTarget as HTMLElement).previousElementSibling?.focus();
          } else if (e.key === "Home") {
            e.preventDefault();
            selectTab(tabs[0].id);
          } else if (e.key === "End") {
            e.preventDefault();
            selectTab(tabs[tabs.length - 1].id);
          }
        }}
        class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors
          {activeTab === tab.id
            ? 'bg-glass text-text-primary'
            : 'text-text-muted hover:bg-glass-hover hover:text-text-secondary'}"
      >
        {tab.label}
      </button>
    {/each}
  </div>
</div>
