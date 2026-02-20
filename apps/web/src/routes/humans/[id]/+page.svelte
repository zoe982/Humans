<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import LinkedRecordBox from "$lib/components/LinkedRecordBox.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import GeoInterestPicker from "$lib/components/GeoInterestPicker.svelte";
  import RouteInterestPicker from "$lib/components/RouteInterestPicker.svelte";
  import PhoneInput from "$lib/components/PhoneInput.svelte";
  import SaveIndicator from "$lib/components/SaveIndicator.svelte";
  import { toast } from "svelte-sonner";
  import TypeTogglePills from "$lib/components/TypeTogglePills.svelte";
  import { createAutoSaver, type SaveStatus } from "$lib/autosave";
  import { api } from "$lib/api";
  import { statusColors as statusColorMap, humanTypeColors as typeColors, activityTypeColors, labelBadgeColor } from "$lib/constants/colors";
  import { humanTypeLabels as typeLabels, activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import { formatRelativeTime, summarizeChanges } from "$lib/utils/format";
  import { PET_BREEDS } from "@humans/shared/constants";
  import { onDestroy } from "svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  function truncateText(s: string | null, len: number): string {
    if (!s) return "—";
    return s.length > len ? s.slice(0, len) + "..." : s;
  }

  type HumanEmail = { id: string; email: string; labelId: string | null; labelName: string | null; isPrimary: boolean };
  type LinkedSignup = { id: string; routeSignupId: string; linkedAt: string };
  type PhoneNumber = { id: string; phoneNumber: string; labelId: string | null; labelName: string | null; hasWhatsapp: boolean; isPrimary: boolean };
  type SocialIdItem = { id: string; displayId: string; handle: string; platformId: string | null; platformName: string | null };
  type ConfigItem = { id: string; name: string; createdAt: string };
  type Pet = { id: string; name: string; type: string; breed: string | null; weight: number | null };
  type GeoInterestExpression = {
    id: string;
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
    labelName: string | null;
  };
  type Human = {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    status: string;
    emails: HumanEmail[];
    types: string[];
    linkedRouteSignups: LinkedSignup[];
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
  const activities = $derived(data.activities as Activity[]);
  const apiUrl = $derived(data.apiUrl as string);
  const emailLabelConfigs = $derived(data.emailLabelConfigs as ConfigItem[]);
  const phoneLabelConfigs = $derived(data.phoneLabelConfigs as ConfigItem[]);
  const socialIdPlatformConfigs = $derived(data.socialIdPlatformConfigs as ConfigItem[]);

  const emailLabelOptions = $derived(emailLabelConfigs.map((l) => ({ value: l.id, label: l.name })));
  const phoneLabelOptions = $derived(phoneLabelConfigs.map((l) => ({ value: l.id, label: l.name })));
  const socialIdPlatformOptions = $derived(socialIdPlatformConfigs.map((p) => ({ value: p.id, label: p.name })));

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

  let showActivityForm = $state(false);
  let showGeoInterestInActivity = $state(false);
  let breedDropdownOpen = $state(false);
  let newPetType = $state("dog");

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
  <title>{human.displayId} — {human.firstName} {human.lastName} - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
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
    <LinkedRecordBox
      title="Emails"
      items={human.emails}
      emptyMessage="No emails yet."
      addLabel="Email"
      deleteFormAction="?/deleteEmail"
    >
      {#snippet itemRow(item)}
        {@const email = item as unknown as HumanEmail}
        <div class="flex items-center gap-3">
          <a href="/emails/{email.id}" class="text-sm font-medium text-accent hover:text-cyan-300">{email.email}</a>
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
          <button type="submit" class="btn-primary text-sm">
            Add Email
          </button>
        </form>
      {/snippet}
    </LinkedRecordBox>
  </div>

  <!-- Phone Numbers Section -->
  <div class="mt-6">
    <LinkedRecordBox
      title="Phone Numbers"
      items={human.phoneNumbers}
      emptyMessage="No phone numbers yet."
      addLabel="Phone"
    >
      {#snippet itemRow(item)}
        {@const phone = item as unknown as PhoneNumber}
        <div class="flex items-center gap-3">
          <a href="/phone-numbers/{phone.id}" class="text-sm font-medium text-accent hover:text-cyan-300">{phone.phoneNumber}</a>
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
          <button type="submit" class="btn-primary text-sm">
            Add Phone Number
          </button>
        </form>
      {/snippet}
    </LinkedRecordBox>
  </div>

  <!-- Social Media IDs Section -->
  <div class="mt-6">
    <LinkedRecordBox
      title="Social Media IDs"
      items={human.socialIds}
      emptyMessage="No social media IDs yet."
      addLabel="Social ID"
      deleteFormAction="?/deleteSocialId"
    >
      {#snippet itemRow(item)}
        {@const sid = item as unknown as SocialIdItem}
        <div class="flex items-center gap-3">
          <a href="/social-ids/{sid.id}" class="text-sm font-medium text-accent hover:text-cyan-300">{sid.handle}</a>
          {#if sid.platformName}
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-secondary">{sid.platformName}</span>
          {/if}
        </div>
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
          <button type="submit" class="btn-primary text-sm">
            Add Social ID
          </button>
        </form>
      {/snippet}
    </LinkedRecordBox>
  </div>

  <!-- Pets Section -->
  <div class="mt-6 {breedDropdownOpen ? 'relative z-10' : ''}">
    <LinkedRecordBox
      title="Pets"
      items={human.pets}
      emptyMessage="No pets yet."
      addLabel="Pet"
    >
      {#snippet itemRow(item)}
        {@const pet = item as unknown as Pet}
        <div class="flex items-center gap-3">
          <a href="/pets/{pet.id}" class="text-sm font-medium text-accent hover:text-cyan-300">{pet.name}</a>
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {pet.type === 'cat' ? 'bg-[rgba(168,85,247,0.15)] text-purple-300' : 'bg-[rgba(59,130,246,0.15)] text-blue-300'}">
            {pet.type === "cat" ? "Cat" : "Dog"}
          </span>
          {#if pet.type === "dog" && pet.breed}
            <span class="text-sm text-text-secondary">{pet.breed}</span>
          {/if}
          {#if pet.weight}
            <span class="text-sm text-text-muted">{pet.weight} kg</span>
          {/if}
        </div>
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
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {newPetType === 'dog' ? 'bg-[rgba(59,130,246,0.2)] text-blue-300 ring-1 ring-blue-400/30' : 'bg-glass text-text-secondary hover:bg-glass-hover'}"
              >
                Dog
              </button>
              <button
                type="button"
                onclick={() => { newPetType = "cat"; }}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {newPetType === 'cat' ? 'bg-[rgba(168,85,247,0.2)] text-purple-300 ring-1 ring-purple-400/30' : 'bg-glass text-text-secondary hover:bg-glass-hover'}"
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
          <button type="submit" class="btn-primary text-sm">
            Add Pet
          </button>
        </form>
      {/snippet}
    </LinkedRecordBox>
  </div>

  <!-- Geo-Interest Expressions Section -->
  <div class="mt-6">
    <LinkedRecordBox
      title="Geo-Interest Expressions"
      items={human.geoInterestExpressions}
      emptyMessage="No geo-interest expressions yet."
      addLabel="Geo-Interest"
      deleteFormAction="?/deleteGeoInterestExpression"
    >
      {#snippet itemRow(item)}
        {@const expr = item as unknown as GeoInterestExpression}
        <div>
          <div class="flex items-center gap-3">
            <a href="/geo-interests/{expr.geoInterestId}" class="text-sm font-medium text-accent hover:text-cyan-300">
              {expr.city ?? "\u2014"}, {expr.country ?? "\u2014"}
            </a>
            {#if expr.activityId}
              <span class="text-xs text-text-muted">linked to activity</span>
            {/if}
          </div>
          {#if expr.notes}
            <p class="mt-0.5 text-sm text-text-secondary">{expr.notes}</p>
          {/if}
        </div>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addGeoInterestExpression" class="space-y-3">
          <GeoInterestPicker {apiUrl} />
          <button type="submit" class="btn-primary text-sm">
            Add Geo-Interest Expression
          </button>
        </form>
      {/snippet}
    </LinkedRecordBox>
  </div>

  <!-- Route Interest Expressions Section -->
  <div class="mt-6">
    <LinkedRecordBox
      title="Route Interest Expressions"
      items={human.routeInterestExpressions}
      emptyMessage="No route interest expressions yet."
      addLabel="Route Interest"
      deleteFormAction="?/deleteRouteInterestExpression"
    >
      {#snippet itemRow(item)}
        {@const expr = item as unknown as RouteInterestExpression}
        <div>
          <div class="flex items-center gap-3 flex-wrap">
            <a href="/route-interests/{expr.routeInterestId}" class="text-sm font-medium text-accent hover:text-cyan-300">
              {expr.originCity ?? "\u2014"}, {expr.originCountry ?? "\u2014"} &rarr; {expr.destinationCity ?? "\u2014"}, {expr.destinationCountry ?? "\u2014"}
            </a>
            <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {expr.frequency === 'repeat' ? 'bg-[rgba(168,85,247,0.15)] text-purple-300' : 'bg-glass text-text-secondary'}">
              {expr.frequency === "repeat" ? "Repeat" : "One-time"}
            </span>
            {#if expr.travelYear}
              <span class="text-xs text-text-muted">
                {expr.travelYear}{#if expr.travelMonth}-{String(expr.travelMonth).padStart(2, "0")}{#if expr.travelDay}-{String(expr.travelDay).padStart(2, "0")}{/if}{/if}
              </span>
            {/if}
          </div>
          {#if expr.notes}
            <p class="mt-0.5 text-sm text-text-secondary">{expr.notes}</p>
          {/if}
        </div>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addRouteInterestExpression" class="space-y-3">
          <RouteInterestPicker {apiUrl} />
          <button type="submit" class="btn-primary text-sm">
            Add Route Interest Expression
          </button>
        </form>
      {/snippet}
    </LinkedRecordBox>
  </div>

  <!-- Linked Accounts -->
  {#if human.linkedAccounts && human.linkedAccounts.length > 0}
    <div class="mt-6 glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Linked Accounts</h2>
      <div class="space-y-2">
        {#each human.linkedAccounts as link (link.id)}
          <div class="flex items-center gap-3 p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
            <a href="/accounts/{link.accountId}" class="text-sm font-medium text-accent hover:text-cyan-300">
              {link.accountName}
            </a>
            {#if link.labelName}
              <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(249,115,22,0.15)] text-orange-300">
                {link.labelName}
              </span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Linked Route Signups -->
  {#if human.linkedRouteSignups.length > 0}
    <div class="mt-6 glass-card p-5">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Linked Route Signups</h2>
      <div class="space-y-2">
        {#each human.linkedRouteSignups as link (link.id)}
          <div class="flex items-center justify-between p-3 rounded-lg bg-glass hover:bg-glass-hover transition-colors">
            <div>
              <a href="/leads/route-signups/{link.routeSignupId}" class="text-sm font-medium text-blue-300 hover:text-blue-200">
                Signup {link.routeSignupId.slice(0, 8)}...
              </a>
              <p class="text-xs text-text-muted">Linked {new Date(link.linkedAt).toLocaleDateString()}</p>
            </div>
            <form method="POST" action="?/unlinkSignup">
              <input type="hidden" name="linkId" value={link.id} />
              <button type="submit" class="btn-danger text-xs py-1 px-2">
                Unlink
              </button>
            </form>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Activities -->
  <div class="mt-6 glass-card p-5">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-text-primary">Activities</h2>
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
          <div>
            <label class="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                class="rounded border-glass-border"
                bind:checked={showGeoInterestInActivity}
              />
              Link a Geo-Interest?
            </label>
          </div>
          {#if showGeoInterestInActivity}
            <div class="p-3 rounded-lg bg-glass border border-glass-border">
              <GeoInterestPicker
                {apiUrl}
                geoInterestIdName="geoInterestId"
                cityName="geoCity"
                countryName="geoCountry"
                notesName="geoNotes"
              />
            </div>
          {/if}
          <button type="submit" class="btn-primary text-sm">
            Add Activity
          </button>
        </form>
      </div>
    {/if}

    {#if activities.length === 0}
      <p class="text-text-muted text-sm">No activities yet.</p>
    {:else}
      <div class="glass-card overflow-hidden">
        <table class="min-w-full">
          <thead class="glass-thead">
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Type</th>
              <th scope="col">Subject</th>
              <th scope="col">Notes</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {#each activities as activity (activity.id)}
              <tr class="glass-row-hover">
                <td class="font-mono text-sm">
                  <a href="/activities/{activity.id}" class="text-accent hover:text-cyan-300">{activity.displayId}</a>
                </td>
                <td>
                  <span class="glass-badge {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
                    {activityTypeLabels[activity.type] ?? activity.type}
                  </span>
                </td>
                <td class="font-medium">{activity.subject}</td>
                <td class="text-text-muted max-w-xs truncate">{truncateText(activity.notes ?? activity.body, 80)}</td>
                <td class="text-text-muted">{new Date(activity.activityDate).toLocaleDateString()}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Change History -->
  <div class="mt-6 glass-card p-5">
    <h2 class="text-lg font-semibold text-text-primary mb-4">Change History</h2>
    <div class="space-y-2">
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
  </div>

</div>

