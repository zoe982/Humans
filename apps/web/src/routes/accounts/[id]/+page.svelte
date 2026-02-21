<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import PhoneInput from "$lib/components/PhoneInput.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import HighlightText from "$lib/components/HighlightText.svelte";
  import { toast } from "svelte-sonner";
  import TabBar from "$lib/components/TabBar.svelte";
  import { Trash2 } from "lucide-svelte";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { api } from "$lib/api";
  import { onDestroy } from "svelte";
  import { statusColors as statusColorMap, activityTypeColors } from "$lib/constants/colors";
  import { activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { formatRelativeTime, summarizeChanges } from "$lib/utils/format";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  function truncateText(s: string | null, len: number): string {
    if (!s) return "\u2014";
    return s.length > len ? s.slice(0, len) + "..." : s;
  }

  type ConfigItem = { id: string; name: string };
  type AccountType = { id: string; name: string };
  type AccountEmail = { id: string; email: string; labelId: string | null; labelName: string | null; isPrimary: boolean };
  type AccountPhone = { id: string; phoneNumber: string; labelId: string | null; labelName: string | null; hasWhatsapp: boolean; isPrimary: boolean };
  type SocialIdItem = { id: string; displayId: string; handle: string; platformId: string | null; platformName: string | null };
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
    socialIds: SocialIdItem[];
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
  const socialIdPlatformConfigs = $derived(data.socialIdPlatformConfigs as ConfigItem[]);

  const humanOptions = $derived(allHumans.map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName}` })));
  const emailLabelOptions = $derived(emailLabelConfigs.map((l) => ({ value: l.id, label: l.name })));
  const phoneLabelOptions = $derived(phoneLabelConfigs.map((l) => ({ value: l.id, label: l.name })));
  const humanLabelOptions = $derived(humanLabelConfigs.map((l) => ({ value: l.id, label: l.name })));
  const socialIdPlatformOptions = $derived(socialIdPlatformConfigs.map((p) => ({ value: p.id, label: p.name })));

  // Auto-save state
  let accountName = $state("");
  let typeIds = $state<string[]>([]);
  let saveStatus = $state<SaveStatus>("idle");
  let lastAuditEntryId = $state<string | null>(null);
  let initialized = $state(false);

  // Change history
  let historyEntries = $state<AuditEntry[]>([]);
  let historyLoaded = $state(false);

  let activeTab = $state("overview");
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

  // Auto-load history when History tab is active
  $effect(() => {
    if (activeTab === "history" && !historyLoaded) {
      void loadHistory();
    }
  });

</script>

<svelte:head>
  <title>{account.displayId} — {account.name} - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
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
    <RelatedListTable
      title="Emails"
      items={account.emails}
      columns={[
        { key: "email", label: "Email" },
        { key: "label", label: "Label" },
        { key: "flags", label: "" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      emptyMessage="No emails yet."
      addLabel="Email"
    >
      {#snippet row(email, _searchQuery)}
        <td>
          <a href="/emails/{email.id}" class="text-sm font-medium text-accent hover:text-cyan-300">{email.email}</a>
        </td>
        <td>
          <div class="w-36">
            <SearchableSelect
              options={emailLabelOptions}
              name="emailLabel-{email.id}"
              id="emailLabel-{email.id}"
              value={email.labelId ?? ""}
              emptyOption="None"
              placeholder="Label..."
              onSelect={async (value) => {
                try {
                  await api(`/api/emails/${email.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ labelId: value || null }),
                  });
                  await invalidateAll();
                } catch { toast("Failed to update label"); }
              }}
            />
          </div>
        </td>
        <td>
          {#if email.isPrimary}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(59,130,246,0.15)] text-blue-300">Primary</span>
          {/if}
        </td>
        <td>
          <form method="POST" action="?/deleteEmail">
            <input type="hidden" name="id" value={email.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-red-400 hover:bg-[rgba(239,68,68,0.12)] transition-colors duration-150" aria-label="Delete email">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
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
          <Button type="submit" size="sm">Add Email</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Phone Numbers Section -->
  <div class="mt-6">
    <RelatedListTable
      title="Phone Numbers"
      items={account.phoneNumbers}
      columns={[
        { key: "phone", label: "Phone" },
        { key: "label", label: "Label" },
        { key: "flags", label: "" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      emptyMessage="No phone numbers yet."
      addLabel="Phone"
    >
      {#snippet row(phone, _searchQuery)}
        <td>
          <a href="/phone-numbers/{phone.id}" class="text-sm font-medium text-accent hover:text-cyan-300">{phone.phoneNumber}</a>
        </td>
        <td>
          <div class="w-36">
            <SearchableSelect
              options={phoneLabelOptions}
              name="phoneLabel-{phone.id}"
              id="phoneLabel-{phone.id}"
              value={phone.labelId ?? ""}
              emptyOption="None"
              placeholder="Label..."
              onSelect={async (value) => {
                try {
                  await api(`/api/phone-numbers/${phone.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ labelId: value || null }),
                  });
                  await invalidateAll();
                } catch { toast("Failed to update label"); }
              }}
            />
          </div>
        </td>
        <td>
          <div class="flex items-center gap-1">
            {#if phone.hasWhatsapp}
              <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(34,197,94,0.15)] text-green-300">WhatsApp</span>
            {/if}
            {#if phone.isPrimary}
              <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(59,130,246,0.15)] text-blue-300">Primary</span>
            {/if}
          </div>
        </td>
        <td>
          <form method="POST" action="?/deletePhoneNumber">
            <input type="hidden" name="id" value={phone.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-red-400 hover:bg-[rgba(239,68,68,0.12)] transition-colors duration-150" aria-label="Delete phone number">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
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
          <Button type="submit" size="sm">Add Phone Number</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Social Media IDs Section -->
  <div class="mt-6">
    <RelatedListTable
      title="Social Media IDs"
      items={account.socialIds}
      columns={[
        { key: "handle", label: "Handle" },
        { key: "platform", label: "Platform" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      emptyMessage="No social media IDs yet."
      addLabel="Social ID"
    >
      {#snippet row(sid, _searchQuery)}
        <td>
          <a href="/social-ids/{sid.id}" class="text-sm font-medium text-accent hover:text-cyan-300">{sid.handle}</a>
        </td>
        <td>
          {#if sid.platformName}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-secondary">{sid.platformName}</span>
          {:else}
            <span class="text-text-muted">&mdash;</span>
          {/if}
        </td>
        <td>
          <form method="POST" action="?/deleteSocialId">
            <input type="hidden" name="id" value={sid.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-red-400 hover:bg-[rgba(239,68,68,0.12)] transition-colors duration-150" aria-label="Delete social ID">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addSocialId" class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="socialHandle" class="block text-sm font-medium text-text-secondary">Handle</label>
              <input
                id="socialHandle" name="handle" type="text" required
                class="glass-input mt-1 block w-full"
                placeholder="@username"
              />
            </div>
            <div>
              <label for="socialPlatform" class="block text-sm font-medium text-text-secondary">Platform</label>
              <SearchableSelect
                options={socialIdPlatformOptions}
                name="platformId"
                id="socialPlatform"
                emptyOption="None"
                placeholder="Select platform..."
              />
            </div>
          </div>
          <Button type="submit" size="sm">Add Social ID</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  </div><!-- /panel-overview -->

  <!-- People Tab -->
  <div id="panel-people" role="tabpanel" aria-labelledby="tab-people" class={activeTab !== "people" ? "hidden" : ""}>

  <!-- Linked Humans Section -->
  <div class="mt-6">
    <RelatedListTable
      title="Linked Humans"
      items={account.linkedHumans}
      columns={[
        { key: "name", label: "Name" },
        { key: "role", label: "Role" },
        { key: "emails", label: "Emails" },
        { key: "phones", label: "Phones" },
        { key: "unlink", label: "", headerClass: "w-10" },
      ]}
      emptyMessage="No humans linked yet."
      addLabel="Human"
    >
      {#snippet row(link, _searchQuery)}
        <td>
          <a href="/humans/{link.humanId}" class="text-sm font-medium text-accent hover:text-cyan-300">
            {link.humanName}
          </a>
        </td>
        <td>
          {#if link.labelName}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(249,115,22,0.15)] text-orange-300">
              {link.labelName}
            </span>
          {:else}
            <span class="text-text-muted">&mdash;</span>
          {/if}
        </td>
        <td class="text-xs text-text-muted">
          {#each link.emails as e, i}
            {#if i > 0}, {/if}{e.email}
          {:else}
            &mdash;
          {/each}
        </td>
        <td class="text-xs text-text-muted">
          {#each link.phoneNumbers as p, i}
            {#if i > 0}, {/if}{p.phoneNumber}
          {:else}
            &mdash;
          {/each}
        </td>
        <td>
          <form method="POST" action="?/unlinkHuman">
            <input type="hidden" name="id" value={link.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-red-400 hover:bg-[rgba(239,68,68,0.12)] transition-colors duration-150" aria-label="Unlink human">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <div class="flex gap-2 mb-3">
          <Button
            type="button"
            size="sm"
            variant={humanAddMode === 'link' ? 'default' : 'ghost'}
            onclick={() => { humanAddMode = 'link'; }}
          >
            Link Existing
          </Button>
          <Button
            type="button"
            size="sm"
            variant={humanAddMode === 'create' ? 'default' : 'ghost'}
            onclick={() => { humanAddMode = 'create'; }}
          >
            Create New
          </Button>
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
            <Button type="submit" size="sm">Link Human</Button>
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
            <Button type="submit" size="sm">Create & Link</Button>
          </form>
        {/if}
      {/snippet}
    </RelatedListTable>
  </div>

  </div><!-- /panel-people -->

  <!-- Activity Tab -->
  <div id="panel-activity" role="tabpanel" aria-labelledby="tab-activity" class={activeTab !== "activity" ? "hidden" : ""}>

  <!-- Account Activities (direct) -->
  <div class="mt-6">
    <RelatedListTable
      title="Account Activities"
      items={account.activities}
      columns={[
        { key: "type", label: "Type", sortable: true, sortValue: (a) => activityTypeLabels[a.type] ?? a.type },
        { key: "subject", label: "Subject", sortable: true, sortValue: (a) => a.subject },
        { key: "notes", label: "Notes", sortable: true, sortValue: (a) => a.notes ?? "" },
        { key: "date", label: "Date", sortable: true, sortValue: (a) => a.activityDate },
      ]}
      defaultSortKey="date"
      defaultSortDirection="desc"
      searchFilter={(a, q) => {
        const typeLabel = (activityTypeLabels[a.type] ?? a.type).toLowerCase();
        return a.subject.toLowerCase().includes(q) ||
          (a.notes ?? "").toLowerCase().includes(q) ||
          typeLabel.includes(q);
      }}
      emptyMessage="No account activities yet."
      searchEmptyMessage="No activities match your search."
      addLabel="Activity"
    >
      {#snippet row(activity, searchQuery)}
        <td>
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
            <HighlightText text={activityTypeLabels[activity.type] ?? activity.type} query={searchQuery} />
          </span>
        </td>
        <td class="text-sm font-medium max-w-sm truncate">
          <HighlightText text={activity.subject} query={searchQuery} />
        </td>
        <td class="text-text-muted max-w-xs truncate"><HighlightText text={truncateText(activity.notes ?? activity.body, 80)} query={searchQuery} /></td>
        <td class="text-text-muted whitespace-nowrap">{new Date(activity.activityDate).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
      {/snippet}
      {#snippet addForm()}
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
          <Button type="submit" size="sm">Add Activity</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Human Activities (from linked humans, read-only) -->
  <div class="mt-6">
    <RelatedListTable
      title="Human Activities"
      items={account.humanActivities}
      columns={[
        { key: "type", label: "Type", sortable: true, sortValue: (a) => activityTypeLabels[a.type] ?? a.type },
        { key: "subject", label: "Subject", sortable: true, sortValue: (a) => a.subject },
        { key: "via", label: "Via" },
        { key: "notes", label: "Notes", sortable: true, sortValue: (a) => a.notes ?? "" },
        { key: "date", label: "Date", sortable: true, sortValue: (a) => a.activityDate },
      ]}
      defaultSortKey="date"
      defaultSortDirection="desc"
      searchFilter={(a, q) => {
        const typeLabel = (activityTypeLabels[a.type] ?? a.type).toLowerCase();
        return a.subject.toLowerCase().includes(q) ||
          (a.notes ?? "").toLowerCase().includes(q) ||
          typeLabel.includes(q) ||
          a.viaHumanName.toLowerCase().includes(q);
      }}
      emptyMessage="No human activities."
      searchEmptyMessage="No activities match your search."
    >
      {#snippet row(activity, searchQuery)}
        <td>
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
            <HighlightText text={activityTypeLabels[activity.type] ?? activity.type} query={searchQuery} />
          </span>
        </td>
        <td class="text-sm font-medium max-w-sm truncate">
          <HighlightText text={activity.subject} query={searchQuery} />
        </td>
        <td class="text-xs text-text-muted">
          <HighlightText text={activity.viaHumanName} query={searchQuery} />
        </td>
        <td class="text-text-muted max-w-xs truncate"><HighlightText text={truncateText(activity.notes ?? activity.body, 80)} query={searchQuery} /></td>
        <td class="text-text-muted whitespace-nowrap">{new Date(activity.activityDate).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
      {/snippet}
    </RelatedListTable>
  </div>

  </div><!-- /panel-activity -->

  <!-- History Tab -->
  <div id="panel-history" role="tabpanel" aria-labelledby="tab-history" class={activeTab !== "history" ? "hidden" : ""}>

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

  </div><!-- /panel-history -->
</div>
