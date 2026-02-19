<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import LinkedRecordBox from "$lib/components/LinkedRecordBox.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import PhoneInput from "$lib/components/PhoneInput.svelte";

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

  const account = $derived(data.account as Account);
  const typeConfigs = $derived(data.typeConfigs as ConfigItem[]);
  const humanLabelConfigs = $derived(data.humanLabelConfigs as ConfigItem[]);
  const emailLabelConfigs = $derived(data.emailLabelConfigs as ConfigItem[]);
  const phoneLabelConfigs = $derived(data.phoneLabelConfigs as ConfigItem[]);
  const allHumans = $derived(data.allHumans as HumanListItem[]);

  let showActivityForm = $state(false);

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
  <title>{account.name} - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Record Management Bar -->
  <RecordManagementBar
    backHref="/accounts"
    backLabel="Accounts"
    title={account.name}
    status={account.status}
    statusOptions={["open", "active", "closed"]}
    {statusColorMap}
    statusFormAction="?/updateStatus"
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
  {#if form?.success}
    <AlertBanner type="success" message="Saved successfully." />
  {/if}

  <!-- Details Form -->
  <form method="POST" action="?/update" class="glass-card p-6 space-y-6">
    <h2 class="text-lg font-semibold text-text-primary">Details</h2>

    <div>
      <label for="accountName" class="block text-sm font-medium text-text-secondary">Account Name</label>
      <input
        id="accountName" name="name" type="text" required
        value={account.name}
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
                type="checkbox" name="typeIds" value={t.id}
                checked={account.types.some((at) => at.id === t.id)}
                class="rounded border-glass-border"
              />
              {t.name}
            </label>
          {/each}
        </div>
      </div>
    {/if}

    <button type="submit" class="btn-primary">
      Save Changes
    </button>
  </form>

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
              <select id="emailLabel" name="labelId" class="glass-input mt-1 block w-full">
                <option value="">None</option>
                {#each emailLabelConfigs as l (l.id)}
                  <option value={l.id}>{l.name}</option>
                {/each}
              </select>
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
              <select id="phoneLabel" name="labelId" class="glass-input mt-1 block w-full">
                <option value="">None</option>
                {#each phoneLabelConfigs as l (l.id)}
                  <option value={l.id}>{l.name}</option>
                {/each}
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
          <button type="submit" class="btn-primary text-sm">Add Phone Number</button>
        </form>
      {/snippet}
    </LinkedRecordBox>
  </div>

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
          <!-- Human's contact info as read-only sub-items -->
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
        <form method="POST" action="?/linkHuman" class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="humanSelect" class="block text-sm font-medium text-text-secondary">Human</label>
              <select id="humanSelect" name="humanId" required class="glass-input mt-1 block w-full">
                <option value="">Select a human...</option>
                {#each allHumans as h (h.id)}
                  <option value={h.id}>{h.firstName} {h.lastName}</option>
                {/each}
              </select>
            </div>
            <div>
              <label for="humanLabel" class="block text-sm font-medium text-text-secondary">Role Label</label>
              <select id="humanLabel" name="labelId" class="glass-input mt-1 block w-full">
                <option value="">None</option>
                {#each humanLabelConfigs as l (l.id)}
                  <option value={l.id}>{l.name}</option>
                {/each}
              </select>
            </div>
          </div>
          <button type="submit" class="btn-primary text-sm">Link Human</button>
        </form>
      {/snippet}
    </LinkedRecordBox>
  </div>

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
            <select id="activityType" name="type" class="glass-input mt-1 block w-full">
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
</div>
