<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import ActivityConversationView from "$lib/components/ActivityConversationView.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import PhoneInput from "$lib/components/PhoneInput.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import { toast } from "svelte-sonner";
  import { Trash2 } from "lucide-svelte";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { api } from "$lib/api";
  import { onMount, onDestroy } from "svelte";
  import { statusColors as statusColorMap, agreementStatusColors } from "$lib/constants/colors";
  import { ACTIVITY_TYPE_OPTIONS, agreementStatusLabels } from "$lib/constants/labels";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import GlassDatePicker from "$lib/components/GlassDatePicker.svelte";
  import { formatRelativeTime, summarizeChanges } from "$lib/utils/format";
  import { Button } from "$lib/components/ui/button";
  import { resolve } from "$app/paths";

  let { data }: { data: PageData } = $props();
  const accountId = data.accountId;

  type ConfigItem = { id: string; name: string };
  type AccountType = { id: string; name: string };
  type AccountEmail = { id: string; email: string; labelId: string | null; labelName: string | null; isPrimary: boolean };
  type AccountPhone = { id: string; phoneNumber: string; labelId: string | null; labelName: string | null; hasWhatsapp: boolean; isPrimary: boolean };
  type SocialIdItem = { id: string; displayId: string; handle: string; platformId: string | null; platformName: string | null };
  type WebsiteItem = { id: string; displayId: string; url: string };
  type ReferralCodeItem = { id: string; displayId: string; code: string; description: string | null; isActive: boolean };
  type DiscountCodeItem = { id: string; crmDisplayId: string | null; code: string; description: string | null; percentOff: number; isActive: boolean };
  type HumanEmail = { id: string; email: string; label: string; isPrimary: boolean };
  type HumanPhone = { id: string; phoneNumber: string; label: string; hasWhatsapp: boolean; isPrimary: boolean };
  type LinkedHuman = {
    id: string;
    accountId: string;
    humanId: string;
    humanDisplayId: string | null;
    labelId: string | null;
    humanName: string;
    humanStatus: string | null;
    labelName: string | null;
    emails: HumanEmail[];
    phoneNumbers: HumanPhone[];
  };
  type Activity = {
    id: string;
    displayId: string;
    type: string;
    subject: string;
    notes: string | null;
    body: string | null;
    activityDate: string;
    frontConversationId: string | null;
    direction: string | null;
    ownerId: string | null;
    ownerName: string | null;
    ownerDisplayId: string | null;
    viaHumanName: string | null;
    createdAt: string;
  };
  type HumanListItem = { id: string; firstName: string; lastName: string };
  type Account = {
    id: string;
    displayId: string;
    name: string;
    status: string;
    types: AccountType[];
    emails: AccountEmail[];
    phoneNumbers: AccountPhone[];
    linkedHumans: LinkedHuman[];
    activities: Activity[];
    socialIds: SocialIdItem[];
    websites: WebsiteItem[];
    referralCodes: ReferralCodeItem[];
    discountCodes: DiscountCodeItem[];
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
  type AccountAgreement = { id: string; displayId: string; title: string; typeName: string | null; status: string; activationDate: string | null };
  type AllDiscountCodeOption = { id: string; code: string; crmDisplayId: string | null };

  // Client-side data state
  let account = $state<Account | null>(null);
  let typeConfigs = $state<ConfigItem[]>([]);
  let humanLabelConfigs = $state<ConfigItem[]>([]);
  let emailLabelConfigs = $state<ConfigItem[]>([]);
  let phoneLabelConfigs = $state<ConfigItem[]>([]);
  let allHumans = $state<HumanListItem[]>([]);
  let socialIdPlatformConfigs = $state<ConfigItem[]>([]);
  let allDiscountCodes = $state<AllDiscountCodeOption[]>([]);
  let accountAgreements = $state<AccountAgreement[]>([]);
  let agreementTypeConfigs = $state<ConfigItem[]>([]);
  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let loadErrorDetail = $state<string | null>(null);
  let formError = $state<string | null>(null);

  const humanOptions = $derived(allHumans.map((h) => ({ value: h.id, label: `${h.firstName} ${h.lastName}` })));
  const emailLabelOptions = $derived(emailLabelConfigs.map((l) => ({ value: l.id, label: l.name })));
  const phoneLabelOptions = $derived(phoneLabelConfigs.map((l) => ({ value: l.id, label: l.name })));
  const humanLabelOptions = $derived(humanLabelConfigs.map((l) => ({ value: l.id, label: l.name })));
  const socialIdPlatformOptions = $derived(socialIdPlatformConfigs.map((p) => ({ value: p.id, label: p.name })));
  const agreementTypeOptions = $derived(
    agreementTypeConfigs.map((t) => ({ value: t.id, label: t.name }))
  );

  // Auto-save state
  let accountName = $state("");
  let typeIds = $state<string[]>([]);
  let saveStatus = $state<SaveStatus>("idle");
  let lastAuditEntryId = $state<string | null>(null);
  let initialized = $state(false);

  // Change history
  let historyEntries = $state<AuditEntry[]>([]);
  let historyLoaded = $state(false);

  let humanAddMode = $state<'link' | 'create'>('link');

  // Initialize state from loaded account data
  $effect(() => {
    if (account) {
      accountName = account.name;
      typeIds = account.types.map((t) => t.id);
      if (!initialized) initialized = true;
    }
  });

  const autoSaver = createAutoSaver({
    endpoint: `/api/accounts/${accountId}`,
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

  // Client-side data loading (silent refresh when account already loaded)
  async function loadData() {
    const isFirstLoad = account == null;
    if (isFirstLoad) {
      loading = true;
    }
    loadError = null;
    loadErrorDetail = null;

    try {
      let accountResult: { data: Record<string, unknown> };
      try {
        accountResult = await api(`/api/accounts/${accountId}`) as { data: Record<string, unknown> };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        loadError = `Account fetch failed: ${msg}`;
        loadErrorDetail = `URL: /api/accounts/${accountId}\n${err instanceof Error && err.stack ? err.stack : ""}`;
        loading = false;
        return;
      }

      const raw = accountResult.data as Account;
      raw.types = raw.types ?? [];
      raw.emails = raw.emails ?? [];
      raw.phoneNumbers = raw.phoneNumbers ?? [];
      raw.linkedHumans = raw.linkedHumans ?? [];
      raw.activities = raw.activities ?? [];
      raw.socialIds = raw.socialIds ?? [];
      raw.websites = raw.websites ?? [];
      raw.referralCodes = raw.referralCodes ?? [];
      raw.discountCodes = raw.discountCodes ?? [];
      account = raw;

      const fetchErrors: string[] = [];

      const results = await Promise.allSettled([
        api(`/api/admin/account-config/batch?types=account-types,account-human-labels,account-email-labels,account-phone-labels,social-id-platforms,agreement-types`),
        api(`/api/humans`),
        api(`/api/discount-codes`),
        api(`/api/agreements?accountId=${accountId}&limit=50`),
      ]);

      if (results[0].status === "fulfilled") {
        const configs = (results[0].value as { data: Record<string, unknown[]> }).data;
        typeConfigs = (configs["account-types"] ?? []) as ConfigItem[];
        humanLabelConfigs = (configs["account-human-labels"] ?? []) as ConfigItem[];
        emailLabelConfigs = (configs["account-email-labels"] ?? []) as ConfigItem[];
        phoneLabelConfigs = (configs["account-phone-labels"] ?? []) as ConfigItem[];
        socialIdPlatformConfigs = (configs["social-id-platforms"] ?? []) as ConfigItem[];
        agreementTypeConfigs = (configs["agreement-types"] ?? []) as ConfigItem[];
      } else { fetchErrors.push(`configs: ${results[0].reason}`); }

      if (results[1].status === "fulfilled") {
        allHumans = (results[1].value as { data: HumanListItem[] }).data;
      } else { fetchErrors.push(`humans: ${results[1].reason}`); }

      if (results[2].status === "fulfilled") {
        allDiscountCodes = (results[2].value as { data: AllDiscountCodeOption[] }).data;
      } else { fetchErrors.push(`discount-codes: ${results[2].reason}`); }

      if (results[3].status === "fulfilled") {
        accountAgreements = (results[3].value as { data: AccountAgreement[] }).data;
      } else { fetchErrors.push(`agreements: ${results[3].reason}`); }

      if (fetchErrors.length > 0) {
        loadErrorDetail = `Partial load failures:\n${fetchErrors.join("\n")}`;
      }

      loading = false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      loadError = `Unexpected error: ${msg}`;
      loadErrorDetail = err instanceof Error && err.stack ? err.stack : null;
      loading = false;
    }
  }

  onMount(() => {
    void loadData();
  });

  // Form enhance handler — prevents default SSR invalidation, refreshes client-side instead
  const formEnhance: SubmitFunction = () => {
    formError = null;
    return async ({ result }) => {
      if (result.type === "success") {
        await loadData();
      } else if (result.type === "failure") {
        formError = (result.data as { error?: string } | null)?.error ?? "An error occurred";
      }
    };
  };

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
      await api(`/api/accounts/${accountId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      saveStatus = "saved";
      toast("Status updated");
      historyLoaded = false;
      await loadData();
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
      await loadData();
    } catch {
      toast("Undo failed");
    }
  }

  async function loadHistory() {
    if (historyLoaded || !account) return;
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

  $effect(() => {
    if (!historyLoaded && account) {
      void loadHistory();
    }
  });

  async function deleteActivity(id: string) {
    await api(`/api/activities/${id}`, { method: "DELETE" });
    toast("Activity deleted");
    await loadData();
  }

</script>

<svelte:head>
  <title>{account ? `${account.displayId} — ${account.name}` : "Account"} - Humans</title>
</svelte:head>

{#if loading}
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="glass-card p-6">
      <div class="animate-pulse space-y-4">
        <div class="h-8 bg-glass rounded w-1/3"></div>
        <div class="h-4 bg-glass rounded w-2/3"></div>
        <div class="h-4 bg-glass rounded w-1/2"></div>
        <div class="h-32 bg-glass rounded w-full mt-4"></div>
      </div>
    </div>
  </div>
{:else if loadError}
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="glass-card p-6 space-y-4 border border-red-500/30">
      <h2 class="text-lg font-semibold text-red-400">Failed to load account</h2>
      <p class="text-sm text-text-primary">{loadError}</p>
      {#if loadErrorDetail}
        <pre class="text-xs text-text-muted bg-glass p-3 rounded overflow-auto max-h-48 whitespace-pre-wrap">{loadErrorDetail}</pre>
      {/if}
      <p class="text-xs text-text-muted">Account ID: {accountId}</p>
      <Button size="sm" onclick={() => { void loadData(); }}>Retry</Button>
    </div>
  </div>
{:else if account}

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
        {#each account.types as t, tIdx (tIdx)}
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-purple">
            {t.name}
          </span>
        {/each}
      </div>
    {/snippet}
  </RecordManagementBar>

  <!-- Alerts -->
  {#if loadErrorDetail}
    <AlertBanner type="error" message={loadErrorDetail} />
  {/if}
  {#if formError}
    <AlertBanner type="error" message={formError} />
  {/if}

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
          {#each typeConfigs as t, tIdx (tIdx)}
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
        { key: "email", label: "Email", sortable: true, sortValue: (e) => e.email },
        { key: "label", label: "Label", sortable: true, sortValue: (e) => e.labelName ?? "" },
        { key: "flags", label: "" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="email"
      defaultSortDirection="asc"
      searchFilter={(e, q) =>
        e.email.toLowerCase().includes(q) ||
        (e.labelName ?? "").toLowerCase().includes(q)}
      emptyMessage="No emails yet."
      searchEmptyMessage="No emails match your search."
      addLabel="Email"
    >
      {#snippet row(email, _searchQuery)}
        <td>
          <a href={resolve(`/emails/${email.id}`)} class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{email.email}</a>
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
                  await loadData();
                } catch { toast("Failed to update label"); }
              }}
            />
          </div>
        </td>
        <td>
          {#if email.isPrimary}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-blue">Primary</span>
          {/if}
        </td>
        <td>
          <form method="POST" action="?/deleteEmail" use:enhance={formEnhance}>
            <input type="hidden" name="id" value={email.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete email">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addEmail" use:enhance={formEnhance} class="space-y-3">
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
        { key: "phone", label: "Phone", sortable: true, sortValue: (p) => p.phoneNumber },
        { key: "label", label: "Label", sortable: true, sortValue: (p) => p.labelName ?? "" },
        { key: "flags", label: "" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="phone"
      defaultSortDirection="asc"
      searchFilter={(p, q) =>
        p.phoneNumber.toLowerCase().includes(q) ||
        (p.labelName ?? "").toLowerCase().includes(q)}
      emptyMessage="No phone numbers yet."
      searchEmptyMessage="No phone numbers match your search."
      addLabel="Phone"
    >
      {#snippet row(phone, _searchQuery)}
        <td>
          <a href={resolve(`/phone-numbers/${phone.id}`)} class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{phone.phoneNumber}</a>
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
                  await loadData();
                } catch { toast("Failed to update label"); }
              }}
            />
          </div>
        </td>
        <td>
          <div class="flex items-center gap-1">
            {#if phone.hasWhatsapp}
              <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-green">WhatsApp</span>
            {/if}
            {#if phone.isPrimary}
              <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-blue">Primary</span>
            {/if}
          </div>
        </td>
        <td>
          <form method="POST" action="?/deletePhoneNumber" use:enhance={formEnhance}>
            <input type="hidden" name="id" value={phone.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete phone number">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addPhoneNumber" use:enhance={formEnhance} class="space-y-3">
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
        { key: "handle", label: "Handle", sortable: true, sortValue: (s) => s.handle },
        { key: "platform", label: "Platform", sortable: true, sortValue: (s) => s.platformName ?? "" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="handle"
      defaultSortDirection="asc"
      searchFilter={(s, q) =>
        s.handle.toLowerCase().includes(q) ||
        (s.platformName ?? "").toLowerCase().includes(q)}
      emptyMessage="No social media IDs yet."
      searchEmptyMessage="No social media IDs match your search."
      addLabel="Social ID"
    >
      {#snippet row(sid, _searchQuery)}
        <td>
          <a href={resolve(`/social-ids/${sid.id}`)} class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{sid.handle}</a>
        </td>
        <td>
          {#if sid.platformName}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-secondary">{sid.platformName}</span>
          {:else}
            <span class="text-text-muted">&mdash;</span>
          {/if}
        </td>
        <td>
          <form method="POST" action="?/deleteSocialId" use:enhance={formEnhance}>
            <input type="hidden" name="id" value={sid.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete social ID">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addSocialId" use:enhance={formEnhance} class="space-y-3">
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

  <!-- Websites Section -->
  <div class="mt-6">
    <RelatedListTable
      title="Websites"
      items={account.websites}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "url", label: "URL", sortable: true, sortValue: (w) => w.url },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="url"
      defaultSortDirection="asc"
      searchFilter={(w, q) => w.url.toLowerCase().includes(q) || w.displayId.toLowerCase().includes(q)}
      emptyMessage="No websites yet."
      addLabel="Website"
    >
      {#snippet row(w, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href={resolve(`/websites/${w.id}`)} class="text-accent hover:text-[var(--link-hover)]">{w.displayId}</a>
        </td>
        <td>
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
          <a href={w.url} target="_blank" rel="noopener noreferrer" class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{w.url}</a>
        </td>
        <td>
          <form method="POST" action="?/deleteWebsite" use:enhance={formEnhance}>
            <input type="hidden" name="id" value={w.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete website">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addWebsite" use:enhance={formEnhance} class="space-y-3">
          <div>
            <label for="websiteUrl" class="block text-sm font-medium text-text-secondary">URL</label>
            <input
              id="websiteUrl" name="url" type="url" required
              class="glass-input mt-1 block w-full"
              placeholder="https://example.com"
            />
          </div>
          <Button type="submit" size="sm">Add Website</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Referral Codes Section -->
  <div class="mt-6">
    <RelatedListTable
      title="Referral Codes"
      items={account.referralCodes}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "code", label: "Code", sortable: true, sortValue: (rc) => rc.code },
        { key: "description", label: "Description" },
        { key: "active", label: "Active" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="code"
      defaultSortDirection="asc"
      searchFilter={(rc, q) => rc.code.toLowerCase().includes(q) || (rc.description ?? "").toLowerCase().includes(q)}
      emptyMessage="No referral codes yet."
      addLabel="Referral Code"
    >
      {#snippet row(rc, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href={resolve(`/referral-codes/${rc.id}`)} class="text-accent hover:text-[var(--link-hover)]">{rc.displayId}</a>
        </td>
        <td>
          <a href={resolve(`/referral-codes/${rc.id}`)} class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{rc.code}</a>
        </td>
        <td class="text-sm text-text-secondary max-w-xs truncate">{rc.description ?? "\u2014"}</td>
        <td>
          {#if rc.isActive}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-green">Active</span>
          {:else}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-muted">Inactive</span>
          {/if}
        </td>
        <td>
          <form method="POST" action="?/deleteReferralCode" use:enhance={formEnhance}>
            <input type="hidden" name="id" value={rc.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete referral code">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addReferralCode" use:enhance={formEnhance} class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="referralCode" class="block text-sm font-medium text-text-secondary">Code</label>
              <input
                id="referralCode" name="code" type="text" required
                class="glass-input mt-1 block w-full"
                placeholder="REFERRAL123"
              />
            </div>
            <div>
              <label for="referralDescription" class="block text-sm font-medium text-text-secondary">Description</label>
              <input
                id="referralDescription" name="description" type="text"
                class="glass-input mt-1 block w-full"
                placeholder="Optional description"
              />
            </div>
          </div>
          <Button type="submit" size="sm">Add Referral Code</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Discount Codes Section -->
  <div class="mt-6">
    <RelatedListTable
      title="Discount Codes"
      items={account.discountCodes}
      columns={[
        { key: "id", label: "ID" },
        { key: "code", label: "Code", sortable: true, sortValue: (dc) => dc.code },
        { key: "percentOff", label: "% Off" },
        { key: "description", label: "Description" },
        { key: "active", label: "Active" },
        { key: "unlink", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="code"
      defaultSortDirection="asc"
      searchFilter={(dc, q) => dc.code.toLowerCase().includes(q) || (dc.description ?? "").toLowerCase().includes(q)}
      emptyMessage="No discount codes yet."
    >
      {#snippet row(dc, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href={resolve(`/discount-codes/${dc.id}`)} class="text-accent hover:text-[var(--link-hover)]">{dc.crmDisplayId ?? "\u2014"}</a>
        </td>
        <td>
          <a href={resolve(`/discount-codes/${dc.id}`)} class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{dc.code}</a>
        </td>
        <td class="text-sm">{dc.percentOff}%</td>
        <td class="text-sm text-text-secondary max-w-xs truncate">{dc.description ?? "\u2014"}</td>
        <td>
          {#if dc.isActive}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-green">Active</span>
          {:else}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-muted">Inactive</span>
          {/if}
        </td>
        <td>
          <form method="POST" action="?/unlinkDiscountCode" use:enhance={formEnhance}>
            <input type="hidden" name="id" value={dc.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Unlink discount code">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/linkDiscountCode" use:enhance={formEnhance} class="space-y-3">
          <div>
            <label for="discountCodeId" class="block text-sm font-medium text-text-secondary">Discount Code</label>
            <select id="discountCodeId" name="discountCodeId" required class="glass-input mt-1 block w-full">
              <option value="">Select a discount code...</option>
              {#each allDiscountCodes as dc, dcIdx (dcIdx)}
                <option value={dc.id}>{dc.code} ({dc.crmDisplayId ?? dc.id})</option>
              {/each}
            </select>
          </div>
          <Button type="submit" size="sm">Link Discount Code</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Linked Humans Section -->
  <div class="mt-6">
    <RelatedListTable
      title="Linked Humans"
      items={account.linkedHumans}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "name", label: "Name", sortable: true, sortValue: (l) => l.humanName },
        { key: "role", label: "Role", sortable: true, sortValue: (l) => l.labelName ?? "" },
        { key: "emails", label: "Emails" },
        { key: "phones", label: "Phones" },
        { key: "unlink", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="name"
      defaultSortDirection="asc"
      searchFilter={(l, q) =>
        l.humanName.toLowerCase().includes(q) ||
        (l.labelName ?? "").toLowerCase().includes(q) ||
        (l.humanDisplayId ?? "").toLowerCase().includes(q)}
      emptyMessage="No humans linked yet."
      searchEmptyMessage="No linked humans match your search."
      addLabel="Human"
    >
      {#snippet row(link, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href={resolve(`/humans/${link.humanId}`)} class="text-accent hover:text-[var(--link-hover)]">{link.humanDisplayId ?? "\u2014"}</a>
        </td>
        <td>
          <a href={resolve(`/humans/${link.humanId}`)} class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">
            {link.humanName}
          </a>
        </td>
        <td>
          {#if link.labelName}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-orange">
              {link.labelName}
            </span>
          {:else}
            <span class="text-text-muted">&mdash;</span>
          {/if}
        </td>
        <td class="text-xs text-text-muted">
          {#each link.emails as e, i (i)}
            {#if i > 0}, {/if}{e.email}
          {:else}
            &mdash;
          {/each}
        </td>
        <td class="text-xs text-text-muted">
          {#each link.phoneNumbers as p, i (i)}
            {#if i > 0}, {/if}{p.phoneNumber}
          {:else}
            &mdash;
          {/each}
        </td>
        <td>
          <form method="POST" action="?/unlinkHuman" use:enhance={formEnhance}>
            <input type="hidden" name="id" value={link.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Unlink human">
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
          <form method="POST" action="?/linkHuman" use:enhance={formEnhance} class="space-y-3">
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
          <form method="POST" action="?/createAndLinkHuman" use:enhance={formEnhance} class="space-y-3">
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

  <!-- Activities -->
  <div class="mt-6">
    <ActivityConversationView
      activities={account.activities}
      entityType="account"
      entityId={account.id}
      maxMessages={8}
      showViewAll={true}
      onDelete={deleteActivity}
    >
      {#snippet addForm()}
        <form method="POST" action="?/addActivity" use:enhance={formEnhance} class="space-y-3">
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
    </ActivityConversationView>
  </div>

  <!-- Agreements -->
  <div class="mt-6">
    <RelatedListTable
      title="Agreements"
      items={accountAgreements}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "title", label: "Title", sortable: true, sortValue: (a) => a.title },
        { key: "type", label: "Type" },
        { key: "status", label: "Status", sortable: true, sortValue: (a) => a.status },
        { key: "activationDate", label: "Activation Date", sortable: true, sortValue: (a) => a.activationDate ?? "" },
      ]}
      defaultSortKey="title"
      defaultSortDirection="asc"
      searchFilter={(a, q) => a.title.toLowerCase().includes(q) || a.displayId.toLowerCase().includes(q) || (a.typeName ?? "").toLowerCase().includes(q)}
      emptyMessage="No linked agreements."
      addLabel="Agreement"
    >
      {#snippet row(agr, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href={resolve(`/agreements/${agr.id}`)} class="text-accent hover:text-[var(--link-hover)]">{agr.displayId}</a>
        </td>
        <td class="font-medium">{agr.title}</td>
        <td class="text-sm text-text-secondary">{agr.typeName ?? "\u2014"}</td>
        <td>
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {agreementStatusColors[agr.status] ?? 'bg-glass text-text-secondary'}">
            {agreementStatusLabels[agr.status] ?? agr.status}
          </span>
        </td>
        <td class="text-sm text-text-muted">{agr.activationDate ?? "\u2014"}</td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addAgreement" enctype="multipart/form-data" use:enhance={formEnhance} class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="agrTitle" class="block text-sm font-medium text-text-secondary">Title <span class="text-red-400">*</span></label>
              <input id="agrTitle" name="title" type="text" required class="glass-input mt-1 block w-full" placeholder="Agreement title" />
            </div>
            <div>
              <label for="agrType" class="block text-sm font-medium text-text-secondary">Type</label>
              <SearchableSelect options={agreementTypeOptions} name="typeId" id="agrType" emptyOption="None" placeholder="Select type..." />
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="agrDate" class="block text-sm font-medium text-text-secondary">Activation Date</label>
              <GlassDatePicker name="activationDate" id="agrDate" />
            </div>
            <div>
              <label for="agrFile" class="block text-sm font-medium text-text-secondary">Document (PDF)</label>
              <input type="file" id="agrFile" name="file" accept=".pdf,application/pdf" class="text-sm text-text-secondary file:mr-2 file:rounded file:border-0 file:bg-glass file:px-3 file:py-1 file:text-sm file:text-text-primary mt-1" />
            </div>
          </div>
          <div>
            <label for="agrNotes" class="block text-sm font-medium text-text-secondary">Notes</label>
            <textarea id="agrNotes" name="notes" rows={2} class="glass-input mt-1 block w-full" placeholder="Optional notes..."></textarea>
          </div>
          <Button type="submit" size="sm">Create Agreement</Button>
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
      emptyMessage="No changes recorded yet."
      searchEmptyMessage="No history entries match your search."
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

{/if}

