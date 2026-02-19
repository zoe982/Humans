<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import LinkedRecordBox from "$lib/components/LinkedRecordBox.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { PET_BREEDS } from "@humans/shared/constants";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type HumanEmail = { id: string; email: string; label: string; isPrimary: boolean };
  type LinkedSignup = { id: string; routeSignupId: string; linkedAt: string };
  type PhoneNumber = { id: string; phoneNumber: string; label: string; hasWhatsapp: boolean; isPrimary: boolean };
  type Pet = { id: string; name: string; breed: string | null; weight: number | null };
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
  type Activity = {
    id: string;
    type: string;
    subject: string;
    notes: string | null;
    body: string | null;
    activityDate: string;
    gmailId: string | null;
    frontId: string | null;
    createdAt: string;
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
    createdAt: string;
    updatedAt: string;
  };

  const human = $derived(data.human as Human);
  const activities = $derived(data.activities as Activity[]);

  let showActivityForm = $state(false);
  let showGeoInterestInActivity = $state(false);

  const typeColors: Record<string, string> = {
    client: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    trainer: "bg-[rgba(34,197,94,0.15)] text-green-300",
    travel_agent: "bg-[rgba(168,85,247,0.15)] text-purple-300",
  };

  const typeLabels: Record<string, string> = {
    client: "Client",
    trainer: "Trainer",
    travel_agent: "Travel Agent",
  };

  const emailLabelColors: Record<string, string> = {
    work: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    personal: "bg-[rgba(34,197,94,0.15)] text-green-300",
    other: "bg-glass text-text-secondary",
  };

  const phoneLabelColors: Record<string, string> = {
    mobile: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    home: "bg-[rgba(34,197,94,0.15)] text-green-300",
    work: "bg-[rgba(168,85,247,0.15)] text-purple-300",
    other: "bg-glass text-text-secondary",
  };

  const statusColorMap: Record<string, string> = {
    open: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    active: "bg-[rgba(34,197,94,0.15)] text-green-300",
    closed: "bg-[rgba(239,68,68,0.15)] text-red-300",
  };

  const activityTypeLabels: Record<string, string> = {
    email: "Email",
    whatsapp_message: "WhatsApp",
    online_meeting: "Meeting",
    phone_call: "Phone Call",
  };

  const activityTypeColors: Record<string, string> = {
    email: "bg-[rgba(59,130,246,0.15)] text-blue-300",
    whatsapp_message: "bg-[rgba(34,197,94,0.15)] text-green-300",
    online_meeting: "bg-[rgba(168,85,247,0.15)] text-purple-300",
    phone_call: "bg-[rgba(249,115,22,0.15)] text-orange-300",
  };

</script>

