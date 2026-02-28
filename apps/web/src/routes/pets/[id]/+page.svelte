<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import { toast } from "svelte-sonner";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { PET_BREEDS } from "@humans/shared/constants";
  import { onDestroy } from "svelte";
  import { formatRelativeTime, summarizeChanges } from "$lib/utils/format";
  import { createChangeHistoryLoader } from "$lib/changeHistory.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/stores";
  import { Trash2 } from "lucide-svelte";
  import { opportunityStageColors } from "$lib/constants/colors";
  import { opportunityStageLabels } from "$lib/constants/labels";

  let { data }: { data: PageData } = $props();

  type HumanListItem = { id: string; firstName: string; lastName: string; displayId: string };
  type Pet = {
    id: string;
    displayId: string;
    humanId: string | null;
    type: string;
    name: string | null;
    breed: string | null;
    weight: number | null;
    notes: string | null;
    ownerName: string | null;
    ownerDisplayId: string | null;
  };
  type PetOpportunity = {
    linkId: string;
    id: string;
    displayId: string;
    stage: string;
    primaryHumanName: string | null;
    createdAt: string;
  };
  type OpportunityListItem = { id: string; displayId: string; stage: string };

  const pet = $derived(data.pet as Pet);
  const allHumans = $derived(data.allHumans as HumanListItem[]);
  const petOpportunities = $derived(data.petOpportunities as PetOpportunity[]);
  const allOpportunities = $derived(data.allOpportunities as OpportunityListItem[]);

  const linkedOppIds = $derived(new Set(petOpportunities.map((o) => o.id)));
  const availableOpportunityOptions = $derived(
    allOpportunities
      .filter((o) => !linkedOppIds.has(o.id))
      .map((o) => ({
        value: o.id,
        label: `${o.displayId} — ${opportunityStageLabels[o.stage] ?? o.stage}`,
      }))
  );

  let oppSelectKey = $state(0);

  // Auto-save state
  let petName = $state("");
  let petType = $state("dog");
  let petBreed = $state("");
  let petWeight = $state("");
  let petNotes = $state("");
  let ownerId = $state("");
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);
  let breedDropdownOpen = $state(false);

  let autoSaver: ReturnType<typeof createAutoSaver>;

  function initServices() {
    const _history = createChangeHistoryLoader("pet", pet.id);
    autoSaver = createAutoSaver({
      endpoint: `/api/pets/${pet.id}`,
      onStatusChange: (s) => { saveStatus = s; },
      onSaved: () => {
        toast("Changes saved");
        _history.resetHistory();
      },
      onError: (err) => {
        toast(`Save failed: ${err}`);
      },
    });
    return _history;
  }
  const history = initServices();

  $effect(() => {
    if (!history.historyLoaded) {
      void history.loadHistory();
    }
  });

  // Initialize state from data
  $effect(() => {
    petName = pet.name ?? "";
    petType = pet.type;
    petBreed = pet.breed ?? "";
    petWeight = pet.weight != null ? String(pet.weight) : "";
    petNotes = pet.notes ?? "";
    ownerId = pet.humanId ?? "";
    if (!initialized) initialized = true;
  });

  const humanOptions = $derived(
    allHumans.map((h) => ({ value: h.id, label: `${h.displayId} ${h.firstName} ${h.lastName}` }))
  );

  onDestroy(() => autoSaver.destroy());

  function buildPayload() {
    const payload: Record<string, unknown> = {
      name: petName.trim() || null,
      type: petType,
      breed: petType === "dog" && petBreed ? petBreed : null,
      weight: petWeight ? parseFloat(petWeight) : null,
      notes: petNotes || null,
      humanId: ownerId || undefined,
    };
    return payload;
  }

  function triggerSave() {
    if (!initialized) return;
    autoSaver.save(buildPayload());
  }

  function triggerSaveImmediate() {
    if (!initialized) return;
    autoSaver.saveImmediate(buildPayload());
  }

  function handleTypeChange(type: string) {
    petType = type;
    if (type === "cat") {
      petBreed = "";
    }
    triggerSaveImmediate();
  }

  function handleOwnerChange(value: string) {
    ownerId = value;
    triggerSaveImmediate();
  }

  function handleBreedChange(value: string) {
    petBreed = value;
    triggerSaveImmediate();
  }
</script>

