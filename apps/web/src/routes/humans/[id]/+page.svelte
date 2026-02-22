<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import GeoInterestPicker from "$lib/components/GeoInterestPicker.svelte";
  import RouteInterestPicker from "$lib/components/RouteInterestPicker.svelte";
  import PhoneInput from "$lib/components/PhoneInput.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import { toast } from "svelte-sonner";
  import { Trash2 } from "lucide-svelte";
  import * as Select from "$lib/components/ui/select";
  import * as Dialog from "$lib/components/ui/dialog";
  import GlassDateTimePicker from "$lib/components/GlassDateTimePicker.svelte";
  import HighlightText from "$lib/components/HighlightText.svelte";
  import TypeTogglePills from "$lib/components/TypeTogglePills.svelte";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { api } from "$lib/api";
  import { statusColors as statusColorMap, humanTypeColors as typeColors, activityTypeColors, labelBadgeColor } from "$lib/constants/colors";
  import { humanTypeLabels as typeLabels, activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import { formatRelativeTime, summarizeChanges } from "$lib/utils/format";
  import { PET_BREEDS } from "@humans/shared/constants";
  import { onDestroy } from "svelte";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  function truncateText(s: string | null, len: number): string {
    if (!s) return "\u2014";
    return s.length > len ? s.slice(0, len) + "..." : s;
  }

  type HumanEmail = { id: string; displayId: string; email: string; labelId: string | null; labelName: string | null; isPrimary: boolean };
  type LinkedSignup = { id: string; routeSignupId: string; linkedAt: string; displayId: string | null; passengerName: string | null; origin: string | null; destination: string | null };
  type PhoneNumber = { id: string; displayId: string; phoneNumber: string; labelId: string | null; labelName: string | null; hasWhatsapp: boolean; isPrimary: boolean };
  type SocialIdItem = { id: string; displayId: string; handle: string; platformId: string | null; platformName: string | null };
  type ConfigItem = { id: string; name: string; createdAt: string };
  type Pet = { id: string; displayId: string; name: string; type: string; breed: string | null; weight: number | null };
  type GeoInterestExpression = {
    id: string;
    displayId: string;
    humanId: string;
    geoInterestId: string;
    activityId: string | null;
    notes: string | null;
    city: string | null;
    country: string | null;
    createdAt: string;
  };
  type RouteInterestExpression = {
    id: string;
    displayId: string;
    humanId: string;
    routeInterestId: string;
    activityId: string | null;
    frequency: string;
    travelYear: number | null;
    travelMonth: number | null;
    travelDay: number | null;
    notes: string | null;
    originCity: string | null;
    originCountry: string | null;
    destinationCity: string | null;
    destinationCountry: string | null;
    createdAt: string;
  };
  type Activity = {
    id: string;
    displayId: string;
    type: string;
    subject: string;
    notes: string | null;
    body: string | null;
    activityDate: string;
    gmailId: string | null;
    frontId: string | null;
    createdAt: string;
  };
  type LinkedAccount = {
    id: string;
    accountId: string;
    accountName: string;
    labelId: string | null;
    labelName: string | null;
  };
  type LinkedBookingRequest = { id: string; websiteBookingRequestId: string; linkedAt: string; displayId: string | null; passengerName: string | null; originCity: string | null; destinationCity: string | null };
  type RouteSignupOption = { id: string; display_id?: string | null; first_name?: string | null; last_name?: string | null; origin?: string | null; destination?: string | null };
  type BookingRequestOption = { id: string; crm_display_id?: string | null; first_name?: string | null; last_name?: string | null; origin_city?: string | null; destination_city?: string | null };
  type AccountOption = { id: string; name: string; displayId?: string };
  type Human = {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    status: string;
    emails: HumanEmail[];
    types: string[];
    linkedRouteSignups: LinkedSignup[];
    linkedWebsiteBookingRequests: LinkedBookingRequest[];
    phoneNumbers: PhoneNumber[];
    pets: Pet[];
    geoInterestExpressions: GeoInterestExpression[];
    routeInterestExpressions: RouteInterestExpression[];
    linkedAccounts: LinkedAccount[];
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

  const human = $derived(data.human as Human);
  let activities = $state<Activity[]>(data.activities as Activity[]);
  $effect(() => { activities = data.activities as Activity[]; });
  const apiUrl = $derived(data.apiUrl as string);
  const emailLabelConfigs = $derived(data.emailLabelConfigs as ConfigItem[]);
  const phoneLabelConfigs = $derived(data.phoneLabelConfigs as ConfigItem[]);
  const socialIdPlatformConfigs = $derived(data.socialIdPlatformConfigs as ConfigItem[]);

  const allRouteSignups = $derived(data.allRouteSignups as RouteSignupOption[]);
  const allBookingRequests = $derived(data.allBookingRequests as BookingRequestOption[]);
  const allAccounts = $derived(data.allAccounts as AccountOption[]);
  const accountHumanLabelConfigs = $derived(data.accountHumanLabelConfigs as ConfigItem[]);

  const emailLabelOptions = $derived(emailLabelConfigs.map((l) => ({ value: l.id, label: l.name })));
  const phoneLabelOptions = $derived(phoneLabelConfigs.map((l) => ({ value: l.id, label: l.name })));
  const socialIdPlatformOptions = $derived(socialIdPlatformConfigs.map((p) => ({ value: p.id, label: p.name })));
  const routeSignupOptions = $derived(allRouteSignups.map((s) => {
    const name = [s.first_name, s.last_name].filter(Boolean).join(" ");
    const route = [s.origin, s.destination].filter(Boolean).join(" → ");
    const label = [s.display_id, name, route].filter(Boolean).join(" — ");
    return { value: s.id, label: label || s.id };
  }));
  const bookingRequestOptions = $derived(allBookingRequests.map((b) => {
    const name = [b.first_name, b.last_name].filter(Boolean).join(" ");
    const route = [b.origin_city, b.destination_city].filter(Boolean).join(" → ");
    const label = [b.crm_display_id, name, route].filter(Boolean).join(" — ");
    return { value: b.id, label: label || b.id };
  }));
  const accountOptions = $derived(allAccounts.map((a) => ({ value: a.id, label: a.displayId ? `${a.displayId} — ${a.name}` : a.name })));
  const accountHumanLabelOptions = $derived(accountHumanLabelConfigs.map((l) => ({ value: l.id, label: l.name })));

  // Auto-save state
  let firstName = $state("");
  let middleName = $state("");
  let lastName = $state("");
  let types = $state<string[]>([]);
  let saveStatus = $state<SaveStatus>("idle");
  let lastAuditEntryId = $state<string | null>(null);
  let initialized = $state(false);

  // Change history
  let historyEntries = $state<AuditEntry[]>([]);
  let historyLoaded = $state(false);

  type GeoInterestItem = { id?: string; city?: string; country?: string; notes?: string };
  type RouteInterestItem = { id?: string; originCity?: string; originCountry?: string; destinationCity?: string; destinationCountry?: string; frequency?: string; travelYear?: number; travelMonth?: number; travelDay?: number; notes?: string };
  let geoInterests = $state<GeoInterestItem[]>([]);
  let geoInterestDialogOpen = $state(false);
  let routeInterests = $state<RouteInterestItem[]>([]);
  let routeInterestDialogOpen = $state(false);
  let breedDropdownOpen = $state(false);
  let newActivityType = $state("email");
  let newPetType = $state("dog");
  let accountAddMode = $state<'link' | 'create'>('link');

  // Initialize state from data — runs on each data update (e.g. after invalidateAll)
  $effect(() => {
    firstName = human.firstName;
    middleName = human.middleName ?? "";
    lastName = human.lastName;
    types = [...human.types];
    if (!initialized) initialized = true;
  });

  const autoSaver = createAutoSaver({
    endpoint: `/api/humans/${human.id}`,
    onStatusChange: (s) => { saveStatus = s; },
    onSaved: (result) => {
      if (result.auditEntryId) {
        lastAuditEntryId = result.auditEntryId;
        toast("Changes saved", {
          action: { label: "Undo", onClick: () => handleUndo() },
        });
        // Reset history so it reloads on next open
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
    autoSaver.save({
      firstName,
      middleName: middleName || null,
      lastName,
      types,
    });
  }

  function triggerSaveImmediate() {
    if (!initialized) return;
    autoSaver.saveImmediate({
      firstName,
      middleName: middleName || null,
      lastName,
      types,
    });
  }

  async function deleteActivity(id: string) {
    // Optimistic removal
    activities = activities.filter((a) => a.id !== id);
    try {
      await api(`/api/activities/${id}`, { method: "DELETE" });
      toast("Activity deleted");
    } catch {
      toast("Failed to delete activity");
      // Restore on failure
      await invalidateAll();
    }
  }

  async function handleStatusChange(newStatus: string) {
    saveStatus = "saving";
    try {
      await api(`/api/humans/${human.id}/status`, {
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
        params: { entityType: "human", entityId: human.id },
      }) as { data: AuditEntry[] };
      historyEntries = result.data;
      historyLoaded = true;
    } catch {
      historyEntries = [];
    }
  }

  // Auto-load history on mount and when historyLoaded is reset
  $effect(() => {
    if (!historyLoaded) {
      void loadHistory();
    }
  });

</script>

<svelte:head>
  <title>{human.displayId} — {human.firstName} {human.lastName} - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Record Management Bar -->
  <RecordManagementBar
    backHref="/humans"
    backLabel="Humans"
    title="{human.displayId} — {human.firstName} {human.middleName ?? ''} {human.lastName}"
    status={human.status}
    statusOptions={["open", "active", "closed"]}
    {statusColorMap}
    onStatusChange={handleStatusChange}
  >
    {#snippet actions()}
      <div class="flex gap-1">
        {#each human.types as t}
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {typeColors[t] ?? 'bg-glass text-text-secondary'}">
            {typeLabels[t] ?? t}
          </span>
        {/each}
      </div>
    {/snippet}
  </RecordManagementBar>

  <!-- Alerts -->
  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <!-- Details (auto-save, no form submission) -->
  <div class="glass-card p-6 space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-text-primary">Details</h2>
      <SaveIndicator status={saveStatus} />
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <div>
        <label for="firstName" class="block text-sm font-medium text-text-secondary">First Name</label>
        <input
          id="firstName" type="text" required
          bind:value={firstName}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>
      <div>
        <label for="middleName" class="block text-sm font-medium text-text-secondary">Middle Name</label>
        <input
          id="middleName" type="text"
          bind:value={middleName}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>
      <div>
        <label for="lastName" class="block text-sm font-medium text-text-secondary">Last Name</label>
        <input
          id="lastName" type="text" required
          bind:value={lastName}
          oninput={triggerSave}
          class="glass-input mt-1 block w-full"
        />
      </div>
    </div>

    <!-- Types -->
    <div>
      <label class="block text-sm font-medium text-text-secondary">Types</label>
      <div class="mt-2">
        <TypeTogglePills selected={types} onchange={(newTypes) => { types = newTypes; triggerSaveImmediate(); }} />
      </div>
    </div>
  </div>

  <!-- Emails Section -->
  <div class="mt-6">
    <RelatedListTable
      title="Emails"
      items={human.emails}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "email", label: "Email", sortable: true, sortValue: (e) => e.email },
        { key: "label", label: "Label", sortable: true, sortValue: (e) => e.labelName ?? "" },
        { key: "flags", label: "" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="email"
      defaultSortDirection="asc"
      searchFilter={(e, q) => e.email.toLowerCase().includes(q) || (e.labelName ?? "").toLowerCase().includes(q)}
      emptyMessage="No emails yet."
      addLabel="Email"
    >
      {#snippet row(email, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href="/emails/{email.id}" class="text-accent hover:text-[var(--link-hover)]">{email.displayId}</a>
        </td>
        <td>
          <a href="/emails/{email.id}" class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{email.email}</a>
        </td>
        <td>
          <div class="w-44">
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
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-blue">Primary</span>
          {/if}
        </td>
        <td>
          <form method="POST" action="?/deleteEmail">
            <input type="hidden" name="id" value={email.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete email">
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
          <Button type="submit" size="sm">
            Add Email
          </Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Phone Numbers Section -->
  <div class="mt-6">
    <RelatedListTable
      title="Phone Numbers"
      items={human.phoneNumbers}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "phone", label: "Phone", sortable: true, sortValue: (p) => p.phoneNumber },
        { key: "label", label: "Label", sortable: true, sortValue: (p) => p.labelName ?? "" },
        { key: "flags", label: "" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="phone"
      defaultSortDirection="asc"
      searchFilter={(p, q) => p.phoneNumber.toLowerCase().includes(q) || (p.labelName ?? "").toLowerCase().includes(q)}
      emptyMessage="No phone numbers yet."
      addLabel="Phone"
    >
      {#snippet row(phone, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href="/phone-numbers/{phone.id}" class="text-accent hover:text-[var(--link-hover)]">{phone.displayId}</a>
        </td>
        <td>
          <a href="/phone-numbers/{phone.id}" class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{phone.phoneNumber}</a>
        </td>
        <td>
          <div class="w-44">
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
              <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-green">WhatsApp</span>
            {/if}
            {#if phone.isPrimary}
              <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-blue">Primary</span>
            {/if}
          </div>
        </td>
        <td>
          <form method="POST" action="?/deletePhoneNumber">
            <input type="hidden" name="phoneId" value={phone.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete phone number">
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
          <Button type="submit" size="sm">
            Add Phone Number
          </Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Social Media IDs Section -->
  <div class="mt-6">
    <RelatedListTable
      title="Social Media IDs"
      items={human.socialIds}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "handle", label: "Handle", sortable: true, sortValue: (s) => s.handle },
        { key: "platform", label: "Platform", sortable: true, sortValue: (s) => s.platformName ?? "" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="handle"
      defaultSortDirection="asc"
      searchFilter={(s, q) => s.handle.toLowerCase().includes(q) || (s.platformName ?? "").toLowerCase().includes(q)}
      emptyMessage="No social media IDs yet."
      addLabel="Social ID"
    >
      {#snippet row(sid, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href="/social-ids/{sid.id}" class="text-accent hover:text-[var(--link-hover)]">{sid.displayId}</a>
        </td>
        <td>
          <a href="/social-ids/{sid.id}" class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{sid.handle}</a>
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
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete social ID">
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
          <Button type="submit" size="sm">
            Add Social ID
          </Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Pets Section -->
  <div class="mt-6 {breedDropdownOpen ? 'relative z-10' : ''}">
    <RelatedListTable
      title="Pets"
      items={human.pets}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "name", label: "Name", sortable: true, sortValue: (p) => p.name },
        { key: "type", label: "Type", sortable: true, sortValue: (p) => p.type },
        { key: "breed", label: "Breed" },
        { key: "weight", label: "Weight" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="name"
      defaultSortDirection="asc"
      searchFilter={(p, q) => p.name.toLowerCase().includes(q) || (p.breed ?? "").toLowerCase().includes(q) || p.type.toLowerCase().includes(q)}
      emptyMessage="No pets yet."
      addLabel="Pet"
    >
      {#snippet row(pet, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href="/pets/{pet.id}" class="text-accent hover:text-[var(--link-hover)]">{pet.displayId}</a>
        </td>
        <td>
          <a href="/pets/{pet.id}" class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">{pet.name}</a>
        </td>
        <td>
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {pet.type === 'cat' ? 'badge-purple' : 'badge-blue'}">
            {pet.type === "cat" ? "Cat" : "Dog"}
          </span>
        </td>
        <td class="text-sm text-text-secondary">{pet.type === "dog" && pet.breed ? pet.breed : "\u2014"}</td>
        <td class="text-sm text-text-muted">{pet.weight ? `${pet.weight} kg` : "\u2014"}</td>
        <td>
          <form method="POST" action="?/deletePet">
            <input type="hidden" name="id" value={pet.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete pet">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addPet" class="space-y-3">
          <input type="hidden" name="type" value={newPetType} />
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">Type</label>
            <div class="flex gap-2">
              <button
                type="button"
                onclick={() => { newPetType = "dog"; }}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {newPetType === 'dog' ? 'badge-blue ring-1 ring-[var(--badge-blue-text)]/30' : 'bg-glass text-text-secondary hover:bg-glass-hover'}"
              >
                Dog
              </button>
              <button
                type="button"
                onclick={() => { newPetType = "cat"; }}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {newPetType === 'cat' ? 'badge-purple ring-1 ring-[var(--badge-purple-text)]/30' : 'bg-glass text-text-secondary hover:bg-glass-hover'}"
              >
                Cat
              </button>
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <div>
              <label for="petName" class="block text-sm font-medium text-text-secondary">Name</label>
              <input
                id="petName" name="name" type="text" required
                class="glass-input mt-1 block w-full"
              />
            </div>
            {#if newPetType === "dog"}
              <div>
                <label for="petBreed" class="block text-sm font-medium text-text-secondary">Breed</label>
                <SearchableSelect
                  options={PET_BREEDS}
                  name="breed"
                  id="petBreed"
                  placeholder="Search breeds..."
                  onOpenChange={(isOpen) => { breedDropdownOpen = isOpen; }}
                />
              </div>
            {/if}
            <div>
              <label for="petWeight" class="block text-sm font-medium text-text-secondary">Weight (kg)</label>
              <input
                id="petWeight" name="weight" type="number" step="0.1" min="0"
                class="glass-input mt-1 block w-full"
              />
            </div>
          </div>
          <Button type="submit" size="sm">
            Add Pet
          </Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Geo-Interest Expressions Section -->
  <div class="mt-6">
    <RelatedListTable
      title="Geo-Interest Expressions"
      items={human.geoInterestExpressions}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "location", label: "Location", sortable: true, sortValue: (e) => `${e.city ?? ""}, ${e.country ?? ""}` },
        { key: "notes", label: "Notes" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="location"
      defaultSortDirection="asc"
      searchFilter={(e, q) => (e.city ?? "").toLowerCase().includes(q) || (e.country ?? "").toLowerCase().includes(q) || (e.notes ?? "").toLowerCase().includes(q)}
      emptyMessage="No geo-interest expressions yet."
      addLabel="Geo Interest Expression"
    >
      {#snippet row(expr, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href="/geo-interests/expressions/{expr.id}" class="text-accent hover:text-[var(--link-hover)]">{expr.displayId}</a>
        </td>
        <td>
          <a href="/geo-interests/{expr.geoInterestId}" class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">
            {expr.city ?? "\u2014"}, {expr.country ?? "\u2014"}
          </a>
        </td>
        <td class="text-sm text-text-secondary max-w-xs truncate">{expr.notes ?? "\u2014"}</td>
        <td>
          <form method="POST" action="?/deleteGeoInterestExpression">
            <input type="hidden" name="id" value={expr.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete geo-interest expression">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addGeoInterestExpression" class="space-y-3">
          <GeoInterestPicker {apiUrl} />
          <Button type="submit" size="sm">
            Add Geo Interest Expression
          </Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Route Interest Expressions Section -->
  <div class="mt-6">
    <RelatedListTable
      title="Route Interest Expressions"
      items={human.routeInterestExpressions}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "route", label: "Route", sortable: true, sortValue: (e) => `${e.originCity ?? ""}, ${e.originCountry ?? ""} → ${e.destinationCity ?? ""}, ${e.destinationCountry ?? ""}` },
        { key: "frequency", label: "Frequency", sortable: true, sortValue: (e) => e.frequency },
        { key: "travelDate", label: "Travel Date" },
        { key: "notes", label: "Notes" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="route"
      defaultSortDirection="asc"
      searchFilter={(e, q) => (e.originCity ?? "").toLowerCase().includes(q) || (e.originCountry ?? "").toLowerCase().includes(q) || (e.destinationCity ?? "").toLowerCase().includes(q) || (e.destinationCountry ?? "").toLowerCase().includes(q) || (e.notes ?? "").toLowerCase().includes(q)}
      emptyMessage="No route interest expressions yet."
      addLabel="Route Interest"
    >
      {#snippet row(expr, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href="/route-interests/expressions/{expr.id}" class="text-accent hover:text-[var(--link-hover)]">{expr.displayId}</a>
        </td>
        <td>
          <a href="/route-interests/{expr.routeInterestId}" class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">
            {expr.originCity ?? "\u2014"}, {expr.originCountry ?? "\u2014"} &rarr; {expr.destinationCity ?? "\u2014"}, {expr.destinationCountry ?? "\u2014"}
          </a>
        </td>
        <td>
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {expr.frequency === 'repeat' ? 'badge-purple' : 'bg-glass text-text-secondary'}">
            {expr.frequency === "repeat" ? "Repeat" : "One-time"}
          </span>
        </td>
        <td class="text-sm text-text-muted whitespace-nowrap">
          {#if expr.travelYear}
            {expr.travelYear}{#if expr.travelMonth}-{String(expr.travelMonth).padStart(2, "0")}{#if expr.travelDay}-{String(expr.travelDay).padStart(2, "0")}{/if}{/if}
          {:else}
            &mdash;
          {/if}
        </td>
        <td class="text-sm text-text-secondary max-w-[200px] truncate">{expr.notes ?? "\u2014"}</td>
        <td>
          <form method="POST" action="?/deleteRouteInterestExpression">
            <input type="hidden" name="id" value={expr.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete route interest expression">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addRouteInterestExpression" class="space-y-3">
          <RouteInterestPicker {apiUrl} />
          <Button type="submit" size="sm">
            Add Route Interest Expression
          </Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Linked Accounts -->
  <div class="mt-6">
    <RelatedListTable
      title="Linked Accounts"
      items={human.linkedAccounts}
      columns={[
        { key: "account", label: "Account", sortable: true, sortValue: (a) => a.accountName },
        { key: "role", label: "Role", sortable: true, sortValue: (a) => a.labelName ?? "" },
        { key: "unlink", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="account"
      defaultSortDirection="asc"
      searchFilter={(a, q) => (a.accountName ?? "").toLowerCase().includes(q) || (a.labelName ?? "").toLowerCase().includes(q)}
      emptyMessage="No linked accounts."
      addLabel="Account"
    >
      {#snippet row(link, _searchQuery)}
        <td>
          <a href="/accounts/{link.accountId}" class="text-sm font-medium text-accent hover:text-[var(--link-hover)]">
            {link.accountName}
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
        <td>
          <form method="POST" action="?/unlinkAccount">
            <input type="hidden" name="accountId" value={link.accountId} />
            <input type="hidden" name="linkId" value={link.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Unlink account">
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
            variant={accountAddMode === 'link' ? 'default' : 'ghost'}
            onclick={() => { accountAddMode = 'link'; }}
          >
            Link Existing
          </Button>
          <Button
            type="button"
            size="sm"
            variant={accountAddMode === 'create' ? 'default' : 'ghost'}
            onclick={() => { accountAddMode = 'create'; }}
          >
            Create New
          </Button>
        </div>

        {#if accountAddMode === 'link'}
          <form method="POST" action="?/linkAccount" class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label for="accountSelect" class="block text-sm font-medium text-text-secondary">Account</label>
                <SearchableSelect
                  options={accountOptions}
                  name="accountId"
                  id="accountSelect"
                  required={true}
                  emptyOption="Select an account..."
                  placeholder="Search accounts..."
                />
              </div>
              <div>
                <label for="accountLabel" class="block text-sm font-medium text-text-secondary">Role Label</label>
                <SearchableSelect
                  options={accountHumanLabelOptions}
                  name="labelId"
                  id="accountLabel"
                  emptyOption="None"
                  placeholder="Select role..."
                />
              </div>
            </div>
            <Button type="submit" size="sm">Link Account</Button>
          </form>
        {:else}
          <form method="POST" action="?/createAndLinkAccount" class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label for="newAccountName" class="block text-sm font-medium text-text-secondary">Account Name</label>
                <input
                  id="newAccountName" name="accountName" type="text" required
                  class="glass-input mt-1 block w-full"
                  placeholder="Account name"
                />
              </div>
              <div>
                <label for="newAccountLabel" class="block text-sm font-medium text-text-secondary">Role Label</label>
                <SearchableSelect
                  options={accountHumanLabelOptions}
                  name="labelId"
                  id="newAccountLabel"
                  emptyOption="None"
                  placeholder="Select role..."
                />
              </div>
            </div>
            <Button type="submit" size="sm">Create & Link</Button>
          </form>
        {/if}
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Linked Route Signups -->
  <div class="mt-6">
    <RelatedListTable
      title="Linked Route Signups"
      items={human.linkedRouteSignups}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "passenger", label: "Passenger" },
        { key: "route", label: "Route" },
        { key: "linkedAt", label: "Linked Date", sortable: true, sortValue: (l) => l.linkedAt },
        { key: "unlink", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="linkedAt"
      defaultSortDirection="desc"
      searchFilter={(l, q) => (l.displayId ?? "").toLowerCase().includes(q) || (l.passengerName ?? "").toLowerCase().includes(q) || (l.origin ?? "").toLowerCase().includes(q) || (l.destination ?? "").toLowerCase().includes(q)}
      emptyMessage="No linked route signups."
      addLabel="Route Signup"
    >
      {#snippet row(link, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href="/leads/route-signups/{link.routeSignupId}" class="text-accent hover:text-[var(--link-hover)]">{link.displayId ?? "\u2014"}</a>
        </td>
        <td class="text-sm text-text-secondary">{link.passengerName ?? "\u2014"}</td>
        <td class="text-sm text-text-secondary">
          {#if link.origin || link.destination}
            {link.origin ?? "\u2014"} &rarr; {link.destination ?? "\u2014"}
          {:else}
            &mdash;
          {/if}
        </td>
        <td class="text-sm text-text-muted">{new Date(link.linkedAt).toLocaleDateString()}</td>
        <td>
          <form method="POST" action="?/unlinkSignup">
            <input type="hidden" name="linkId" value={link.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Unlink signup">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/linkRouteSignup" class="space-y-3">
          <div>
            <label for="routeSignupSelect" class="block text-sm font-medium text-text-secondary">Route Signup</label>
            <SearchableSelect
              options={routeSignupOptions}
              name="routeSignupId"
              id="routeSignupSelect"
              required={true}
              emptyOption="Select a route signup..."
              placeholder="Search route signups..."
            />
          </div>
          <Button type="submit" size="sm">Link Route Signup</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Linked Booking Requests -->
  <div class="mt-6">
    <RelatedListTable
      title="Linked Booking Requests"
      items={human.linkedWebsiteBookingRequests}
      columns={[
        { key: "displayId", label: "ID" },
        { key: "passenger", label: "Passenger" },
        { key: "route", label: "Route" },
        { key: "linkedAt", label: "Linked Date", sortable: true, sortValue: (l) => l.linkedAt },
        { key: "unlink", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="linkedAt"
      defaultSortDirection="desc"
      searchFilter={(l, q) => (l.displayId ?? "").toLowerCase().includes(q) || (l.passengerName ?? "").toLowerCase().includes(q) || (l.originCity ?? "").toLowerCase().includes(q) || (l.destinationCity ?? "").toLowerCase().includes(q)}
      emptyMessage="No linked booking requests."
      addLabel="Booking Request"
    >
      {#snippet row(link, _searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href="/leads/website-booking-requests/{link.websiteBookingRequestId}" class="text-accent hover:text-[var(--link-hover)]">{link.displayId ?? "\u2014"}</a>
        </td>
        <td class="text-sm text-text-secondary">{link.passengerName ?? "\u2014"}</td>
        <td class="text-sm text-text-secondary">
          {#if link.originCity || link.destinationCity}
            {link.originCity ?? "\u2014"} &rarr; {link.destinationCity ?? "\u2014"}
          {:else}
            &mdash;
          {/if}
        </td>
        <td class="text-sm text-text-muted">{new Date(link.linkedAt).toLocaleDateString()}</td>
        <td>
          <form method="POST" action="?/unlinkBookingRequest">
            <input type="hidden" name="linkId" value={link.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Unlink booking request">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/linkBookingRequest" class="space-y-3">
          <div>
            <label for="bookingRequestSelect" class="block text-sm font-medium text-text-secondary">Booking Request</label>
            <SearchableSelect
              options={bookingRequestOptions}
              name="websiteBookingRequestId"
              id="bookingRequestSelect"
              required={true}
              emptyOption="Select a booking request..."
              placeholder="Search booking requests..."
            />
          </div>
          <Button type="submit" size="sm">Link Booking Request</Button>
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
        { key: "displayId", label: "ID", sortable: true, sortValue: (a) => a.displayId },
        { key: "type", label: "Type", sortable: true, sortValue: (a) => activityTypeLabels[a.type] ?? a.type },
        { key: "subject", label: "Subject", sortable: true, sortValue: (a) => a.subject },
        { key: "notes", label: "Notes", sortable: true, sortValue: (a) => a.notes ?? "" },
        { key: "activityDate", label: "Date", sortable: true, sortValue: (a) => a.activityDate },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="activityDate"
      defaultSortDirection="desc"
      searchFilter={(a, q) => {
        const typeLabel = (activityTypeLabels[a.type] ?? a.type).toLowerCase();
        return a.subject.toLowerCase().includes(q) ||
          (a.notes ?? "").toLowerCase().includes(q) ||
          typeLabel.includes(q);
      }}
      emptyMessage="No activities yet."
      searchEmptyMessage="No activities match your search."
      addLabel="Activity"
      onFormToggle={(open) => { if (!open) { geoInterests = []; routeInterests = []; } }}
    >
      {#snippet row(activity, searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href="/activities/{activity.id}" class="text-accent hover:text-[var(--link-hover)]">{activity.displayId}</a>
        </td>
        <td>
          <span class="glass-badge {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
            <HighlightText text={activityTypeLabels[activity.type] ?? activity.type} query={searchQuery} />
          </span>
        </td>
        <td class="font-medium max-w-sm truncate">
          <a href="/activities/{activity.id}" class="hover:text-accent transition-colors duration-150"><HighlightText text={activity.subject} query={searchQuery} /></a>
        </td>
        <td class="text-text-muted max-w-xs truncate"><HighlightText text={truncateText(activity.notes ?? activity.body, 80)} query={searchQuery} /></td>
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
          {#if geoInterests.length > 0}
            <input type="hidden" name="geoInterestsJson" value={JSON.stringify(geoInterests)} />
          {/if}
          {#if routeInterests.length > 0}
            <input type="hidden" name="routeInterestsJson" value={JSON.stringify(routeInterests)} />
          {/if}
          <!-- Linked interests chips -->
          {#if geoInterests.length > 0 || routeInterests.length > 0}
            <div class="flex flex-wrap gap-2">
              {#each geoInterests as geo, i}
                <span class="inline-flex items-center gap-1 rounded-full bg-[rgba(6,182,212,0.15)] text-accent px-2 py-0.5 text-xs">
                  {geo.city ?? "New"}{geo.country ? `, ${geo.country}` : ""}
                  <button type="button" class="ml-0.5 hover:text-[var(--link-hover)]" onclick={() => { geoInterests = geoInterests.filter((_, idx) => idx !== i); }}>&times;</button>
                </span>
              {/each}
              {#each routeInterests as route, i}
                <span class="inline-flex items-center gap-1 rounded-full badge-purple px-2 py-0.5 text-xs">
                  {route.originCity ?? "?"} &rarr; {route.destinationCity ?? "?"}
                  <button type="button" class="ml-0.5 hover:opacity-80" onclick={() => { routeInterests = routeInterests.filter((_, idx) => idx !== i); }}>&times;</button>
                </span>
              {/each}
            </div>
          {/if}
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Button
                type="button"
                variant="link"
                size="sm"
                onclick={() => { geoInterestDialogOpen = true; }}
              >
                + Link Geo-Interest
              </Button>
              <Button
                type="button"
                variant="link"
                size="sm"
                onclick={() => { routeInterestDialogOpen = true; }}
              >
                + Link Route-Interest
              </Button>
            </div>
            <Button type="submit" size="sm">
              Add Activity
            </Button>
          </div>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <Dialog.Root bind:open={geoInterestDialogOpen}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Link Geo-Interest</Dialog.Title>
        <Dialog.Description>Search for an existing geo-interest or create a new one.</Dialog.Description>
      </Dialog.Header>
      <div class="mt-4" id="geo-interest-dialog-body">
        <GeoInterestPicker
          {apiUrl}
          geoInterestIdName="dialogGeoId"
          cityName="dialogGeoCity"
          countryName="dialogGeoCountry"
          notesName="dialogGeoNotes"
        />
      </div>
      <Dialog.Footer>
        <Button
          type="button"
          size="sm"
          onclick={() => {
            const container = document.getElementById("geo-interest-dialog-body");
            if (container) {
              const geoIdInput = container.querySelector<HTMLInputElement>('input[name="dialogGeoId"]');
              const cityInput = container.querySelector<HTMLInputElement>('input[name="dialogGeoCity"]');
              const countryInput = container.querySelector<HTMLInputElement>('input[name="dialogGeoCountry"]');
              const notesInput = container.querySelector<HTMLTextAreaElement>('textarea[name="dialogGeoNotes"]');
              const item: GeoInterestItem = {
                id: geoIdInput?.value || undefined,
                city: cityInput?.value || undefined,
                country: countryInput?.value || undefined,
                notes: notesInput?.value || undefined,
              };
              if (item.id || (item.city && item.country)) {
                geoInterests = [...geoInterests, item];
              }
            }
            geoInterestDialogOpen = false;
          }}
        >
          Add
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <Dialog.Root bind:open={routeInterestDialogOpen}>
    <Dialog.Content class="max-w-2xl">
      <Dialog.Header>
        <Dialog.Title>Link Route-Interest</Dialog.Title>
        <Dialog.Description>Define origin, destination, and travel details.</Dialog.Description>
      </Dialog.Header>
      <div class="mt-4" id="route-interest-dialog-body">
        <RouteInterestPicker
          {apiUrl}
          routeInterestIdName="dialogRouteId"
          originCityName="dialogRouteOriginCity"
          originCountryName="dialogRouteOriginCountry"
          destinationCityName="dialogRouteDestCity"
          destinationCountryName="dialogRouteDestCountry"
          frequencyName="dialogRouteFrequency"
          travelYearName="dialogRouteTravelYear"
          travelMonthName="dialogRouteTravelMonth"
          travelDayName="dialogRouteTravelDay"
          notesName="dialogRouteNotes"
        />
      </div>
      <Dialog.Footer>
        <Button
          type="button"
          size="sm"
          onclick={() => {
            const container = document.getElementById("route-interest-dialog-body");
            if (container) {
              const routeIdInput = container.querySelector<HTMLInputElement>('input[name="dialogRouteId"]');
              const originCityInput = container.querySelector<HTMLInputElement>('input[name="dialogRouteOriginCity"]');
              const originCountryInput = container.querySelector<HTMLInputElement>('input[name="dialogRouteOriginCountry"]');
              const destCityInput = container.querySelector<HTMLInputElement>('input[name="dialogRouteDestCity"]');
              const destCountryInput = container.querySelector<HTMLInputElement>('input[name="dialogRouteDestCountry"]');
              const frequencyInput = container.querySelector<HTMLInputElement>('input[name="dialogRouteFrequency"]');
              const travelYearInput = container.querySelector<HTMLInputElement>('input[name="dialogRouteTravelYear"]');
              const travelMonthInput = container.querySelector<HTMLInputElement>('input[name="dialogRouteTravelMonth"]');
              const travelDayInput = container.querySelector<HTMLInputElement>('input[name="dialogRouteTravelDay"]');
              const notesInput = container.querySelector<HTMLTextAreaElement>('textarea[name="dialogRouteNotes"]');
              const item: RouteInterestItem = {
                id: routeIdInput?.value || undefined,
                originCity: originCityInput?.value || undefined,
                originCountry: originCountryInput?.value || undefined,
                destinationCity: destCityInput?.value || undefined,
                destinationCountry: destCountryInput?.value || undefined,
                frequency: frequencyInput?.value || undefined,
                travelYear: travelYearInput?.value ? parseInt(travelYearInput.value, 10) : undefined,
                travelMonth: travelMonthInput?.value ? parseInt(travelMonthInput.value, 10) : undefined,
                travelDay: travelDayInput?.value ? parseInt(travelDayInput.value, 10) : undefined,
                notes: notesInput?.value || undefined,
              };
              if (item.id || (item.originCity && item.originCountry && item.destinationCity && item.destinationCountry)) {
                routeInterests = [...routeInterests, item];
              }
            }
            routeInterestDialogOpen = false;
          }}
        >
          Add
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

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
