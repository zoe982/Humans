<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import MarketingAttributionCard from "$lib/components/MarketingAttributionCard.svelte";
  import HighlightText from "$lib/components/HighlightText.svelte";
  import { invalidateAll } from "$app/navigation";
  import { api } from "$lib/api";
  import { signupStatusColors as statusColorMap, activityTypeColors } from "$lib/constants/colors";
  import { signupStatusLabels, activityTypeLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import NextActionSection from "$lib/components/NextActionSection.svelte";
  import { Button } from "$lib/components/ui/button";
  import { resolve } from "$app/paths";
  import { page } from "$app/stores";
  import { formatDateTime, formatRelativeTime } from "$lib/utils/format";
  import { routeSignupStatuses } from "@humans/shared";
  import LeadScoreInlineFlags from "$lib/components/LeadScoreInlineFlags.svelte";
  import { Trash2 } from "lucide-svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type NextAction = {
    id: string;
    ownerId: string | null;
    description: string | null;
    type: string | null;
    dueDate: string | null;
    cadenceNote: string | null;
  };
  type Colleague = { id: string; name: string; displayId?: string };

  type Signup = {
    id: string;
    display_id: string | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    email: string | null;
    origin: string | null;
    destination: string | null;
    status: string | null;
    note: string | null;
    inserted_at: string;
    consent: boolean | null;
    newsletter_opt_in: boolean | null;
    nextAction?: NextAction | null;
  };

  type Activity = {
    id: string;
    displayId: string;
    type: string;
    subject: string;
    notes: string | null;
    body: string | null;
    activityDate: string;
    createdAt: string;
  };

  type MarketingAttr = {
    id: string;
    crmDisplayId: string | null;
    [key: string]: string | null | Record<string, unknown>;
  };

  type CrmEmail = { id: string; email: string; isPrimary: boolean | null };
  type CrmPhoneNumber = { id: string; phoneNumber: string; isPrimary: boolean | null };

  const signup = $derived(data.signup as Signup);
  const marketingAttribution = $derived(data.marketingAttribution as MarketingAttr | null);
  const activities = $derived(data.activities as Activity[]);
  const colleaguesList = $derived((data.colleagues ?? []) as Colleague[]);
  const colleagueOptions = $derived(colleaguesList.map((c) => ({ value: c.id, label: `${c.displayId ?? ""} ${c.name}`.trim() })));
  const isAdmin = $derived(data.user?.role === "admin");
  const isClosed = $derived(signup.status?.startsWith("closed_") ?? false);
  const currentColleagueId = $derived(data.user?.id ?? "");
  const crmEmails = $derived((data.emails ?? []) as CrmEmail[]);
  const crmPhoneNumbers = $derived((data.phoneNumbers ?? []) as CrmPhoneNumber[]);
  const lastActivityDate = $derived(
    activities.length > 0
      ? activities.reduce((latest, a) => (a.activityDate > latest ? a.activityDate : latest), "")
      : null
  );

  type LeadScoreFull = {
    id: string;
    scoreTotal: number;
    scoreFit: number;
    scoreIntent: number;
    scoreEngagement: number;
    scoreNegative: number;
    fitMatchesCurrentWebsiteFlight: boolean;
    fitPriceAcknowledgedOk: boolean;
    intentDepositPaid: boolean;
    intentPaymentDetailsSent: boolean;
    intentRequestedPaymentDetails: boolean;
    intentBookingSubmitted: boolean;
    intentBookingStarted: boolean;
    intentRouteSignupSubmitted: boolean;
    engagementRespondedFast: boolean;
    engagementRespondedSlow: boolean;
    negativeNoContactMethod: boolean;
    negativeOffNetworkRequest: boolean;
    negativePriceObjection: boolean;
    negativeGhostedAfterPaymentSent: boolean;
    customerHasFlown: boolean;
  };

  let leadScore = $derived(data.leadScore as LeadScoreFull | null);

  // Auto-create lead score on first view if none exists
  $effect(() => {
    if (leadScore == null) {
      api("/api/lead-scores/ensure", {
        method: "POST",
        body: JSON.stringify({ parentType: "route_signup", parentId: signup.id }),
      }).then((result) => {
        if (result != null && typeof result === "object" && "data" in result) {
          leadScore = (result as { data: LeadScoreFull }).data;
        }
      }).catch(() => {
        // Silent failure — score will be created on next page load
      });
    }
  });

  let showDeleteConfirm = $state(false);
  let searchQuery = $state("");
  let searchResults = $state<{ id: string; firstName: string; lastName: string; emails: { email: string }[] }[]>([]);
  let searching = $state(false);

  function displayName(s: Signup): string {
    const parts = [s.first_name, s.middle_name, s.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  }

  function formatDatetime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function convertUrl(): string {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const params = new URLSearchParams();
    params.set("fromSignup", signup.id);
    if (signup.first_name) params.set("firstName", signup.first_name);
    if (signup.middle_name) params.set("middleName", signup.middle_name);
    if (signup.last_name) params.set("lastName", signup.last_name);
    if (signup.email) params.set("email", signup.email);
    return `/humans/new?${params.toString()}`;
  }

  async function handleStatusChange(newStatus: string) {
    try {
      await api(`/api/route-signups/${signup.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await invalidateAll();
    } catch {
      // Status update failed - page will reload with current status
    }
  }

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

<svelte:head>
  <title>{signup.display_id ? signup.display_id + ' — ' : ''}{displayName(signup)} - Route Signup - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Record Management Bar -->
  <RecordManagementBar
    backHref="/leads/route-signups"
    backLabel="Route Signups"
    title="{signup.display_id ? signup.display_id + ' — ' : ''}{displayName(signup)}"
    status={signup.status ?? undefined}
    statusOptions={[...routeSignupStatuses]}
    statusLabels={signupStatusLabels}
    {statusColorMap}
    onStatusChange={handleStatusChange}
  >
    {#snippet actions()}
      {#if signup.status !== "closed_converted"}
        <a href={resolve(convertUrl())} class="btn-primary text-sm py-1.5">
          Convert to Human
        </a>
      {/if}
    {/snippet}
  </RecordManagementBar>

  <!-- Alerts -->
  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}
  {#if form?.success}
    <AlertBanner type="success" message="Saved successfully." />
  {/if}

  <!-- Next Action -->
  {#if !isClosed}
    <div class="mb-6">
      <NextActionSection
        apiEndpoint={`/api/route-signups/${signup.id}/next-action`}
        {colleagueOptions}
        {currentColleagueId}
        nextAction={signup.nextAction ?? null}
      />
    </div>
  {/if}

  <!-- Metadata -->
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Metadata</h2>
    <dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <dt class="text-sm font-medium text-text-muted">Email</dt>
        <dd class="mt-1 text-sm text-text-primary">{signup.email ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Origin</dt>
        <dd class="mt-1 text-sm text-text-primary">{signup.origin ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Destination</dt>
        <dd class="mt-1 text-sm text-text-primary">{signup.destination ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Consent</dt>
        <dd class="mt-1 text-sm text-text-primary">{signup.consent ? "Yes" : "No"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Newsletter Opt-in</dt>
        <dd class="mt-1 text-sm text-text-primary">{signup.newsletter_opt_in ? "Yes" : "No"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Created</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatDatetime(signup.inserted_at)}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Last Activity</dt>
        <dd class="mt-1 text-sm text-text-primary">{lastActivityDate ? formatRelativeTime(lastActivityDate) : "—"}</dd>
      </div>
    </dl>
  </div>

  <!-- Marketing Attribution -->
  <div class="glass-card p-6 mb-6">
    {#if marketingAttribution != null}
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-text-primary">Marketing Attribution</h2>
        <a href={resolve(`/marketing-attributions/${marketingAttribution.id}`)} class="text-sm font-mono text-accent hover:text-[var(--link-hover)]">
          {marketingAttribution.crmDisplayId ?? "View"}
        </a>
      </div>
      <MarketingAttributionCard attribution={marketingAttribution} />
    {:else}
      <h2 class="text-lg font-semibold text-text-primary">Marketing Attribution</h2>
      <p class="mt-3 text-sm text-text-muted italic">No marketing attribution linked.</p>
    {/if}
  </div>

  <!-- Lead Score -->
  {#if leadScore != null}
    <div class="glass-card p-6 mb-6">
      <LeadScoreInlineFlags
        {leadScore}
        detailHref={`/reports/lead-scores/${leadScore.id}`}
        onScoreUpdate={(updated) => { leadScore = updated; }}
      />
    </div>
  {/if}

  <!-- Note (Read-only) -->
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Note</h2>
    <div class="mt-3 rounded-xl bg-glass border border-glass-border px-4 py-3 text-sm text-text-secondary min-h-[3rem]">
      {#if signup.note}
        {signup.note}
      {:else}
        <span class="text-text-muted italic">No note.</span>
      {/if}
    </div>
  </div>

  <!-- Convert to Human -->
  {#if signup.status !== "closed_converted"}
    <div class="glass-card p-3 mb-6">
      <div class="relative">
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-text-muted whitespace-nowrap shrink-0">Convert to Human</span>
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
          <a
            href={resolve(convertUrl())}
            class="btn-primary inline-block text-sm whitespace-nowrap shrink-0"
          >
            Create New Human
          </a>
        </div>
        {#if searchResults.length > 0}
          <ul class="absolute left-0 right-0 top-full mt-1 z-10 divide-y divide-glass-border rounded-xl border border-glass-border overflow-hidden" style="background: var(--glass-popover, rgba(20,55,90,0.92)); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);">
            {#each searchResults as human, i (i)}
              <li class="flex items-center justify-between px-4 py-3 hover:bg-glass-hover transition-colors duration-150">
                <div>
                  <p class="text-sm font-medium text-text-primary">{human.firstName} {human.lastName}</p>
                  {#if human.emails?.[0]}
                    <p class="text-xs text-text-muted">{human.emails[0].email}</p>
                  {/if}
                </div>
                <form method="POST" action="?/convertToHuman">
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

  <!-- CRM Emails -->
  <div class="mb-6">
    <RelatedListTable
      title="CRM Emails"
      items={crmEmails}
      columns={[
        { key: "email", label: "Email", sortable: true, sortValue: (e) => e.email },
        { key: "isPrimary", label: "Primary", sortable: false },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="email"
      searchFilter={(e, q) => e.email.toLowerCase().includes(q)}
      emptyMessage="No CRM emails linked yet."
      addLabel="Email"
    >
      {#snippet row(email, searchQuery)}
        <td class="text-sm"><HighlightText text={email.email} query={searchQuery} /></td>
        <td class="text-sm text-text-secondary">{email.isPrimary ? "Yes" : ""}</td>
        <td>
          <form method="POST" action="?/deleteEmail">
            <input type="hidden" name="emailId" value={email.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete email">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addEmail" class="space-y-3">
          <div>
            <label for="newEmailAddress" class="block text-sm font-medium text-text-secondary">Email</label>
            <input id="newEmailAddress" name="email" type="email" required class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Email address" />
          </div>
          <Button type="submit" size="sm">Add Email</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- CRM Phone Numbers -->
  <div class="mb-6">
    <RelatedListTable
      title="CRM Phone Numbers"
      items={crmPhoneNumbers}
      columns={[
        { key: "phoneNumber", label: "Phone", sortable: true, sortValue: (p) => p.phoneNumber },
        { key: "isPrimary", label: "Primary", sortable: false },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="phoneNumber"
      searchFilter={(p, q) => p.phoneNumber.toLowerCase().includes(q)}
      emptyMessage="No CRM phone numbers linked yet."
      addLabel="Phone Number"
    >
      {#snippet row(phone, searchQuery)}
        <td class="text-sm"><HighlightText text={phone.phoneNumber} query={searchQuery} /></td>
        <td class="text-sm text-text-secondary">{phone.isPrimary ? "Yes" : ""}</td>
        <td>
          <form method="POST" action="?/deletePhoneNumber">
            <input type="hidden" name="phoneNumberId" value={phone.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete phone number">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addPhoneNumber" class="space-y-3">
          <div>
            <label for="newPhoneNumber" class="block text-sm font-medium text-text-secondary">Phone Number</label>
            <input id="newPhoneNumber" name="phoneNumber" type="tel" required class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Phone number" />
          </div>
          <Button type="submit" size="sm">Add Phone Number</Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Activities -->
  <div class="mb-6">
    <RelatedListTable
      title="Activities"
      items={activities}
      columns={[
        { key: "displayId", label: "ID", sortable: true, sortValue: (a) => a.displayId },
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
      emptyMessage="No activities yet."
      searchEmptyMessage="No activities match your search."
      addLabel="Activity"
    >
      {#snippet row(activity, searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap">
          <a href={resolve(`/activities/${activity.id}?from=${$page.url.pathname}`)} class="text-accent hover:text-[var(--link-hover)]">{activity.displayId}</a>
        </td>
        <td>
          <!-- eslint-disable-next-line security/detect-object-injection -->
          <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
            <!-- eslint-disable-next-line security/detect-object-injection -->
            <HighlightText text={activityTypeLabels[activity.type] ?? activity.type} query={searchQuery} />
          </span>
        </td>
        <td class="text-sm font-medium max-w-sm truncate">
          <HighlightText text={activity.subject} query={searchQuery} />
        </td>
        <td class="text-text-muted max-w-xs truncate"><HighlightText text={activity.notes ?? activity.body ?? "—"} query={searchQuery} /></td>
        <td class="text-text-muted whitespace-nowrap">{formatDateTime(activity.activityDate)}</td>
      {/snippet}
      {#snippet addForm()}
        <form method="POST" action="?/addActivity" class="space-y-3">
          <div>
            <label for="type" class="block text-sm font-medium text-text-secondary">Type</label>
            <SearchableSelect
              options={ACTIVITY_TYPE_OPTIONS}
              name="type"
              id="type"
              value="email"
              placeholder="Select type..."
            />
          </div>
          <div>
            <label for="subject" class="block text-sm font-medium text-text-secondary">Subject</label>
            <input
              id="subject" name="subject" type="text" required
              class="glass-input mt-1 block w-full px-3 py-2 text-sm"
              placeholder="Activity subject"
            />
          </div>
          <div>
            <label for="notes" class="block text-sm font-medium text-text-secondary">Notes</label>
            <textarea
              id="notes" name="notes" rows="3"
              class="glass-input mt-1 block w-full px-3 py-2 text-sm"
              placeholder="Optional notes..."
            ></textarea>
          </div>
          <div>
            <label for="activityDate" class="block text-sm font-medium text-text-secondary">Date</label>
            <input
              id="activityDate" name="activityDate" type="datetime-local"
              class="glass-input mt-1 block w-full px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" size="sm">
            Add Activity
          </Button>
        </form>
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Danger Zone (Admin only) -->
  {#if isAdmin}
    <div class="glass-card p-6 border-red-500/20 bg-red-500/5">
      <h2 class="text-lg font-semibold text-destructive-foreground">Danger Zone</h2>
      {#if showDeleteConfirm}
        <p class="mt-2 text-sm text-destructive-foreground/80">Are you sure you want to delete this signup? This cannot be undone.</p>
        <div class="mt-3 flex gap-2">
          <form method="POST" action="?/delete">
            <button type="submit" class="btn-danger text-sm">
              Yes, Delete
            </button>
          </form>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onclick={() => { showDeleteConfirm = false; }}
          >
            Cancel
          </Button>
        </div>
      {:else}
        <button
          type="button"
          onclick={() => { showDeleteConfirm = true; }}
          class="btn-danger mt-2 text-sm"
        >
          Delete Signup
        </button>
      {/if}
    </div>
  {/if}
</div>