<svelte:head>
  <title>{pet.displayId} — {pet.name ?? pet.displayId} - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/pets"
    backLabel="Pets"
    title="{pet.displayId} — {pet.name ?? pet.displayId}"
  />

  <div class="glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Details</h2>
      <SaveIndicator status={saveStatus} />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="petName" class="block text-sm font-medium text-text-secondary">Name</label>
        <input
          id="petName" type="text"
          bind:value={petName}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>
      <div>
        <span class="block text-sm font-medium text-text-secondary mb-2">Type</span>
        <div class="flex gap-2">
          <button
            type="button"
            onclick={() => handleTypeChange("dog")}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {petType === 'dog' ? 'badge-blue ring-1 ring-[var(--badge-blue-text)]/30' : 'bg-glass text-text-secondary hover:bg-glass-hover'}"
          >
            Dog
          </button>
          <button
            type="button"
            onclick={() => handleTypeChange("cat")}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {petType === 'cat' ? 'badge-purple ring-1 ring-[var(--badge-purple-text)]/30' : 'bg-glass text-text-secondary hover:bg-glass-hover'}"
          >
            Cat
          </button>
        </div>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      {#if petType === "dog"}
        <div class={breedDropdownOpen ? "relative z-10" : ""}>
          <label for="petBreed" class="block text-sm font-medium text-text-secondary">Breed</label>
          <SearchableSelect
            options={PET_BREEDS}
            name="breed"
            id="petBreed"
            value={petBreed}
            placeholder="Search breeds..."
            emptyOption="None"
            onSelect={handleBreedChange}
            onOpenChange={(isOpen) => { breedDropdownOpen = isOpen; }}
          />
        </div>
      {/if}
      <div class={petType === "dog" ? "" : "sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]"}>
        <label for="petWeight" class="block text-sm font-medium text-text-secondary">Weight (kg)</label>
        <input
          id="petWeight" type="number" step="0.1" min="0"
          bind:value={petWeight}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>
    </div>

    <div>
      <label for="owner" class="block text-sm font-medium text-text-secondary">Owner</label>
      <SearchableSelect
        options={humanOptions}
        name="owner"
        id="owner"
        value={ownerId}
        placeholder="Search owners..."
        emptyOption="None"
        onSelect={handleOwnerChange}
      />
      {#if pet.humanId && pet.ownerName}
        <a href={resolve(`/humans/${pet.humanId}?from=${$page.url.pathname}`)} class="mt-1 inline-block text-sm text-accent hover:text-[var(--link-hover)]">
          View {pet.ownerName}
        </a>
      {/if}
    </div>

    <div>
      <label for="petNotes" class="block text-sm font-medium text-text-secondary">Notes</label>
      <textarea
        id="petNotes" rows="3"
        bind:value={petNotes}
        oninput={triggerSave}
        class="glass-input mt-1 block w-full"
        placeholder="Add notes about this pet..."
      ></textarea>
    </div>
  </div>

  <!-- Opportunities -->
  <div class="mt-6">
    <RelatedListTable
      title="Opportunities"
      items={petOpportunities}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "stage", label: "Stage", sortable: true, sortValue: (o) => o.stage },
        { key: "primaryHuman", label: "Primary Human" },
        { key: "actions", label: "" },
      ]}
      defaultSortKey="stage"
      defaultSortDirection="asc"
      searchFilter={(o, q) => o.displayId.toLowerCase().includes(q) || (opportunityStageLabels[o.stage] ?? o.stage).toLowerCase().includes(q) || (o.primaryHumanName ?? "").toLowerCase().includes(q)}
      emptyMessage="No linked opportunities."
      addLabel="Opportunity"
    >
      {#snippet row(opp, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href={resolve(`/opportunities/${opp.id}?from=${$page.url.pathname}`)} class="text-accent hover:text-[var(--link-hover)]">{opp.displayId}</a>
        </td>
        <td>
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {opportunityStageColors[opp.stage] ?? 'bg-glass text-text-secondary'}">
            {opportunityStageLabels[opp.stage] ?? opp.stage}
          </span>
        </td>
        <td class="text-sm text-text-secondary">{opp.primaryHumanName ?? "—"}</td>
        <td class="text-right">
          <form method="POST" action="?/unlinkOpportunity" class="inline">
            <input type="hidden" name="opportunityId" value={opp.id} />
            <input type="hidden" name="linkId" value={opp.linkId} />
            <button type="submit" class="p-1 text-text-muted hover:text-red-400 transition-colors" title="Unlink opportunity">
              <Trash2 class="h-4 w-4" />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/linkOpportunity" class="space-y-3">
          <input type="hidden" name="petHumanId" value={pet.humanId ?? ""} />
          {#key oppSelectKey}
            <SearchableSelect
              options={availableOpportunityOptions}
              name="opportunityId"
              id="oppSelect"
              emptyOption="Select an opportunity..."
              placeholder="Search opportunities..."
              onSelect={() => { oppSelectKey++; }}
            />
          {/key}
          <div class="flex items-center gap-3">
            <button type="submit" class="btn-primary text-sm px-3 py-1.5">Link Opportunity</button>
            <span class="text-text-muted text-xs">or</span>
            <a href={resolve(`/opportunities/new?humanId=${pet.humanId ?? ""}&petId=${pet.id}`)} class="text-sm text-accent hover:text-[var(--link-hover)]">
              Create New Opportunity
            </a>
          </div>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Change History -->
  <div class="mt-6">
    <RelatedListTable
      title="Change History"
      items={history.historyEntries}
      columns={[
        { key: "colleague", label: "Colleague", sortable: true, sortValue: (e) => e.colleagueName ?? "" },
        { key: "action", label: "Action", sortable: true, sortValue: (e) => e.action },
        { key: "time", label: "Time", sortable: true, sortValue: (e) => e.createdAt },
        { key: "changes", label: "Changes", sortable: true, sortValue: (e) => summarizeChanges(e.changes) },
      ]}
      defaultSortKey="time"
      defaultSortDirection="desc"
      searchFilter={(e, q) =>
        (e.colleagueName ?? "").toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        summarizeChanges(e.changes).toLowerCase().includes(q)}
      searchEmptyMessage="No history entries match your search."
      emptyMessage="No changes recorded yet."
    >
      {#snippet row(entry, _searchQuery)}
        <td class="text-sm font-medium text-text-primary">{entry.colleagueName ?? "System"}</td>
        <td>
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-secondary">
            {entry.action}
          </span>
        </td>
        <td class="text-sm text-text-muted whitespace-nowrap">{formatRelativeTime(entry.createdAt)}</td>
        <td class="text-xs text-text-secondary max-w-sm truncate">{summarizeChanges(entry.changes)}</td>
      {/snippet}
    </RelatedListTable>
  </div>
</div>