<svelte:head>
  <title>{human.firstName} {human.lastName} - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Record Management Bar -->
  <RecordManagementBar
    backHref="/humans"
    backLabel="Humans"
    title="{human.firstName} {human.middleName ?? ''} {human.lastName}"
    status={human.status}
    statusOptions={["open", "active", "closed"]}
    {statusColorMap}
    statusFormAction="?/updateStatus"
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
  {#if form?.success}
    <AlertBanner type="success" message="Saved successfully." />
  {/if}

  <!-- Details Form -->
  <form method="POST" action="?/update" class="glass-card p-6 space-y-6">
    <h2 class="text-lg font-semibold text-text-primary">Details</h2>

    <div class="grid gap-4 sm:grid-cols-3">
      <div>
        <label for="firstName" class="block text-sm font-medium text-text-secondary">First Name</label>
        <input
          id="firstName" name="firstName" type="text" required
          value={human.firstName}
          class="glass-input mt-1 block w-full"
        />
      </div>
      <div>
        <label for="middleName" class="block text-sm font-medium text-text-secondary">Middle Name</label>
        <input
          id="middleName" name="middleName" type="text"
          value={human.middleName ?? ""}
          class="glass-input mt-1 block w-full"
        />
      </div>
      <div>
        <label for="lastName" class="block text-sm font-medium text-text-secondary">Last Name</label>
        <input
          id="lastName" name="lastName" type="text" required
          value={human.lastName}
          class="glass-input mt-1 block w-full"
        />
      </div>
    </div>

    <!-- Types -->
    <div>
      <label class="block text-sm font-medium text-text-secondary">Types</label>
      <div class="mt-2 flex gap-4">
        <label class="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" name="types" value="client" checked={human.types.includes("client")} class="rounded border-glass-border" />
          Client
        </label>
        <label class="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" name="types" value="trainer" checked={human.types.includes("trainer")} class="rounded border-glass-border" />
          Trainer
        </label>
        <label class="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" name="types" value="travel_agent" checked={human.types.includes("travel_agent")} class="rounded border-glass-border" />
          Travel Agent
        </label>
      </div>
    </div>

    <button type="submit" class="btn-primary">
      Save Changes
    </button>
  </form>

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
          <span class="text-sm font-medium text-text-primary">{email.email}</span>
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {emailLabelColors[email.label] ?? 'bg-glass text-text-secondary'}">
            {email.label}
          </span>
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
              <select
                id="emailLabel" name="label"
                class="glass-input mt-1 block w-full"
              >
                <option value="personal">Personal</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
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
          <span class="text-sm font-medium text-text-primary">{phone.phoneNumber}</span>
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {phoneLabelColors[phone.label] ?? 'bg-glass text-text-secondary'}">
            {phone.label}
          </span>
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
              <input
                id="phoneNumber" name="phoneNumber" type="tel" required
                class="glass-input mt-1 block w-full"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label for="phoneLabel" class="block text-sm font-medium text-text-secondary">Label</label>
              <select
                id="phoneLabel" name="label"
                class="glass-input mt-1 block w-full"
              >
                <option value="mobile">Mobile</option>
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
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

  <!-- Pets Section -->
  <div class="mt-6">
    <LinkedRecordBox
      title="Pets"
      items={human.pets}
      emptyMessage="No pets yet."
      addLabel="Pet"
    >
      {#snippet itemRow(item)}
        {@const pet = item as unknown as Pet}
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-text-primary">{pet.name}</span>
          {#if pet.breed}
            <span class="text-sm text-text-secondary">{pet.breed}</span>
          {/if}
          {#if pet.weight}
            <span class="text-sm text-text-muted">{pet.weight} kg</span>
          {/if}
        </div>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addPet" class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-3">
            <div>
              <label for="petName" class="block text-sm font-medium text-text-secondary">Name</label>
              <input
                id="petName" name="name" type="text" required
                class="glass-input mt-1 block w-full"
              />
            </div>
            <div>
              <label for="petBreed" class="block text-sm font-medium text-text-secondary">Breed</label>
              <SearchableSelect
                options={PET_BREEDS}
                name="breed"
                id="petBreed"
                placeholder="Search breeds..."
              />
            </div>
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
              {expr.city ?? "—"}, {expr.country ?? "—"}
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
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="geoCity" class="block text-sm font-medium text-text-secondary">City</label>
              <input
                id="geoCity" name="city" type="text" required
                class="glass-input mt-1 block w-full"
                placeholder="e.g. Doha"
              />
            </div>
            <div>
              <label for="geoCountry" class="block text-sm font-medium text-text-secondary">Country</label>
              <input
                id="geoCountry" name="country" type="text" required
                class="glass-input mt-1 block w-full"
                placeholder="e.g. Qatar"
              />
            </div>
          </div>
          <div>
            <label for="geoNotes" class="block text-sm font-medium text-text-secondary">Notes</label>
            <textarea
              id="geoNotes" name="notes" rows="2"
              class="glass-input mt-1 block w-full"
              placeholder="Optional context..."
            ></textarea>
          </div>
          <button type="submit" class="btn-primary text-sm">
            Add Geo-Interest Expression
          </button>
        </form>
      {/snippet}
    </LinkedRecordBox>
  </div>

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
            <select
              id="activityType" name="type"
              class="glass-input mt-1 block w-full"
            >
              <option value="email">Email</option>
              <option value="whatsapp_message">WhatsApp Message</option>
              <option value="online_meeting">Online Meeting</option>
              <option value="phone_call">Phone Call</option>
            </select>
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
            <div class="p-3 rounded-lg bg-glass border border-glass-border space-y-3">
              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label for="actGeoCity" class="block text-sm font-medium text-text-secondary">City</label>
                  <input
                    id="actGeoCity" name="geoCity" type="text"
                    class="glass-input mt-1 block w-full"
                    placeholder="e.g. Doha"
                  />
                </div>
                <div>
                  <label for="actGeoCountry" class="block text-sm font-medium text-text-secondary">Country</label>
                  <input
                    id="actGeoCountry" name="geoCountry" type="text"
                    class="glass-input mt-1 block w-full"
                    placeholder="e.g. Qatar"
                  />
                </div>
              </div>
              <div>
                <label for="actGeoNotes" class="block text-sm font-medium text-text-secondary">Geo-Interest Notes</label>
                <textarea
                  id="actGeoNotes" name="geoNotes" rows="2"
                  class="glass-input mt-1 block w-full"
                  placeholder="Optional context..."
                ></textarea>
              </div>
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
      <div class="space-y-2">
        {#each activities as activity (activity.id)}
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
            {#if activity.gmailId || activity.frontId}
              <div class="mt-1 flex gap-2">
                {#if activity.gmailId}
                  <span class="text-xs text-text-muted">Gmail: {activity.gmailId}</span>
                {/if}
                {#if activity.frontId}
                  <span class="text-xs text-text-muted">Front: {activity.frontId}</span>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
