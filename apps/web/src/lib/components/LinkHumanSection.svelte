<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { formatDateTime } from "$lib/utils/format";
  import { resolve } from "$app/paths";
  import { page } from "$app/stores";

  type LinkedHuman = {
    humanId: string;
    humanDisplayId: string;
    humanName: string;
    linkedAt?: string;
    linkId?: string;
  };

  let {
    linkedHuman = null,
    linkAction = "?/linkHuman",
    unlinkAction = "?/unlinkHuman",
    createNewHumanUrl = "",
  }: {
    linkedHuman: LinkedHuman | null;
    linkAction?: string;
    unlinkAction?: string;
    createNewHumanUrl?: string;
  } = $props();

  let searchQuery = $state("");
  let searchResults = $state<{ id: string; firstName: string; lastName: string; emails: { email: string }[] }[]>([]);
  let searching = $state(false);

  async function searchHumans() {
    if (searchQuery.trim().length === 0) {
      searchResults = [];
      return;
    }
    searching = true;
    try {
      const res = await fetch(`/api/search-humans?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const json = await res.json();
        searchResults = json.humans ?? [];
      }
    } finally {
      searching = false;
    }
  }
</script>

{#if linkedHuman != null}
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Linked Human</h2>
    <div class="mt-4 flex items-center justify-between">
      <div>
        <a href={resolve(`/humans/${linkedHuman.humanId}?from=${$page.url.pathname}`)} class="text-sm font-medium text-accent-primary hover:underline">
          {linkedHuman.humanName}
        </a>
        <p class="text-xs text-text-muted">{linkedHuman.humanDisplayId}</p>
        {#if linkedHuman.linkedAt}
          <p class="text-xs text-text-muted">Linked {formatDateTime(linkedHuman.linkedAt)}</p>
        {/if}
      </div>
      <form method="POST" action={unlinkAction}>
        {#if linkedHuman.linkId}
          <input type="hidden" name="linkId" value={linkedHuman.linkId} />
        {/if}
        <input type="hidden" name="humanId" value={linkedHuman.humanId} />
        <Button type="submit" variant="ghost" size="sm">Unlink</Button>
      </form>
    </div>
  </div>
{:else}
  <div class="glass-card overflow-visible p-3 mb-6">
    <div class="relative">
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium text-text-muted whitespace-nowrap shrink-0">Link Human</span>
        <span class="text-glass-border shrink-0" aria-hidden="true">|</span>
        <input
          type="text"
          bind:value={searchQuery}
          oninput={() => { if (searchQuery.length >= 2) searchHumans(); else searchResults = []; }}
          placeholder="Search by name to link existing..."
          class="glass-input flex-1 px-3 py-2 text-sm"
        />
        {#if searching}
          <span class="text-xs text-text-muted whitespace-nowrap shrink-0">Searching...</span>
        {/if}
        {#if createNewHumanUrl}
          <a
            href={resolve(createNewHumanUrl)}
            class="btn-primary inline-block text-sm whitespace-nowrap shrink-0"
          >
            Create New Human
          </a>
        {/if}
      </div>
      {#if searchResults.length > 0}
        <ul class="glass-popover glass-dropdown-animate absolute left-0 right-0 top-full mt-1 z-50 max-h-[16rem] overflow-y-auto py-1.5">
          {#each searchResults as human, i (i)}
            <li class="glass-dropdown-item flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-text-primary">{human.firstName} {human.lastName}</p>
                {#if human.emails?.[0]}
                  <p class="text-xs text-text-muted">{human.emails[0].email}</p>
                {/if}
              </div>
              <form method="POST" action={linkAction}>
                <input type="hidden" name="humanId" value={human.id} />
                <Button type="submit" size="sm">
                  Link
                </Button>
              </form>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
{/if}
