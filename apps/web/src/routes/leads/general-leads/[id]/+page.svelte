<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import ActivityConversationView from "$lib/components/ActivityConversationView.svelte";
  import HighlightText from "$lib/components/HighlightText.svelte";
  import LinkHumanSection from "$lib/components/LinkHumanSection.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import { invalidateAll } from "$app/navigation";
  import { api } from "$lib/api";
  import { toast } from "svelte-sonner";
  import { generalLeadStatusColors } from "$lib/constants/colors";
  import { generalLeadStatusLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import NextActionSection from "$lib/components/NextActionSection.svelte";
  import { Button } from "$lib/components/ui/button";
  import { generalLeadStatuses } from "@humans/shared";
  import LeadScoreInlineFlags from "$lib/components/LeadScoreInlineFlags.svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/stores";
  import { Trash2 } from "lucide-svelte";
  import { SvelteURLSearchParams } from "svelte/reactivity";
  import DuplicateContactBanner from "$lib/components/DuplicateContactBanner.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type ConfigItem = { id: string; name: string };
  const leadSources = $derived(data.leadSources as ConfigItem[]);
  const leadChannels = $derived(data.leadChannels as ConfigItem[]);
  const lossReasons = $derived(data.lossReasons as ConfigItem[]);

  type NextAction = {
    id: string;
    ownerId: string | null;
    description: string | null;
    type: string | null;
    dueDate: string | null;
    cadenceNote: string | null;
  };
  type Colleague = { id: string; name: string; displayId?: string };

  type Email = { id: string; displayId: string; email: string; labelId: string | null; isPrimary: boolean; createdAt: string };
  type Phone = { id: string; displayId: string; phoneNumber: string; labelId: string | null; hasWhatsapp: boolean; isPrimary: boolean; createdAt: string };
  type SocialId = { id: string; displayId: string; handle: string; platformId: string | null; platformName: string | null; createdAt: string };
  type PlatformConfig = { id: string; name: string };

  type Lead = {
    id: string;
    displayId: string;
    status: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    notes: string | null;
    rejectReason: string | null;
    lossReason: string | null;
    ownerName: string | null;
    ownerId: string | null;
    convertedHumanId: string | null;
    convertedHumanDisplayId: string | null;
    convertedHumanName: string | null;
    activities: Activity[];
    emails: Email[];
    phoneNumbers: Phone[];
    socialIds: SocialId[];
    source: string | null;
    channel: string | null;
    nextAction?: NextAction | null;
    createdAt: string;
    updatedAt: string;
  };

  type Activity = {
    id: string;
    displayId: string;
    type: string;
    subject: string;
    notes: string | null;
    body: string | null;
    direction: string | null;
    activityDate: string;
    frontConversationId: string | null;
    ownerName?: string | null;
    ownerDisplayId?: string | null;
    createdAt: string;
  };

  const lead = $derived(data.lead as Lead);
  let activities = $state<Activity[]>(data.activities as Activity[]);
  const linkedHumanProp = $derived.by(() => {
    if (lead.convertedHumanId == null) return null;
    return {
      humanId: lead.convertedHumanId,
      humanDisplayId: lead.convertedHumanDisplayId ?? "",
      humanName: lead.convertedHumanName ?? "",
    };
  });
  const platformConfigs = $derived((data.platformConfigs ?? []) as PlatformConfig[]);
  const colleaguesList = $derived((data.colleagues ?? []) as Colleague[]);
  const colleagueOptions = $derived(colleaguesList.map((c) => ({ value: c.id, label: `${c.displayId ?? ""} ${c.name}`.trim() })));
  const isAdmin = $derived(data.user?.role === "admin");
  const isClosed = $derived(lead.status?.startsWith("closed_") ?? false);
  const currentColleagueId = $derived(data.user?.id ?? "");

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
        body: JSON.stringify({ parentType: "general_lead", parentId: lead.id }),
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
  let showRejectDialog = $state(false);
  let rejectReason = $state("");
  let selectedLossReason = $state("");
  let pendingCloseStatus = $state("");
  // Link-existing state for emails, phones, social IDs
  let emailAddMode = $state<"create" | "link">("create");
  let phoneAddMode = $state<"create" | "link">("create");
  let socialIdAddMode = $state<"create" | "link">("create");
  let emailLinkQuery = $state("");
  let phoneLinkQuery = $state("");
  let socialIdLinkQuery = $state("");
  let emailLinkResults = $state<{ id: string; displayId: string; email: string; ownerName: string | null }[]>([]);
  let phoneLinkResults = $state<{ id: string; displayId: string; phoneNumber: string; ownerName: string | null }[]>([]);
  let socialIdLinkResults = $state<{ id: string; displayId: string; handle: string; platformName: string | null; humanName: string | null; accountName: string | null }[]>([]);
  let linkSearching = $state(false);
  let linking = $state(false);

  async function searchEmails() {
    if (emailLinkQuery.trim().length < 2) { emailLinkResults = []; return; }
    linkSearching = true;
    try {
      const res = await api(`/api/emails`, { params: { q: emailLinkQuery.trim() } }) as { data: typeof emailLinkResults };
      emailLinkResults = (res.data ?? []).filter((e) => !lead.emails.some((le) => le.id === e.id));
    } catch { emailLinkResults = []; } finally { linkSearching = false; }
  }

  async function searchPhones() {
    if (phoneLinkQuery.trim().length < 2) { phoneLinkResults = []; return; }
    linkSearching = true;
    try {
      const res = await api(`/api/phone-numbers`, { params: { q: phoneLinkQuery.trim() } }) as { data: typeof phoneLinkResults };
      phoneLinkResults = (res.data ?? []).filter((p) => !lead.phoneNumbers.some((lp) => lp.id === p.id));
    } catch { phoneLinkResults = []; } finally { linkSearching = false; }
  }

  async function searchSocialIds() {
    if (socialIdLinkQuery.trim().length < 2) { socialIdLinkResults = []; return; }
    linkSearching = true;
    try {
      const res = await api(`/api/social-ids`, { params: { q: socialIdLinkQuery.trim() } }) as { data: typeof socialIdLinkResults };
      socialIdLinkResults = (res.data ?? []).filter((s) => !lead.socialIds.some((ls) => ls.id === s.id));
    } catch { socialIdLinkResults = []; } finally { linkSearching = false; }
  }

  async function linkEmail(emailId: string) {
    linking = true;
    try {
      await api(`/api/emails/${emailId}`, { method: "PATCH", body: JSON.stringify({ generalLeadId: lead.id }) });
      emailLinkQuery = ""; emailLinkResults = [];
      toast("Email linked");
      await invalidateAll();
    } catch (err) { toast(`Failed to link email: ${err instanceof Error ? err.message : "Unknown error"}`); }
    finally { linking = false; }
  }

  async function linkPhone(phoneId: string) {
    linking = true;
    try {
      await api(`/api/phone-numbers/${phoneId}`, { method: "PATCH", body: JSON.stringify({ generalLeadId: lead.id }) });
      phoneLinkQuery = ""; phoneLinkResults = [];
      toast("Phone number linked");
      await invalidateAll();
    } catch (err) { toast(`Failed to link phone: ${err instanceof Error ? err.message : "Unknown error"}`); }
    finally { linking = false; }
  }

  async function linkSocialId(socialIdId: string) {
    linking = true;
    try {
      await api(`/api/social-ids/${socialIdId}`, { method: "PATCH", body: JSON.stringify({ generalLeadId: lead.id }) });
      socialIdLinkQuery = ""; socialIdLinkResults = [];
      toast("Social ID linked");
      await invalidateAll();
    } catch (err) { toast(`Failed to link social ID: ${err instanceof Error ? err.message : "Unknown error"}`); }
    finally { linking = false; }
  }

  function formatDatetime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  const createNewHumanUrl = $derived.by(() => {
    const params = new SvelteURLSearchParams();
    params.set("fromGeneralLead", lead.id);
    params.set("firstName", lead.firstName);
    if (lead.middleName) params.set("middleName", lead.middleName);
    params.set("lastName", lead.lastName);
    if (lead.notes) params.set("notes", lead.notes);
    return `/humans/new?${params.toString()}`;
  });

  async function handleStatusChange(newStatus: string) {
    if (newStatus === "closed_rejected" || newStatus === "closed_no_response") {
      pendingCloseStatus = newStatus;
      showRejectDialog = true;
      return;
    }
    try {
      await api(`/api/general-leads/${lead.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await invalidateAll();
    } catch {
      // Status update failed
    }
  }

  async function submitReject() {
    if (pendingCloseStatus === "closed_rejected" && !rejectReason.trim()) return;
    try {
      const payload: Record<string, string | undefined> = { status: pendingCloseStatus };
      if (rejectReason.trim()) payload.rejectReason = rejectReason;
      if (selectedLossReason) payload.lossReason = selectedLossReason;
      await api(`/api/general-leads/${lead.id}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      showRejectDialog = false;
      rejectReason = "";
      selectedLossReason = "";
      pendingCloseStatus = "";
      await invalidateAll();
    } catch {
      // Rejection failed
    }
  }

</script>

<svelte:head>
  <title>{lead.displayId} {lead.firstName} {lead.lastName} - General Lead</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Record Management Bar -->
  <RecordManagementBar
    backHref="/leads/general-leads"
    backLabel="General Leads"
    title={`${lead.displayId} — ${[lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ")}`}
    status={lead.status}
    statusOptions={[...generalLeadStatuses]}
    statusColorMap={generalLeadStatusColors}
    statusLabels={generalLeadStatusLabels}
    onStatusChange={handleStatusChange}
  >
    {#snippet actions()}
      {#if !isClosed}
        {#if lead.status === "open"}
          <Button size="sm" onclick={() => handleStatusChange("qualified")}>Mark Qualified</Button>
        {/if}
        <Button size="sm" variant="destructive" onclick={() => { pendingCloseStatus = "closed_rejected"; showRejectDialog = true; }}>Close Rejected</Button>
      {/if}
    {/snippet}
  </RecordManagementBar>

  <!-- Alerts -->
  {#if form?.error}
    {#if form.code?.endsWith("_DUPLICATE") && form.details}
      <DuplicateContactBanner
        details={form.details as { existingId: string; existingDisplayId: string; existingOwners: { type: string; id: string; displayId: string; name: string }[] }}
        entityType={form.code === "EMAIL_DUPLICATE" ? "emails" : form.code === "PHONE_DUPLICATE" ? "phone-numbers" : "social-ids"}
        parentType="generalLead"
        parentId={lead.id}
        parentField="generalLeadId"
      />
    {:else}
      <AlertBanner type="error" message={form.error} />
    {/if}
  {/if}
  {#if form?.success}
    <AlertBanner type="success" message="Saved successfully." />
  {/if}

  <!-- Next Action -->
  {#if !isClosed}
    <div class="mb-6">
      <NextActionSection
        apiEndpoint={`/api/general-leads/${lead.id}/next-action`}
        {colleagueOptions}
        {currentColleagueId}
        nextAction={lead.nextAction ?? null}
        warnWhenEmpty={lead.status !== "open"}
      />
    </div>
  {/if}

  <!-- Helper text -->
  <div class="mt-4 rounded-xl bg-glass/50 border border-glass-border px-4 py-3 text-sm text-text-muted">
    A General Lead is an unverified contact record. Convert to create a verified Human.
  </div>

  <!-- Source & Channel -->
  <div class="glass-card p-6 mt-4 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Source & Channel</h2>
    <form method="POST" action="?/updateSourceChannel" class="mt-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="sourceSelect" class="block text-sm font-medium text-text-secondary mb-1">Source</label>
          <select id="sourceSelect" name="source" class="glass-input block w-full px-3 py-2 text-sm">
            <option value="">-- Unknown --</option>
            {#each leadSources as src, i (i)}
              <option value={src.name} selected={lead.source === src.name}>{src.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="channelSelect" class="block text-sm font-medium text-text-secondary mb-1">Channel</label>
          <select id="channelSelect" name="channel" class="glass-input block w-full px-3 py-2 text-sm">
            <option value="">-- Unknown --</option>
            {#each leadChannels as ch, i (i)}
              <option value={ch.name} selected={lead.channel === ch.name}>{ch.name}</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="mt-3 flex justify-end">
        <Button type="submit" size="sm">Save</Button>
      </div>
    </form>
  </div>

  <!-- Metadata -->
  <div class="glass-card p-6 mt-4 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Metadata</h2>
    <dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <dt class="text-sm font-medium text-text-muted">Name</dt>
        <dd class="mt-1 text-sm text-text-primary">{[lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(" ")}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Owner</dt>
        <dd class="mt-1 text-sm text-text-primary">{lead.ownerName ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Created</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatDatetime(lead.createdAt)}</dd>
      </div>
      {#if lead.convertedHumanId}
        <div>
          <dt class="text-sm font-medium text-text-muted">Linked Human</dt>
          <dd class="mt-1 text-sm">
            <a href={resolve(`/humans/${lead.convertedHumanId}?from=${$page.url.pathname}`)} class="text-accent hover:text-[var(--link-hover)] font-mono">
              {lead.convertedHumanDisplayId}
            </a>
            {#if lead.convertedHumanName}
              <span class="text-text-secondary ml-1">({lead.convertedHumanName})</span>
            {/if}
          </dd>
        </div>
      {/if}
      {#if lead.rejectReason}
        <div class="col-span-2">
          <dt class="text-sm font-medium text-text-muted">Reject Reason</dt>
          <dd class="mt-1 text-sm text-destructive-foreground">{lead.rejectReason}</dd>
        </div>
      {/if}
      {#if lead.lossReason}
        <div>
          <dt class="text-sm font-medium text-text-muted">Loss Reason</dt>
          <dd class="mt-1 text-sm text-text-primary">{lead.lossReason}</dd>
        </div>
      {/if}
    </dl>
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

  <!-- Notes (editable) -->
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Notes</h2>
    <form method="POST" action="?/updateNotes" class="mt-3">
      <textarea
        name="notes" rows="4"
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="Add notes about this lead..."
      >{lead.notes ?? ""}</textarea>
      <div class="mt-2 flex justify-end">
        <Button type="submit" size="sm">Save Notes</Button>
      </div>
    </form>
  </div>

  <!-- Emails -->
  <div class="mb-6">
    <RelatedListTable
      title="Emails"
      items={lead.emails ?? []}
      columns={[
        { key: "displayId", label: "ID", sortable: true, sortValue: (e) => e.displayId },
        { key: "email", label: "Email", sortable: true, sortValue: (e) => e.email },
        { key: "isPrimary", label: "Primary", sortable: false },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="email"
      searchFilter={(e, q) => e.email.toLowerCase().includes(q) || e.displayId.toLowerCase().includes(q)}
      emptyMessage="No emails yet."
      addLabel="Email"
      onFormToggle={(open) => { if (!open) { emailAddMode = 'create'; emailLinkQuery = ''; emailLinkResults = []; } }}
    >
      {#snippet row(email, searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap"><a href={resolve(`/emails/${email.id}?from=${$page.url.pathname}`)} class="text-accent hover:text-[var(--link-hover)]">{email.displayId}</a></td>
        <td class="text-sm"><HighlightText text={email.email} query={searchQuery} /></td>
        <td>{email.isPrimary ? "Yes" : ""}</td>
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
        <div class="flex gap-2 mb-3">
          <button type="button" class="px-3 py-1 text-xs rounded-full transition-colors {emailAddMode === 'create' ? 'bg-accent text-white' : 'bg-glass-hover text-text-muted'}" onclick={() => { emailAddMode = 'create'; emailLinkQuery = ''; emailLinkResults = []; }}>Create New</button>
          <button type="button" class="px-3 py-1 text-xs rounded-full transition-colors {emailAddMode === 'link' ? 'bg-accent text-white' : 'bg-glass-hover text-text-muted'}" onclick={() => { emailAddMode = 'link'; }}>Link Existing</button>
        </div>
        {#if emailAddMode === 'create'}
          <form method="POST" action="?/addEmail" class="space-y-3">
            <div>
              <label for="newEmail" class="block text-sm font-medium text-text-secondary">Email</label>
              <input id="newEmail" name="email" type="email" required class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Email address" />
            </div>
            <Button type="submit" size="sm">Add Email</Button>
          </form>
        {:else}
          <div class="space-y-3">
            <div>
              <label for="linkEmail" class="block text-sm font-medium text-text-secondary">Search emails</label>
              <input id="linkEmail" type="text" bind:value={emailLinkQuery} oninput={searchEmails} class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Type to search existing emails..." />
            </div>
            {#if linkSearching}<p class="text-xs text-text-muted">Searching...</p>{/if}
            {#if emailLinkResults.length > 0}
              <ul class="divide-y divide-glass-border rounded-lg border border-glass-border overflow-hidden">
                {#each emailLinkResults as result, i (i)}
                  <li class="flex items-center justify-between px-3 py-2 hover:bg-glass-hover transition-colors">
                    <div>
                      <p class="text-sm font-medium text-text-primary">{result.email}</p>
                      <p class="text-xs text-text-muted">{result.displayId}{result.ownerName ? ` — ${result.ownerName}` : ""}</p>
                    </div>
                    <Button type="button" size="sm" disabled={linking} onclick={() => linkEmail(result.id)}>{linking ? "Linking..." : "Link"}</Button>
                  </li>
                {/each}
              </ul>
            {:else if emailLinkQuery.length >= 2 && !linkSearching}
              <p class="text-xs text-text-muted">No matching emails found.</p>
            {/if}
          </div>
        {/if}
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Phone Numbers -->
  <div class="mb-6">
    <RelatedListTable
      title="Phone Numbers"
      items={lead.phoneNumbers ?? []}
      columns={[
        { key: "displayId", label: "ID", sortable: true, sortValue: (p) => p.displayId },
        { key: "phoneNumber", label: "Phone Number", sortable: true, sortValue: (p) => p.phoneNumber },
        { key: "hasWhatsapp", label: "WhatsApp", sortable: false },
        { key: "isPrimary", label: "Primary", sortable: false },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="phoneNumber"
      searchFilter={(p, q) => p.phoneNumber.toLowerCase().includes(q) || p.displayId.toLowerCase().includes(q)}
      emptyMessage="No phone numbers yet."
      addLabel="Phone Number"
      onFormToggle={(open) => { if (!open) { phoneAddMode = 'create'; phoneLinkQuery = ''; phoneLinkResults = []; } }}
    >
      {#snippet row(phone, searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap"><a href={resolve(`/phone-numbers/${phone.id}?from=${$page.url.pathname}`)} class="text-accent hover:text-[var(--link-hover)]">{phone.displayId}</a></td>
        <td class="text-sm"><HighlightText text={phone.phoneNumber} query={searchQuery} /></td>
        <td>{phone.hasWhatsapp ? "Yes" : ""}</td>
        <td>{phone.isPrimary ? "Yes" : ""}</td>
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
        <div class="flex gap-2 mb-3">
          <button type="button" class="px-3 py-1 text-xs rounded-full transition-colors {phoneAddMode === 'create' ? 'bg-accent text-white' : 'bg-glass-hover text-text-muted'}" onclick={() => { phoneAddMode = 'create'; phoneLinkQuery = ''; phoneLinkResults = []; }}>Create New</button>
          <button type="button" class="px-3 py-1 text-xs rounded-full transition-colors {phoneAddMode === 'link' ? 'bg-accent text-white' : 'bg-glass-hover text-text-muted'}" onclick={() => { phoneAddMode = 'link'; }}>Link Existing</button>
        </div>
        {#if phoneAddMode === 'create'}
          <form method="POST" action="?/addPhoneNumber" class="space-y-3">
            <div>
              <label for="newPhone" class="block text-sm font-medium text-text-secondary">Phone Number</label>
              <input id="newPhone" name="phoneNumber" type="tel" required class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Phone number" />
            </div>
            <Button type="submit" size="sm">Add Phone</Button>
          </form>
        {:else}
          <div class="space-y-3">
            <div>
              <label for="linkPhone" class="block text-sm font-medium text-text-secondary">Search phone numbers</label>
              <input id="linkPhone" type="text" bind:value={phoneLinkQuery} oninput={searchPhones} class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Type to search existing phone numbers..." />
            </div>
            {#if linkSearching}<p class="text-xs text-text-muted">Searching...</p>{/if}
            {#if phoneLinkResults.length > 0}
              <ul class="divide-y divide-glass-border rounded-lg border border-glass-border overflow-hidden">
                {#each phoneLinkResults as result, i (i)}
                  <li class="flex items-center justify-between px-3 py-2 hover:bg-glass-hover transition-colors">
                    <div>
                      <p class="text-sm font-medium text-text-primary">{result.phoneNumber}</p>
                      <p class="text-xs text-text-muted">{result.displayId}{result.ownerName ? ` — ${result.ownerName}` : ""}</p>
                    </div>
                    <Button type="button" size="sm" disabled={linking} onclick={() => linkPhone(result.id)}>{linking ? "Linking..." : "Link"}</Button>
                  </li>
                {/each}
              </ul>
            {:else if phoneLinkQuery.length >= 2 && !linkSearching}
              <p class="text-xs text-text-muted">No matching phone numbers found.</p>
            {/if}
          </div>
        {/if}
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Social IDs -->
  <div class="mb-6">
    <RelatedListTable
      title="Social IDs"
      items={lead.socialIds ?? []}
      columns={[
        { key: "displayId", label: "ID", sortable: true, sortValue: (s) => s.displayId },
        { key: "handle", label: "Handle", sortable: true, sortValue: (s) => s.handle },
        { key: "platformName", label: "Platform", sortable: true, sortValue: (s) => s.platformName ?? "" },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="handle"
      searchFilter={(s, q) => s.handle.toLowerCase().includes(q) || (s.platformName ?? "").toLowerCase().includes(q) || s.displayId.toLowerCase().includes(q)}
      emptyMessage="No social IDs yet."
      addLabel="Social ID"
      onFormToggle={(open) => { if (!open) { socialIdAddMode = 'create'; socialIdLinkQuery = ''; socialIdLinkResults = []; } }}
    >
      {#snippet row(socialId, searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap"><a href={resolve(`/social-ids/${socialId.id}?from=${$page.url.pathname}`)} class="text-accent hover:text-[var(--link-hover)]">{socialId.displayId}</a></td>
        <td class="text-sm"><HighlightText text={socialId.handle} query={searchQuery} /></td>
        <td class="text-sm">{socialId.platformName ?? "—"}</td>
        <td>
          <form method="POST" action="?/deleteSocialId">
            <input type="hidden" name="socialIdId" value={socialId.id} />
            <button type="submit" class="flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-destructive-foreground hover:bg-destructive transition-colors duration-150" aria-label="Delete social ID">
              <Trash2 size={14} />
            </button>
          </form>
        </td>
      {/snippet}
      {#snippet addForm()}
        <div class="flex gap-2 mb-3">
          <button type="button" class="px-3 py-1 text-xs rounded-full transition-colors {socialIdAddMode === 'create' ? 'bg-accent text-white' : 'bg-glass-hover text-text-muted'}" onclick={() => { socialIdAddMode = 'create'; socialIdLinkQuery = ''; socialIdLinkResults = []; }}>Create New</button>
          <button type="button" class="px-3 py-1 text-xs rounded-full transition-colors {socialIdAddMode === 'link' ? 'bg-accent text-white' : 'bg-glass-hover text-text-muted'}" onclick={() => { socialIdAddMode = 'link'; }}>Link Existing</button>
        </div>
        {#if socialIdAddMode === 'create'}
          <form method="POST" action="?/addSocialId" class="space-y-3">
            <div>
              <label for="newHandle" class="block text-sm font-medium text-text-secondary">Handle</label>
              <input id="newHandle" name="handle" type="text" required class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="@username or profile URL" />
            </div>
            <div>
              <label for="newPlatformId" class="block text-sm font-medium text-text-secondary">Platform</label>
              <SearchableSelect
                options={platformConfigs.map((p) => ({ value: p.id, label: p.name }))}
                name="platformId"
                id="newPlatformId"
                placeholder="Select platform..."
              />
            </div>
            <Button type="submit" size="sm">Add Social ID</Button>
          </form>
        {:else}
          <div class="space-y-3">
            <div>
              <label for="linkSocialId" class="block text-sm font-medium text-text-secondary">Search social IDs</label>
              <input id="linkSocialId" type="text" bind:value={socialIdLinkQuery} oninput={searchSocialIds} class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Type to search existing social IDs..." />
            </div>
            {#if linkSearching}<p class="text-xs text-text-muted">Searching...</p>{/if}
            {#if socialIdLinkResults.length > 0}
              <ul class="divide-y divide-glass-border rounded-lg border border-glass-border overflow-hidden">
                {#each socialIdLinkResults as result, i (i)}
                  <li class="flex items-center justify-between px-3 py-2 hover:bg-glass-hover transition-colors">
                    <div>
                      <p class="text-sm font-medium text-text-primary">{result.handle}</p>
                      <p class="text-xs text-text-muted">{result.displayId}{result.platformName ? ` — ${result.platformName}` : ""}{result.humanName ? ` — ${result.humanName}` : ""}{result.accountName ? ` — ${result.accountName}` : ""}</p>
                    </div>
                    <Button type="button" size="sm" disabled={linking} onclick={() => linkSocialId(result.id)}>{linking ? "Linking..." : "Link"}</Button>
                  </li>
                {/each}
              </ul>
            {:else if socialIdLinkQuery.length >= 2 && !linkSearching}
              <p class="text-xs text-text-muted">No matching social IDs found.</p>
            {/if}
          </div>
        {/if}
      {/snippet}
    </RelatedListTable>
  </div>

  <!-- Link Human -->
  <LinkHumanSection
    linkedHuman={linkedHumanProp}
    createNewHumanUrl={createNewHumanUrl}
  />

  <!-- Activities -->
  <div class="mb-6">
    <ActivityConversationView
      {activities}
      entityType="general-lead"
      entityId={lead.id}
      maxMessages={8}
      showViewAll={true}
      onDelete={deleteActivity}
    >
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
            <label for="activityNotes" class="block text-sm font-medium text-text-secondary">Notes</label>
            <textarea
              id="activityNotes" name="notes" rows="3"
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
    </ActivityConversationView>
  </div>

  <!-- Danger Zone (Admin only) -->
  {#if isAdmin}
    <div class="glass-card p-6 border-red-500/20 bg-red-500/5">
      <h2 class="text-lg font-semibold text-destructive-foreground">Danger Zone</h2>
      {#if showDeleteConfirm}
        <p class="mt-2 text-sm text-destructive-foreground/80">Are you sure you want to delete this lead? This cannot be undone.</p>
        <div class="mt-3 flex gap-2">
          <form method="POST" action="?/delete">
            <button type="submit" class="btn-danger text-sm">Yes, Delete</button>
          </form>
          <Button type="button" variant="ghost" size="sm" onclick={() => { showDeleteConfirm = false; }}>Cancel</Button>
        </div>
      {:else}
        <button type="button" onclick={() => { showDeleteConfirm = true; }} class="btn-danger mt-2 text-sm">Delete Lead</button>
      {/if}
    </div>
  {/if}
</div>

<!-- Reject Reason Dialog -->
{#if showRejectDialog}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="glass-card p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold text-text-primary">
        {pendingCloseStatus === "closed_no_response" ? "Close as No Response" : "Close as Rejected"}
      </h3>
      <p class="mt-2 text-sm text-text-secondary">
        {pendingCloseStatus === "closed_no_response" ? "Optionally provide details for closing this lead." : "Please provide a reason for rejecting this lead."}
      </p>
      <div class="mt-3">
        <label for="lossReasonSelect" class="block text-sm font-medium text-text-secondary mb-1">Loss Reason</label>
        <select id="lossReasonSelect" class="glass-input block w-full px-3 py-2 text-sm" bind:value={selectedLossReason}>
          <option value="">-- Select --</option>
          {#each lossReasons as reason, i (i)}
            <option value={reason.name}>{reason.name}</option>
          {/each}
        </select>
      </div>
      <textarea
        bind:value={rejectReason}
        rows="3"
        class="glass-input mt-3 block w-full px-3 py-2 text-sm"
        placeholder="Loss notes..."
      ></textarea>
      <div class="mt-4 flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onclick={() => { showRejectDialog = false; rejectReason = ""; selectedLossReason = ""; pendingCloseStatus = ""; }}>Cancel</Button>
        <Button variant="destructive" size="sm" onclick={submitReject} disabled={pendingCloseStatus === "closed_rejected" && !rejectReason.trim()}>
          {pendingCloseStatus === "closed_no_response" ? "Close Lead" : "Reject Lead"}
        </Button>
      </div>
    </div>
  </div>
{/if}
