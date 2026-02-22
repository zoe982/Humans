<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import ConfettiOverlay from "$lib/components/ConfettiOverlay.svelte";
  import { toast } from "svelte-sonner";
  import { Trash2, CheckCircle } from "lucide-svelte";
  import * as Select from "$lib/components/ui/select";
  import * as Dialog from "$lib/components/ui/dialog";
  import GlassDateTimePicker from "$lib/components/GlassDateTimePicker.svelte";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { api } from "$lib/api";
  import { opportunityStageColors } from "$lib/constants/colors";
  import { opportunityStageLabels, OPPORTUNITY_STAGE_OPTIONS, TERMINAL_STAGES, ACTIVITY_TYPE_OPTIONS, activityTypeLabels } from "$lib/constants/labels";
  import { formatRelativeTime, summarizeChanges } from "$lib/utils/format";
  import { onDestroy } from "svelte";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type ConfigItem = { id: string; name: string; createdAt: string };
  type Colleague = { id: string; name: string };
  type HumanOption = { id: string; displayId?: string; firstName: string; middleName?: string | null; lastName: string };
  type LinkedHuman = { id: string; humanId: string; humanName: string; humanDisplayId: string; roleName: string | null; roleId: string | null };
  type LinkedPet = { id: string; petId: string; petName: string; petDisplayId: string; petType: string; ownerName: string | null };
  type Activity = {
    id: string;
    displayId: string;
    type: string;
    subject: string;
    notes: string | null;
    activityDate: string;
    createdAt: string;
  };
  type AuditEntry = {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    changes: Record<string, { old: unknown; new: unknown }> | null;
    createdAt: string;
    colleagueName: string | null;
  };
  type Opportunity = {
    id: string;
    displayId: string;
    stage: string;
    seatsRequested: number;
    lossReason: string | null;
    nextActionOwnerId: string | null;
    nextActionOwnerName: string | null;
    nextActionDescription: string | null;
    nextActionType: string | null;
    nextActionDueDate: string | null;
    nextActionCompletedAt: string | null;
    isOverdue: boolean;
    linkedHumans: LinkedHuman[];
    linkedPets: LinkedPet[];
    activities: Activity[];
    createdAt: string;
    updatedAt: string;
  };

  const opportunity = $derived(data.opportunity as Opportunity);
  const colleagues = $derived(data.colleagues as Colleague[]);
  const allHumans = $derived(data.allHumans as HumanOption[]);
  const roleConfigs = $derived(data.roleConfigs as ConfigItem[]);
  const apiUrl = $derived(data.apiUrl as string);

  const colleagueOptions = $derived(colleagues.map((c) => ({ value: c.id, label: c.name })));
  const humanOptions = $derived(allHumans.map((h) => ({
    value: h.id,
    label: `${h.displayId ? h.displayId + " — " : ""}${h.firstName} ${h.lastName}`,
  })));
  const roleOptions = $derived(roleConfigs.map((r) => ({ value: r.id, label: r.name })));

  const isTerminal = $derived(TERMINAL_STAGES.has(opportunity.stage));

  // Linked pet options: only from linked humans' pets
  const linkedHumanIds = $derived(new Set(opportunity.linkedHumans.map((h) => h.humanId)));

  // Auto-save state
  let seatsRequested = $state(1);
  let lossReason = $state("");
  let saveStatus = $state<SaveStatus>("idle");
  let initialized = $state(false);

  // Next action state
  let naOwnerId = $state("");
  let naDescription = $state("");
  let naType = $state("email");
  let naDueDate = $state("");

  // Confetti
  let showConfetti = $state(false);

  // Loss reason dialog
  let lossReasonDialogOpen = $state(false);
  let dialogLossReason = $state("");

  // New activity type
  let newActivityType = $state("email");

  // Change history
  let historyEntries = $state<AuditEntry[]>([]);
  let historyLoaded = $state(false);

  let activities = $state<Activity[]>([]);
  $effect(() => { activities = opportunity.activities; });

  // Initialize from data
  $effect(() => {
    seatsRequested = opportunity.seatsRequested;
    lossReason = opportunity.lossReason ?? "";
    naOwnerId = opportunity.nextActionOwnerId ?? "";
    naDescription = opportunity.nextActionDescription ?? "";
    naType = opportunity.nextActionType ?? "email";
    naDueDate = opportunity.nextActionDueDate ?? "";
    if (!initialized) initialized = true;
  });

  const autoSaver = createAutoSaver({
    endpoint: `/api/opportunities/${opportunity.id}`,
    onStatusChange: (s) => { saveStatus = s; },
    onSaved: () => {
      toast("Changes saved");
      historyLoaded = false;
    },
    onError: (err) => { toast(`Save failed: ${err}`); },
  });

  onDestroy(() => autoSaver.destroy());

  function triggerSave() {
    if (!initialized) return;
    autoSaver.save({ seatsRequested, lossReason: lossReason || null });
  }

  async function handleStageChange(newStage: string) {
    // closed_lost: require loss reason via dialog
    if (newStage === "closed_lost") {
      dialogLossReason = lossReason;
      lossReasonDialogOpen = true;
      return;
    }

    // closed_flown: auto-complete next action if present
    if (newStage === "closed_flown" && opportunity.nextActionDescription) {
      try {
        await api(`/api/opportunities/${opportunity.id}/next-action/done`, { method: "POST" });
      } catch { /* proceed anyway */ }
    }

    // Non-terminal: check next action is set
    if (!TERMINAL_STAGES.has(newStage) && !opportunity.nextActionDescription && newStage !== "open") {
      toast("Please set a next action before advancing the stage.");
      return;
    }

    saveStatus = "saving";
    try {
      await api(`/api/opportunities/${opportunity.id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage: newStage }),
      });
      saveStatus = "saved";
      toast("Stage updated");
      historyLoaded = false;
      await invalidateAll();
    } catch (err) {
      saveStatus = "error";
      toast(`Stage update failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function confirmCloseLost() {
    if (!dialogLossReason.trim()) {
      toast("Please provide a loss reason.");
      return;
    }

    saveStatus = "saving";
    try {
      // First save the loss reason
      await api(`/api/opportunities/${opportunity.id}`, {
        method: "PATCH",
        body: JSON.stringify({ lossReason: dialogLossReason }),
      });
      // Then change the stage
      await api(`/api/opportunities/${opportunity.id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage: "closed_lost", lossReason: dialogLossReason }),
      });
      saveStatus = "saved";
      lossReasonDialogOpen = false;
      toast("Opportunity closed as lost");
      historyLoaded = false;
      await invalidateAll();
    } catch (err) {
      saveStatus = "error";
      toast(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function saveNextAction() {
    if (!naOwnerId || !naDescription || !naType || !naDueDate) {
      toast("Please fill in all next action fields.");
      return;
    }
    saveStatus = "saving";
    try {
      await api(`/api/opportunities/${opportunity.id}/next-action`, {
        method: "PATCH",
        body: JSON.stringify({
          ownerId: naOwnerId,
          description: naDescription,
          type: naType,
          dueDate: new Date(naDueDate).toISOString(),
        }),
      });
      saveStatus = "saved";
      toast("Next action saved");
      historyLoaded = false;
      await invalidateAll();
    } catch (err) {
      saveStatus = "error";
      toast(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function completeNextAction() {
    saveStatus = "saving";
    try {
      await api(`/api/opportunities/${opportunity.id}/next-action/done`, { method: "POST" });
      saveStatus = "saved";
      showConfetti = true;
      setTimeout(() => { showConfetti = false; }, 2000);
      toast("Next action completed!");
      historyLoaded = false;
      await invalidateAll();
    } catch (err) {
      saveStatus = "error";
      toast(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function setPrimaryHuman(linkId: string) {
    try {
      // Find the "primary" role config
      const primaryRole = roleConfigs.find((r) => r.name.toLowerCase() === "primary");
      if (!primaryRole) {
        toast("Primary role not configured");
        return;
      }
      await api(`/api/opportunities/${opportunity.id}/humans/${linkId}`, {
        method: "PATCH",
        body: JSON.stringify({ roleId: primaryRole.id }),
      });
      toast("Set as primary");
      await invalidateAll();
    } catch (err) {
      toast(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function deleteActivity(id: string) {
    activities = activities.filter((a) => a.id !== id);
    try {
      await api(`/api/activities/${id}`, { method: "DELETE" });
      toast("Activity deleted");
    } catch {
      toast("Failed to delete activity");
      await invalidateAll();
    }
  }

  async function loadHistory() {
    if (historyLoaded) return;
    try {
      const result = await api(`/api/audit-log`, {
        params: { entityType: "opportunity", entityId: opportunity.id },
      }) as { data: AuditEntry[] };
      historyEntries = result.data;
      historyLoaded = true;
    } catch {
      historyEntries = [];
    }
  }

  $effect(() => {
    if (!historyLoaded) {
      void loadHistory();
    }
  });
</script>

<svelte:head>
  <title>{opportunity.displayId} — Opportunity - Humans</title>
</svelte:head>

<ConfettiOverlay trigger={showConfetti} />

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/opportunities"
    backLabel="Opportunities"
    title="{opportunity.displayId}"
    status={opportunity.stage}
    statusOptions={OPPORTUNITY_STAGE_OPTIONS.map((s) => s.value)}
    statusColorMap={opportunityStageColors}
    statusLabels={opportunityStageLabels}
    onStatusChange={handleStageChange}
  >
    {#snippet actions()}
      <div class="flex items-center gap-2">
        {#if opportunity.isOverdue}
          <span class="glass-badge badge-red text-xs">Overdue</span>
        {/if}
      </div>
    {/snippet}
  </RecordManagementBar>

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <!-- Core Details -->
  <div class="glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Details</h2>
      <SaveIndicator status={saveStatus} />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="seatsRequested" class="block text-sm font-medium text-text-secondary">Seats Requested</label>
        <input
          id="seatsRequested" type="number" min="1"
          bind:value={seatsRequested}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>
      {#if opportunity.stage === "closed_lost"}
        <div>
          <label for="lossReason" class="block text-sm font-medium text-text-secondary">Loss Reason</label>
          <textarea
            id="lossReason" rows="2"
            bind:value={lossReason}
            oninput={triggerSave}
            class="glass-input mt-1 block w-full"
          ></textarea>
        </div>
      {/if}
    </div>
  </div>

  <!-- Next Action -->
  {#if !isTerminal}
    <div class="mt-6 glass-card p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-text-primary">Next Action</h2>
        {#if opportunity.nextActionDescription}
          <Button size="sm" onclick={completeNextAction}>
            <CheckCircle size={16} class="mr-1" />
            Done
          </Button>
        {/if}
      </div>
      <p class="text-sm text-text-muted">
        A next action is the single most important step to move this opportunity forward.
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="naOwner" class="block text-sm font-medium text-text-secondary">Owner</label>
          <SearchableSelect
            options={colleagueOptions}
            name="naOwner"
            id="naOwner"
            value={naOwnerId}
            emptyOption="Select owner..."
            placeholder="Search colleagues..."
            onSelect={(value) => { naOwnerId = value; }}
          />
        </div>
        <div>
          <label for="naType" class="block text-sm font-medium text-text-secondary">Type</label>
          <input type="hidden" name="naType" value={naType} />
          <Select.Root type="single" value={naType} onValueChange={(v) => { if (v) naType = v; }}>
            <Select.Trigger>
              {activityTypeLabels[naType] ?? "Select type..."}
            </Select.Trigger>
            <Select.Content>
              {#each ACTIVITY_TYPE_OPTIONS as opt}
                <Select.Item value={opt.value}>{opt.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <div class="sm:col-span-2">
          <label for="naDescription" class="block text-sm font-medium text-text-secondary">Description</label>
          <input
            id="naDescription" type="text"
            bind:value={naDescription}
            class="glass-input mt-1 block w-full"
            placeholder="What needs to happen next?"
          />
        </div>
        <div>
          <label for="naDueDate" class="block text-sm font-medium text-text-secondary">Due Date</label>
          <GlassDateTimePicker
            name="naDueDate"
            id="naDueDate"
            value={naDueDate}
          />
        </div>
      </div>
      <Button size="sm" onclick={saveNextAction}>
        Save Next Action
      </Button>
    </div>
  {/if}

  <!-- Linked Humans -->
  <div class="mt-6">
    <RelatedListTable
      title="Linked Humans"
      items={opportunity.linkedHumans}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "name", label: "Name", sortable: true, sortValue: (h) => h.humanName },
        { key: "role", label: "Role", sortable: true, sortValue: (h) => h.roleName ?? "" },
        { key: "actions", label: "", headerClass: "w-20" },
      ]}
      defaultSortKey="name"
      defaultSortDirection="asc"
      searchFilter={(h, q) => h.humanName.toLowerCase().includes(q) || (h.roleName ?? "").toLowerCase().includes(q)}
      emptyMessage="No linked humans yet."
      addLabel="Human"
    >
      {#snippet row(link, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href="/humans/{link.humanId}" class="text-accent hover:text-[var(--link-hover)]">{link.humanDisplayId}</a>
        </td>
        <td>
          <a href="/humans/{link.humanId}" class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{link.humanName}</a>
        </td>
        <td>
          {#if link.roleName}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {link.roleName.toLowerCase() === 'primary' ? 'badge-blue' : 'badge-orange'}">
              {link.roleName}
            </span>
          {:else}
            <span class="text-text-muted">&mdash;</span>
          {/if}
        </td>
        <td>
          <div class="flex items-center gap-1">
            {#if link.roleName?.toLowerCase() !== "primary"}
              <button
                type="button"
                onclick={() => setPrimaryHuman(link.id)}
                class="text-xs text-accent hover:text-[var(--link-hover)]"
              >
                Set Primary
              </button>
            {/if}
            <form method="POST" action="?/unlinkHuman">
              <input type="hidden" name="linkId" value={link.id} />
              <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Unlink human">
                <Trash2 size={14} />
              </button>
            </form>
          </div>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/linkHuman" class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="humanSelect" class="block text-sm font-medium text-text-secondary">Human</label>
              <SearchableSelect
                options={humanOptions}
                name="humanId"
                id="humanSelect"
                required={true}
                emptyOption="Select a human..."
                placeholder="Search humans..."
              />
            </div>
            <div>
              <label for="roleSelect" class="block text-sm font-medium text-text-secondary">Role</label>
              <SearchableSelect
                options={roleOptions}
                name="roleId"
                id="roleSelect"
                emptyOption="Auto-assign"
                placeholder="Select role..."
              />
            </div>
          </div>
          <Button type="submit" size="sm">Link Human</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Linked Pets -->
  <div class="mt-6">
    <RelatedListTable
      title="Linked Pets"
      items={opportunity.linkedPets}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "name", label: "Name", sortable: true, sortValue: (p) => p.petName },
        { key: "type", label: "Type" },
        { key: "owner", label: "Owner" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="name"
      defaultSortDirection="asc"
      searchFilter={(p, q) => p.petName.toLowerCase().includes(q) || (p.ownerName ?? "").toLowerCase().includes(q)}
      emptyMessage="No linked pets yet. Link a human first, then add their pets."
      addLabel="Pet"
    >
      {#snippet row(link, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href="/pets/{link.petId}" class="text-accent hover:text-[var(--link-hover)]">{link.petDisplayId}</a>
        </td>
        <td>
          <a href="/pets/{link.petId}" class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{link.petName}</a>
        </td>
        <td>
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {link.petType === 'cat' ? 'badge-purple' : 'badge-blue'}">
            {link.petType === "cat" ? "Cat" : "Dog"}
          </span>
        </td>
        <td class="text-sm text-text-secondary">{link.ownerName ?? "\u2014"}</td>
        <td>
          <form method="POST" action="?/unlinkPet">
            <input type="hidden" name="linkId" value={link.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Unlink pet">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/linkPet" class="space-y-3">
          <div>
            <label for="petSelect" class="block text-sm font-medium text-text-secondary">Pet</label>
            <input name="petId" id="petSelect" type="text" required class="glass-input block w-full px-3 py-2 text-sm" placeholder="Enter pet ID" />
          </div>
          <Button type="submit" size="sm">Link Pet</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Activities -->
  <div class="mt-6">
    <RelatedListTable
      title="Activities"
      items={activities}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "type", label: "Type", sortable: true, sortValue: (a) => a.type },
        { key: "subject", label: "Subject", sortable: true, sortValue: (a) => a.subject },
        { key: "notes", label: "Notes" },
        { key: "activityDate", label: "Date", sortable: true, sortValue: (a) => a.activityDate },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="activityDate"
      defaultSortDirection="desc"
      searchFilter={(a, q) => a.subject.toLowerCase().includes(q) || (a.notes ?? "").toLowerCase().includes(q) || a.type.toLowerCase().includes(q)}
      emptyMessage="No activities yet."
      addLabel="Activity"
    >
      {#snippet row(activity, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href="/activities/{activity.id}" class="text-accent hover:text-[var(--link-hover)]">{activity.displayId}</a>
        </td>
        <td>
          <span class="glass-badge {activity.type === 'email' ? 'badge-blue' : activity.type === 'whatsapp_message' ? 'badge-green' : 'bg-glass text-text-secondary'}">
            {activityTypeLabels[activity.type] ?? activity.type}
          </span>
        </td>
        <td class="font-medium max-w-sm truncate">{activity.subject}</td>
        <td class="text-text-muted max-w-xs truncate">{activity.notes ?? "\u2014"}</td>
        <td class="text-text-muted whitespace-nowrap">{new Date(activity.activityDate).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
        <td>
          <button
            type="button"
            onclick={() => deleteActivity(activity.id)}
            class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150"
            aria-label="Delete activity"
          >
            <Trash2 size={14} />
          </button>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addActivity" class="space-y-3">
          <div class="flex gap-3 items-end">
            <div class="w-48 shrink-0">
              <label for="activityType" class="block text-sm font-medium text-text-secondary mb-1">Type</label>
              <input type="hidden" name="type" value={newActivityType} />
              <Select.Root type="single" value={newActivityType} onValueChange={(v) => { if (v) newActivityType = v; }}>
                <Select.Trigger>
                  {activityTypeLabels[newActivityType] ?? "Select type..."}
                </Select.Trigger>
                <Select.Content>
                  {#each ACTIVITY_TYPE_OPTIONS as opt}
                    <Select.Item value={opt.value}>{opt.label}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
            <div class="flex-1 min-w-0">
              <label for="activityDate" class="block text-sm font-medium text-text-secondary mb-1">Date</label>
              <GlassDateTimePicker name="activityDate" id="activityDate" />
            </div>
          </div>
          <div>
            <label for="subject" class="block text-sm font-medium text-text-secondary mb-1">Subject</label>
            <input
              id="subject" name="subject" type="text" required
              class="glass-input w-full px-3 py-2 text-sm"
              placeholder="Activity subject"
            />
          </div>
          <div>
            <label for="activityNotes" class="block text-sm font-medium text-text-secondary mb-1">Notes</label>
            <textarea
              id="activityNotes" name="notes" rows="2"
              class="glass-input w-full px-3 py-2 text-sm"
              placeholder="Optional notes..."
            ></textarea>
          </div>
          <Button type="submit" size="sm">Add Activity</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Change History -->
  <div class="mt-6">
    <RelatedListTable
      title="Change History"
      items={historyEntries}
      columns={[
        { key: "colleague", label: "Colleague" },
        { key: "action", label: "Action" },
        { key: "time", label: "Time" },
        { key: "changes", label: "Changes" },
      ]}
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

<!-- Loss Reason Dialog -->
<Dialog.Root bind:open={lossReasonDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Close as Lost</Dialog.Title>
      <Dialog.Description>Please provide a reason for closing this opportunity.</Dialog.Description>
    </Dialog.Header>
    <div class="mt-4">
      <label for="dialogLossReason" class="block text-sm font-medium text-text-secondary mb-1">Loss Reason</label>
      <textarea
        id="dialogLossReason"
        rows="3"
        bind:value={dialogLossReason}
        class="glass-input w-full px-3 py-2 text-sm"
        placeholder="Why was this opportunity lost?"
      ></textarea>
    </div>
    <Dialog.Footer>
      <Button size="sm" onclick={confirmCloseLost}>
        Confirm Close
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
