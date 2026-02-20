<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import LinkedRecordBox from "$lib/components/LinkedRecordBox.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import PhoneInput from "$lib/components/PhoneInput.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import { toast } from "svelte-sonner";
  import TabBar from "$lib/components/TabBar.svelte";
  import { ChevronRight, ChevronDown } from "lucide-svelte";
  import { slide } from "svelte/transition";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { api } from "$lib/api";
  import { onDestroy } from "svelte";
  import { statusColors as statusColorMap, activityTypeColors } from "$lib/constants/colors";
  import { activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { formatRelativeTime, summarizeChanges } from "$lib/utils/format";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type ConfigItem = { id: string; name: string };
  type AccountType = { id: string; name: string };
  type AccountEmail = { id: string; email: string; labelId: string | null; labelName: string | null; isPrimary: boolean };
  type AccountPhone = { id: string; phoneNumber: string; labelId: string | null; labelName: string | null; hasWhatsapp: boolean; isPrimary: boolean };
  type HumanEmail = { id: string; email: string; label: string; isPrimary: boolean };
  type HumanPhone = { id: string; phoneNumber: string; label: string; hasWhatsapp: boolean; isPrimary: boolean };
  type LinkedHuman = {
    id: string;
    accountId: string;
    humanId: string;
    labelId: string | null;
    humanName: string;
    humanStatus: string | null;
    labelName: string | null;
    emails: HumanEmail[];
    phoneNumbers: HumanPhone[];
  };
  type Activity = {
    id: string;
    type: string;
    subject: string;
    notes: string | null;
    body: string | null;
    activityDate: string;
    createdAt: string;
  };
  type HumanActivity = Activity & { viaHumanName: string };
  type HumanListItem = { id: string; firstName: string; lastName: string };
  type Account = {
    id: string;
    name: string;
    status: string;
    types: AccountType[];
    emails: AccountEmail[];
    phoneNumbers: AccountPhone[];
    linkedHumans: LinkedHuman[];
    activities: Activity[];
    humanActivities: HumanActivity[];
    createdAt: string;
    updatedAt: string;
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

  const account = $derived(data.account as Account);
  const typeConfigs = $derived(data.typeConfigs as ConfigItem[]);
  const humanLabelConfigs = $derived(data.humanLabelConfigs as ConfigItem[]);
  const emailLabelConfigs = $derived(data.emailLabelConfigs as ConfigItem[]);
  const phoneLabelConfigs = $derived(data.phoneLabelConfigs as ConfigItem[]);
  const allHumans = $derived(data.allHumans as HumanListItem[]);

  const humanOptions = $derived(allHumans.map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName}` })));
  const emailLabelOptions = $derived(emailLabelConfigs.map((l) => ({ value: l.id, label: l.name })));
  const phoneLabelOptions = $derived(phoneLabelConfigs.map((l) => ({ value: l.id, label: l.name })));
  const humanLabelOptions = $derived(humanLabelConfigs.map((l) => ({ value: l.id, label: l.name })));

  // Auto-save state
  let accountName = $state("");
  let typeIds = $state<string[]>([]);
  let saveStatus = $state<SaveStatus>("idle");
  let lastAuditEntryId = $state<string | null>(null);
  let initialized = $state(false);

  // Change history
  let historyOpen = $state(false);
  let historyEntries = $state<AuditEntry[]>([]);
  let historyLoaded = $state(false);

  let activeTab = $state("overview");
  let showActivityForm = $state(false);
  let humanAddMode = $state<'link' | 'create'>('link');

  const accountTabs = [
    { id: "overview", label: "Overview" },
    { id: "people", label: "People" },
    { id: "activity", label: "Activity" },
    { id: "history", label: "History" },
  ];

  // Initialize state from data
  $effect(() => {
    accountName = account.name;
    typeIds = account.types.map((t) => t.id);
    if (!initialized) initialized = true;
  });

  const autoSaver = createAutoSaver({
    endpoint: `/api/accounts/${account.id}`,
    onStatusChange: (s) => { saveStatus = s; },
    onSaved: (result) => {
      if (result.auditEntryId) {
        lastAuditEntryId = result.auditEntryId;
        toast("Changes saved", {
          action: { label: "Undo", onClick: () => handleUndo() },
        });
        historyLoaded = false;
      }
    },
    onError: (err) => {
      toast(`Save failed: ${err}`);
    },
  });

  onDestroy(() => autoSaver.destroy());

  function triggerSave() {
    if (!initialized) return;
    autoSaver.save({ name: accountName, typeIds });
  }

  function triggerSaveImmediate() {
    if (!initialized) return;
    autoSaver.saveImmediate({ name: accountName, typeIds });
  }

  function handleTypeChange(typeId: string, checked: boolean) {
    if (checked) {
      if (!typeIds.includes(typeId)) typeIds = [...typeIds, typeId];
    } else {
      typeIds = typeIds.filter((id) => id !== typeId);
    }
    triggerSaveImmediate();
  }

  async function handleStatusChange(newStatus: string) {
    saveStatus = "saving";
    try {
      await api(`/api/accounts/${account.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      saveStatus = "saved";
      toast("Status updated");
      historyLoaded = false;
      await invalidateAll();
    } catch {
      saveStatus = "error";
    }
  }

  async function handleUndo() {
    if (!lastAuditEntryId) return;
    try {
      await api(`/api/audit-log/${lastAuditEntryId}/undo`, { method: "POST" });
      lastAuditEntryId = null;
      historyLoaded = false;
      await invalidateAll();
    } catch {
      toast("Undo failed");
    }
  }

  async function loadHistory() {
    if (historyLoaded) return;
    try {
      const result = await api(`/api/audit-log`, {
        params: { entityType: "account", entityId: account.id },
      }) as { data: AuditEntry[] };
      historyEntries = result.data;
      historyLoaded = true;
    } catch {
      historyEntries = [];
    }
  }

  function toggleHistory() {
    historyOpen = !historyOpen;
    if (historyOpen) loadHistory();
  }

</script>

<svelte:head>
  <title>{account.displayId} — {account.name} - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Record Management Bar -->
  <RecordManagementBar
    backHref="/accounts"
    backLabel="Accounts"
    title="{account.displayId} — {account.name}"
    status={account.status}
    statusOptions={["open", "active", "closed"]}
    {statusColorMap}
    onStatusChange={handleStatusChange}
  >
    {#snippet actions()}
      <div class="flex gap-1">
        {#each account.types as t}
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(168,85,247,0.15)] text-purple-300">
            {t.name}
          </span>
        {/each}
      </div>
    {/snippet}
  </RecordManagementBar>

  <!-- Alerts -->
  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <TabBar tabs={accountTabs} {activeTab} onTabChange={(id) => { activeTab = id; }} />

  <!-- Overview Tab -->
  <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" class={activeTab !== "overview" ? "hidden" : ""}>

  <!-- Details (auto-save, no form submission) -->
  <div class="glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Details</h2>
      <SaveIndicator status={saveStatus} />
    </div>

    <div>
      <label for="accountName" class="block text-sm font-medium text-text-secondary">Account Name</label>
      <input
        id="accountName" type="text" required
        bind:value={accountName}
        oninput={triggerSave}
        class="glass-input mt-1 block w-full"
      />
    </div>

    {#if typeConfigs.length > 0}
      <div>
        <label class="block text-sm font-medium text-text-secondary">Types</label>
        <div class="mt-2 flex gap-4 flex-wrap">
          {#each typeConfigs as t (t.id)}
            <label class="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={typeIds.includes(t.id)}
                onchange={(e) => handleTypeChange(t.id, (e.target as HTMLInputElement).checked)}
                class="rounded border-glass-border"
              />
              {t.name}
            </label>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Emails Section -->
  <div class="mt-6">
    <LinkedRecordBox
      title="Emails"
      items={account.emails}
      emptyMessage="No emails yet."
      addLabel="Email"
      deleteFormAction="?/deleteEmail"
    >
      {#snippet itemRow(item)}
        {@const email = item as unknown as AccountEmail}
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-text-primary">{email.email}</span>
          {#if email.labelName}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(168,85,247,0.15)] text-purple-300">
              {email.labelName}
            </span>
          {/if}
          {#if email.isPrimary}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(59,130,246,0.15)] text-blue-300">Primary</span>
          {/if}
        </div>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addEmail" class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="emailAddress" class="block text-sm font-medium text-text-secondary">Email</label>
              <input
                id="emailAddress" name="email" type="email" required
                class="glass-input mt-1 block w-full"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label for="emailLabel" class="block text-sm font-medium text-text-secondary">Label</label>
              <SearchableSelect
                options={emailLabelOptions}
                name="labelId"
                id="emailLabel"
                emptyOption="None"
                placeholder="Select label..."
              />
            </div>
          </div>
          <div>
            <label class="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" name="isPrimary" class="rounded border-glass-border" />
              Primary
            </label>
          </div>
          <button type="submit" class="btn-primary text-sm">Add Email</button>
        </form>
      {/snippet}
    </LinkedRecordBox>
  </div>

  <!-- Phone Numbers Section -->
  <div class="mt-6">
    <LinkedRecordBox
      title="Phone Numbers"
      items={account.phoneNumbers}
      emptyMessage="No phone numbers yet."
      addLabel="Phone"
      deleteFormAction="?/deletePhoneNumber"
    >
      {#snippet itemRow(item)}
        {@const phone = item as unknown as AccountPhone}
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-text-primary">{phone.phoneNumber}</span>
          {#if phone.labelName}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(168,85,247,0.15)] text-purple-300">
              {phone.labelName}
            </span>
          {/if}
          {#if phone.hasWhatsapp}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(34,197,94,0.15)] text-green-300">WhatsApp</span>
          {/if}
          {#if phone.isPrimary}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(59,130,246,0.15)] text-blue-300">Primary</span>
          {/if}
        </div>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addPhoneNumber" class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="phoneNumber" class="block text-sm font-medium text-text-secondary">Phone Number</label>
              <PhoneInput name="phoneNumber" id="phoneNumber" />
            </div>
            <div>
              <label for="phoneLabel" class="block text-sm font-medium text-text-secondary">Label</label>
              <SearchableSelect
                options={phoneLabelOptions}
                name="labelId"
                id="phoneLabel"
                emptyOption="None"
                placeholder="Select label..."
              />
            </div>
          </div>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" name="hasWhatsapp" class="rounded border-glass-border" />
              WhatsApp
            </label>
            <label class="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" name="isPrimary" class="rounded border-glass-border" />
              Primary
            </label>
          </div>
          <button type="submit" class="btn-primary text-sm">Add Phone Number</button>
        </form>
      {/snippet}
    </LinkedRecordBox>
  </div>

  </div><!-- /panel-overview -->

  <!-- People Tab -->
  <div id="panel-people" role="tabpanel" aria-labelledby="tab-people" class={activeTab !== "people" ? "hidden" : ""}>

  <!-- Linked Humans Section -->
  <div class="mt-6">
    <LinkedRecordBox
      title="Linked Humans"
      items={account.linkedHumans}
      emptyMessage="No humans linked yet."
      addLabel="Human"
      deleteFormAction="?/unlinkHuman"
    >
      {#snippet itemRow(item)}
        {@const link = item as unknown as LinkedHuman}
        <div>
          <div class="flex items-center gap-3">
            <a href="/humans/{link.humanId}" class="text-sm font-medium text-accent hover:text-cyan-300">
              {link.humanName}
            </a>
            {#if link.labelName}
              <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(249,115,22,0.15)] text-orange-300">
                {link.labelName}
              </span>
            {/if}
          </div>
          {#if link.emails.length > 0}
            <div class="mt-1 flex flex-wrap gap-2">
              {#each link.emails as e}
                <span class="text-xs text-text-muted">{e.email}</span>
              {/each}
            </div>
          {/if}
          {#if link.phoneNumbers.length > 0}
            <div class="mt-0.5 flex flex-wrap gap-2">
              {#each link.phoneNumbers as p}
                <span class="text-xs text-text-muted">{p.phoneNumber}</span>
              {/each}
            </div>
          {/if}
        </div>
      {/snippet}
      {#snippet addForm()}
        <div class="flex gap-2 mb-3">
          <button
            type="button"
            onclick={() => { humanAddMode = 'link'; }}
            class="text-sm py-1 px-3 rounded-md transition-colors {humanAddMode === 'link' ? 'btn-primary' : 'btn-ghost'}"
          >
            Link Existing
          </button>
          <button
            type="button"
            onclick={() => { humanAddMode = 'create'; }}
            class="text-sm py-1 px-3 rounded-md transition-colors {humanAddMode === 'create' ? 'btn-primary' : 'btn-ghost'}"
          >
            Create New
          </button>
        </div>

        {#if humanAddMode === 'link'}
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
                <label for="humanLabel" class="block text-sm font-medium text-text-secondary">Role Label</label>
                <SearchableSelect
                  options={humanLabelOptions}
                  name="labelId"
                  id="humanLabel"
                  emptyOption="None"
                  placeholder="Select role..."
                />
              </div>
            </div>
            <button type="submit" class="btn-primary text-sm">Link Human</button>
          </form>
        {:else}
          <form method="POST" action="?/createAndLinkHuman" class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label for="newHumanFirst" class="block text-sm font-medium text-text-secondary">First Name</label>
                <input
                  id="newHumanFirst" name="firstName" type="text" required
                  class="glass-input mt-1 block w-full"
                  placeholder="First name"
                />
              </div>
              <div>
                <label for="newHumanLast" class="block text-sm font-medium text-text-secondary">Last Name</label>
                <input
                  id="newHumanLast" name="lastName" type="text" required
                  class="glass-input mt-1 block w-full"
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <label for="newHumanLabel" class="block text-sm font-medium text-text-secondary">Role Label</label>
              <SearchableSelect
                options={humanLabelOptions}
                name="labelId"
                id="newHumanLabel"
                emptyOption="None"
                placeholder="Select role..."
              />
            </div>
            <button type="submit" class="btn-primary text-sm">Create & Link</button>
          </form>
        {/if}
      {/snippet}
    </LinkedRecordBox>
  </div>

  </div><!-- /panel-people -->

  <!-- Activity Tab -->
  <div id="panel-activity" role="tabpanel" aria-labelledby="tab-activity" class={activeTab !== "activity" ? "hidden" : ""}>

  <!-- Account Activities (direct) -->
  <div class="mt-6 glass-card p-5">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-text-primary">Account Activities</h2>
      <button
        type="button"
        onclick={() => { showActivityForm = !showActivityForm; }}
        class="btn-ghost text-sm py-1 px-3"
      >
        {showActivityForm ? "Cancel" : "+ Add Activity"}
      </button>
    </div>

    {#if showActivityForm}
      <div class="mb-4 p-4 rounded-lg bg-glass border border-glass-border">
        <form method="POST" action="?/addActivity" class="space-y-3">
          <div>
            <label for="activityType" class="block text-sm font-medium text-text-secondary">Type</label>
            <SearchableSelect
              options={ACTIVITY_TYPE_OPTIONS}
              name="type"
              id="activityType"
              value="email"
              placeholder="Select type..."
            />
          </div>
          <div>
            <label for="subject" class="block text-sm font-medium text-text-secondary">Subject</label>
            <input
              id="subject" name="subject" type="text" required
              class="glass-input mt-1 block w-full"
              placeholder="Activity subject"
            />
          </div>
          <div>
            <label for="notes" class="block text-sm font-medium text-text-secondary">Notes</label>
            <textarea
              id="notes" name="notes" rows="3"
              class="glass-input mt-1 block w-full"
              placeholder="Optional notes..."
            ></textarea>
          </div>
          <div>
            <label for="activityDate" class="block text-sm font-medium text-text-secondary">Date</label>
            <input
              id="activityDate" name="activityDate" type="datetime-local"
              class="glass-input mt-1 block w-full"
            />
          </div>
          <button type="submit" class="btn-primary text-sm">Add Activity</button>
        </form>
      </div>
    {/if}

    {#if account.activities.length === 0}
      <p class="text-text-muted text-sm">No account activities yet.</p>
    {:else}
      <div class="space-y-2">
        {#each account.activities as activity (activity.id)}
          <div class="p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
                  {activityTypeLabels[activity.type] ?? activity.type}
                </span>
                <p class="text-sm font-medium text-text-primary">{activity.subject}</p>
              </div>
              <span class="text-xs text-text-muted">{new Date(activity.activityDate).toLocaleDateString()}</span>
            </div>
            {#if activity.notes || activity.body}
              <p class="mt-1 text-sm text-text-secondary">{activity.notes ?? activity.body}</p>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Human Activities (from linked humans, read-only) -->
  {#if account.humanActivities.length > 0}
    <div class="mt-6 glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Human Activities</h2>
      <div class="space-y-2">
        {#each account.humanActivities as activity (activity.id)}
          <div class="p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
                  {activityTypeLabels[activity.type] ?? activity.type}
                </span>
                <p class="text-sm font-medium text-text-primary">{activity.subject}</p>
                <span class="text-xs text-text-muted">via {activity.viaHumanName}</span>
              </div>
              <span class="text-xs text-text-muted">{new Date(activity.activityDate).toLocaleDateString()}</span>
            </div>
            {#if activity.notes || activity.body}
              <p class="mt-1 text-sm text-text-secondary">{activity.notes ?? activity.body}</p>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  </div><!-- /panel-activity -->

  <!-- History Tab -->
  <div id="panel-history" role="tabpanel" aria-labelledby="tab-history" class={activeTab !== "history" ? "hidden" : ""}>

  <!-- Change History -->
  <div class="mt-6 glass-card p-5">
    <button
      type="button"
      aria-expanded={historyOpen}
      onclick={toggleHistory}
      class="flex items-center gap-2 w-full text-left"
    >
      <span class="text-lg font-semibold text-text-primary">Change History</span>
      <span class="text-text-muted" aria-hidden="true">
        {#if historyOpen}<ChevronDown size={16} />{:else}<ChevronRight size={16} />{/if}
      </span>
    </button>

    {#if historyOpen}
      <div transition:slide={{ duration: 200 }} class="mt-4 space-y-2">
        {#if historyEntries.length === 0}
          <p class="text-text-muted text-sm">No changes recorded yet.</p>
        {:else}
          {#each historyEntries as entry (entry.id)}
            <div class="p-3 rounded-lg bg-glass">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-text-primary">{entry.colleagueName ?? "System"}</span>
                  <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-secondary">
                    {entry.action}
                  </span>
                </div>
                <span class="text-xs text-text-muted">{formatRelativeTime(entry.createdAt)}</span>
              </div>
              <p class="mt-1 text-xs text-text-secondary">{summarizeChanges(entry.changes)}</p>
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>

  </div><!-- /panel-history -->
</div>

