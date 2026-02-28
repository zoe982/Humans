<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import RelatedListTable from "$lib/components/RelatedListTable.svelte";
  import ActivityConversationView from "$lib/components/ActivityConversationView.svelte";
  import MarketingAttributionCard from "$lib/components/MarketingAttributionCard.svelte";
  import HighlightText from "$lib/components/HighlightText.svelte";
  import LinkHumanSection from "$lib/components/LinkHumanSection.svelte";
  import { bookingRequestStatusColors } from "$lib/constants/colors";
  import { bookingRequestStatusLabels, BOOKING_REQUEST_STATUS_OPTIONS, depositStatusLabels, balanceStatusLabels, ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import NextActionSection from "$lib/components/NextActionSection.svelte";
  import { invalidateAll } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { Button } from "$lib/components/ui/button";
  import { formatDateTime } from "$lib/utils/format";
  import LeadScoreInlineFlags from "$lib/components/LeadScoreInlineFlags.svelte";
  import { api } from "$lib/api";
  import { resolve } from "$app/paths";
  import { page } from "$app/stores";
  import { Trash2 } from "lucide-svelte";
  import { SvelteURLSearchParams } from "svelte/reactivity";
  import DuplicateContactBanner from "$lib/components/DuplicateContactBanner.svelte";

  type ConfigItem = { id: string; name: string };
  let { data, form }: { data: PageData; form: ActionData } = $props();

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

  type Booking = {
    id: string;
    crm_display_id: string | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    client_email: string | null;
    phone_number: string | null;
    origin_city: string | null;
    destination_city: string | null;
    travel_date: string | null;
    travel_time: string | null;
    number_of_dogs: number | null;
    client_pet_name: string | null;
    seats_booked: number | null;
    base_flight_price_eur: number | null;
    deposit_status: string | null;
    deposit_paid_eur: number | null;
    balance_status: string | null;
    balance_paid_eur: number | null;
    balance_due_date: string | null;
    status: string | null;
    crm_note: string | null;
    inserted_at: string;
    booking_request_ref: string | null;
    additional_information: string | null;
    crm_source: string | null;
    crm_channel: string | null;
    crm_loss_reason: string | null;
    crm_loss_notes: string | null;
    nextAction?: NextAction | null;
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
    ownerId: string | null;
    ownerName: string | null;
    ownerDisplayId: string | null;
    createdAt: string;
  };

  type LinkedHuman = {
    id: string;
    humanId: string;
    humanDisplayId: string;
    humanFirstName: string;
    humanLastName: string;
    linkedAt: string;
    opportunityId: string | null;
  };

  type OpportunityOption = { id: string; displayId: string; stage: string; seatsRequested?: number; notes?: string | null };

  type MarketingAttr = {
    id: string;
    crmDisplayId: string | null;
    [key: string]: string | null | Record<string, unknown>;
  };

  type CrmEmail = { id: string; displayId: string; email: string; isPrimary: boolean | null };
  type CrmPhoneNumber = { id: string; displayId: string; phoneNumber: string; isPrimary: boolean | null };
  type SocialId = { id: string; displayId: string; handle: string; platformId: string | null; platformName: string | null; createdAt: string };
  type PlatformConfig = { id: string; name: string };

  const booking = $derived(data.booking as Booking);
  const marketingAttribution = $derived(data.marketingAttribution as MarketingAttr | null);
  let activities = $state<Activity[]>(data.activities as Activity[]);
  const linkedHumans = $derived((data.linkedHumans ?? []) as LinkedHuman[]);
  const linkedHumanProp = $derived.by(() => {
    const lh = linkedHumans[0];
    if (lh == null) return null;
    return { humanId: lh.humanId, humanDisplayId: lh.humanDisplayId, humanName: `${lh.humanFirstName} ${lh.humanLastName}`, linkedAt: lh.linkedAt, linkId: lh.id };
  });
  const colleaguesList = $derived((data.colleagues ?? []) as Colleague[]);
  const colleagueOptions = $derived(colleaguesList.map((c) => ({ value: c.id, label: `${c.displayId ?? ""} ${c.name}`.trim() })));
  const isAdmin = $derived(data.user?.role === "admin");
  const isManager = $derived(data.user?.role === "manager" || data.user?.role === "admin");
  const isClosed = $derived(booking.status?.startsWith("closed_") ?? false);
  const currentColleagueId = $derived(data.user?.id ?? "");
  const crmEmails = $derived((data.emails ?? []) as CrmEmail[]);
  const crmPhoneNumbers = $derived((data.phoneNumbers ?? []) as CrmPhoneNumber[]);
  const socialIds = $derived((data.socialIds ?? []) as SocialId[]);
  const platformConfigs = $derived((data.platformConfigs ?? []) as PlatformConfig[]);
  const allOpportunities = $derived((data.opportunities ?? []) as OpportunityOption[]);
  const linkedOpportunityId = $derived(linkedHumans[0]?.opportunityId ?? null);
  const linkedOpportunity = $derived(linkedOpportunityId ? allOpportunities.find((o) => o.id === linkedOpportunityId) ?? null : null);
  const opportunityOptions = $derived(
    allOpportunities
      .filter((o) => o.id !== linkedOpportunityId)
      .map((o) => ({ value: o.id, label: `${o.displayId} — ${o.stage}` }))
  );
  const hasLinkedHuman = $derived(linkedHumans.length > 0);

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
        body: JSON.stringify({ parentType: "website_booking_request", parentId: booking.id }),
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
  let editingNote = $state(false);
  let noteValue = $state("");
  let showLossDialog = $state(false);
  let selectedLossReason = $state("");
  let lossNotes = $state("");

  // Editable loss details (for closed_lost records)
  let editLossReason = $state(booking.crm_loss_reason ?? "");
  let editLossNotes = $state(booking.crm_loss_notes ?? "");
  let savingLoss = $state(false);

  $effect(() => {
    editLossReason = booking.crm_loss_reason ?? "";
    editLossNotes = booking.crm_loss_notes ?? "";
  });

  async function saveLossDetails() {
    savingLoss = true;
    try {
      await api(`/api/website-booking-requests/${booking.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          crm_loss_reason: editLossReason || null,
          crm_loss_notes: editLossNotes || null,
        }),
      });
      toast.success("Loss details saved");
      await invalidateAll();
    } catch {
      toast.error("Failed to save loss details");
    } finally {
      savingLoss = false;
    }
  }

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

  async function searchExistingEmails() {
    if (emailLinkQuery.trim().length < 2) { emailLinkResults = []; return; }
    linkSearching = true;
    try {
      const res = await api(`/api/emails`, { params: { q: emailLinkQuery.trim() } }) as { data: typeof emailLinkResults };
      emailLinkResults = (res.data ?? []).filter((e) => !crmEmails.some((ce) => ce.id === e.id));
    } catch { emailLinkResults = []; } finally { linkSearching = false; }
  }

  async function searchExistingPhones() {
    if (phoneLinkQuery.trim().length < 2) { phoneLinkResults = []; return; }
    linkSearching = true;
    try {
      const res = await api(`/api/phone-numbers`, { params: { q: phoneLinkQuery.trim() } }) as { data: typeof phoneLinkResults };
      phoneLinkResults = (res.data ?? []).filter((p) => !crmPhoneNumbers.some((cp) => cp.id === p.id));
    } catch { phoneLinkResults = []; } finally { linkSearching = false; }
  }

  async function searchExistingSocialIds() {
    if (socialIdLinkQuery.trim().length < 2) { socialIdLinkResults = []; return; }
    linkSearching = true;
    try {
      const res = await api(`/api/social-ids`, { params: { q: socialIdLinkQuery.trim() } }) as { data: typeof socialIdLinkResults };
      socialIdLinkResults = (res.data ?? []).filter((s) => !socialIds.some((cs) => cs.id === s.id));
    } catch { socialIdLinkResults = []; } finally { linkSearching = false; }
  }

  async function linkEmail(emailId: string) {
    linking = true;
    try {
      await api(`/api/emails/${emailId}`, { method: "PATCH", body: JSON.stringify({ websiteBookingRequestId: booking.id }) });
      emailLinkQuery = ""; emailLinkResults = [];
      toast("Email linked");
      await invalidateAll();
    } catch (err) { toast(`Failed to link email: ${err instanceof Error ? err.message : "Unknown error"}`); }
    finally { linking = false; }
  }

  async function linkPhone(phoneId: string) {
    linking = true;
    try {
      await api(`/api/phone-numbers/${phoneId}`, { method: "PATCH", body: JSON.stringify({ websiteBookingRequestId: booking.id }) });
      phoneLinkQuery = ""; phoneLinkResults = [];
      toast("Phone number linked");
      await invalidateAll();
    } catch (err) { toast(`Failed to link phone: ${err instanceof Error ? err.message : "Unknown error"}`); }
    finally { linking = false; }
  }

  async function linkSocialId(socialIdId: string) {
    linking = true;
    try {
      await api(`/api/social-ids/${socialIdId}`, { method: "PATCH", body: JSON.stringify({ websiteBookingRequestId: booking.id }) });
      socialIdLinkQuery = ""; socialIdLinkResults = [];
      toast("Social ID linked");
      await invalidateAll();
    } catch (err) { toast(`Failed to link social ID: ${err instanceof Error ? err.message : "Unknown error"}`); }
    finally { linking = false; }
  }

  function displayName(b: Booking): string {
    const parts = [b.first_name, b.middle_name, b.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  }

  function formatEur(value: number | null): string {
    if (value == null) return "—";
    return `€${Number(value).toFixed(2)}`;
  }

  const createNewHumanUrl = $derived.by(() => {
    const params = new SvelteURLSearchParams();
    params.set("fromBookingRequest", booking.id);
    if (booking.first_name) params.set("firstName", booking.first_name);
    if (booking.middle_name) params.set("middleName", booking.middle_name);
    if (booking.last_name) params.set("lastName", booking.last_name);
    if (booking.client_email) params.set("email", booking.client_email);
    return `/humans/new?${params.toString()}`;
  });

  async function handleStatusChange(newStatus: string) {
    if (newStatus === "closed_lost") {
      showLossDialog = true;
      return;
    }
    try {
      await api(`/api/website-booking-requests/${booking.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await invalidateAll();
    } catch {
      toast("Failed to update status");
    }
  }

  async function submitLoss() {
    try {
      await api(`/api/website-booking-requests/${booking.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "closed_lost",
          crm_loss_reason: selectedLossReason || null,
          crm_loss_notes: lossNotes || null,
        }),
      });
      showLossDialog = false;
      selectedLossReason = "";
      lossNotes = "";
      await invalidateAll();
    } catch {
      // Loss submission failed
    }
  }

  function startEditNote() {
    noteValue = booking.crm_note ?? "";
    editingNote = true;
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

</script>

<svelte:head>
  <title>{booking.crm_display_id ? booking.crm_display_id + ' — ' : ''}{displayName(booking)} - Booking Request - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/leads/website-booking-requests"
    backLabel="Booking Requests"
    title="{booking.crm_display_id ? booking.crm_display_id + ' — ' : ''}{displayName(booking)}"
    status={booking.status ?? undefined}
    statusOptions={BOOKING_REQUEST_STATUS_OPTIONS.map((o) => o.value)}
    statusLabels={bookingRequestStatusLabels}
    statusColorMap={bookingRequestStatusColors}
    onStatusChange={handleStatusChange}
  >
    {#snippet actions()}
      <a href={resolve(createNewHumanUrl)} class="btn-primary text-sm py-1.5">
        Create New Human
      </a>
    {/snippet}
  </RecordManagementBar>

  <!-- Alerts -->
  {#if form?.error}
    {#if form.code?.endsWith("_DUPLICATE") && form.details}
      <DuplicateContactBanner
        details={form.details as { existingId: string; existingDisplayId: string; existingOwners: { type: string; id: string; displayId: string; name: string }[] }}
        entityType={form.code === "EMAIL_DUPLICATE" ? "emails" : form.code === "PHONE_DUPLICATE" ? "phone-numbers" : "social-ids"}
        parentType="websiteBookingRequest"
        parentId={booking.id}
        parentField="websiteBookingRequestId"
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
        apiEndpoint={`/api/website-booking-requests/${booking.id}/next-action`}
        {colleagueOptions}
        {currentColleagueId}
        nextAction={booking.nextAction ?? null}
      />
    </div>
  {/if}

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
              <option value={src.name} selected={booking.crm_source === src.name}>{src.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="channelSelect" class="block text-sm font-medium text-text-secondary mb-1">Channel</label>
          <select id="channelSelect" name="channel" class="glass-input block w-full px-3 py-2 text-sm">
            <option value="">-- Unknown --</option>
            {#each leadChannels as ch, i (i)}
              <option value={ch.name} selected={booking.crm_channel === ch.name}>{ch.name}</option>
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
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Metadata</h2>
    <dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <dt class="text-sm font-medium text-text-muted">Email</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.client_email ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Phone</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.phone_number ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Origin</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.origin_city ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Destination</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.destination_city ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Travel Date</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.travel_date ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Travel Time</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.travel_time ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Number of Dogs</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.number_of_dogs ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Pet Name</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.client_pet_name ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Booking Ref</dt>
        <dd class="mt-1 text-sm text-text-primary font-mono">{booking.booking_request_ref ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Seats Booked</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.seats_booked ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Created</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatDateTime(booking.inserted_at)}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Last Activity</dt>
        <dd class="mt-1 text-sm text-text-primary">
          {#if activities.length > 0}
            {formatDateTime(activities.reduce((latest, a) => a.activityDate > latest ? a.activityDate : latest, ""))}
          {:else}
            —
          {/if}
        </dd>
      </div>
    </dl>
    {#if booking.additional_information}
      <div class="mt-4">
        <dt class="text-sm font-medium text-text-muted">Additional Information</dt>
        <dd class="mt-1 text-sm text-text-primary">{booking.additional_information}</dd>
      </div>
    {/if}
  </div>

  <!-- Loss Details (editable, shown when closed_lost) -->
  {#if booking.status === "closed_lost"}
    <div class="glass-card p-6 mb-6">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Loss Details</h2>
      <div class="space-y-3">
        <div>
          <label for="editLossReason" class="block text-sm font-medium text-text-secondary mb-1">Loss Reason</label>
          <select id="editLossReason" class="glass-input block w-full px-3 py-2 text-sm" bind:value={editLossReason}>
            <option value="">-- Select --</option>
            {#each lossReasons as reason, i (i)}
              <option value={reason.name}>{reason.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="editLossNotes" class="block text-sm font-medium text-text-secondary mb-1">Loss Notes</label>
          <textarea
            id="editLossNotes"
            bind:value={editLossNotes}
            rows="3"
            class="glass-input block w-full px-3 py-2 text-sm"
            placeholder="Loss notes..."
          ></textarea>
        </div>
        <div class="flex justify-end">
          <Button size="sm" onclick={saveLossDetails} disabled={savingLoss}>
            {savingLoss ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  {/if}

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

  <!-- Pricing -->
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Pricing</h2>
    <dl class="mt-4 grid grid-cols-2 gap-4">
      <div>
        <dt class="text-sm font-medium text-text-muted">Base Flight Price</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatEur(booking.base_flight_price_eur)}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Deposit Status</dt>
        <dd class="mt-1">
          <StatusBadge status={depositStatusLabels[booking.deposit_status ?? ""] ?? booking.deposit_status ?? "—"} colorMap={{
            "Pending": "badge-yellow",
            "Paid": "badge-green",
            "Refunded": "badge-purple",
          }} />
        </dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Deposit Paid</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatEur(booking.deposit_paid_eur)}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Balance Status</dt>
        <dd class="mt-1">
          <StatusBadge status={balanceStatusLabels[booking.balance_status ?? ""] ?? booking.balance_status ?? "—"} colorMap={{
            "Pending": "badge-yellow",
            "Paid": "badge-green",
            "Refunded": "badge-purple",
          }} />
        </dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Balance Paid</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatEur(booking.balance_paid_eur)}</dd>
      </div>
      {#if booking.balance_due_date}
        <div>
          <dt class="text-sm font-medium text-text-muted">Balance Due Date</dt>
          <dd class="mt-1 text-sm text-text-primary">{booking.balance_due_date}</dd>
        </div>
      {/if}
    </dl>
  </div>

  <!-- CRM Note (editable) -->
  <div class="glass-card p-6 mb-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-text-primary">CRM Note</h2>
      {#if isManager && !editingNote}
        <Button type="button" variant="ghost" size="sm" onclick={startEditNote}>Edit</Button>
      {/if}
    </div>
    {#if editingNote}
      <form method="POST" action="?/updateNote" class="mt-3" onsubmit={() => { editingNote = false; }}>
        <textarea
          name="crm_note"
          rows="4"
          class="glass-input block w-full px-4 py-3 text-sm"
          bind:value={noteValue}
        ></textarea>
        <div class="mt-2 flex gap-2">
          <Button type="submit" size="sm">Save</Button>
          <Button type="button" variant="ghost" size="sm" onclick={() => { editingNote = false; }}>Cancel</Button>
        </div>
      </form>
    {:else}
      <div class="mt-3 rounded-xl bg-glass border border-glass-border px-4 py-3 text-sm text-text-secondary min-h-[3rem]">
        {#if booking.crm_note}
          {booking.crm_note}
        {:else}
          <span class="text-text-muted italic">No note.</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Link Human -->
  <LinkHumanSection
    linkedHuman={linkedHumanProp}
    createNewHumanUrl={createNewHumanUrl}
  />

  <!-- Linked Opportunity -->
  {#if hasLinkedHuman}
    <div class="glass-card p-6 mb-6">
      <h2 class="text-lg font-semibold text-text-primary">Linked Opportunity</h2>
      {#if linkedOpportunity}
        <div class="mt-3 rounded-xl bg-glass border border-glass-border px-4 py-3">
          <div class="flex items-center justify-between">
            <div>
              <a href={resolve(`/opportunities/${linkedOpportunity.id}`)} class="text-sm font-mono text-accent hover:text-[var(--link-hover)]">
                {linkedOpportunity.displayId}
              </a>
              <span class="ml-2 text-sm text-text-secondary">{linkedOpportunity.stage}</span>
            </div>
            <form method="POST" action="?/unlinkOpportunity">
              <Button type="submit" variant="ghost" size="sm">Unlink</Button>
            </form>
          </div>
        </div>
      {:else}
        <form method="POST" action="?/linkOpportunity" class="mt-3 space-y-3">
          <div>
            <label for="opportunitySelect" class="block text-sm font-medium text-text-secondary">Opportunity</label>
            <SearchableSelect
              options={opportunityOptions}
              name="opportunityId"
              id="opportunitySelect"
              required={true}
              emptyOption="Select an opportunity..."
              placeholder="Search opportunities..."
            />
          </div>
          <Button type="submit" size="sm">Link Opportunity</Button>
        </form>
      {/if}
    </div>
  {/if}

  <!-- Emails -->
  <div class="mb-6">
    <RelatedListTable
      title="Emails"
      items={crmEmails}
      columns={[
        { key: "displayId", label: "ID", sortable: true, sortValue: (e) => e.displayId },
        { key: "email", label: "Email", sortable: true, sortValue: (e) => e.email },
        { key: "isPrimary", label: "Primary", sortable: false },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="email"
      searchFilter={(e, q) => e.email.toLowerCase().includes(q) || e.displayId.toLowerCase().includes(q)}
      emptyMessage="No emails linked yet."
      addLabel="Email"
      onFormToggle={(open) => { if (!open) { emailAddMode = 'create'; emailLinkQuery = ''; emailLinkResults = []; } }}
    >
      {#snippet row(email, searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap"><a href={resolve(`/emails/${email.id}?from=${$page.url.pathname}`)} class="text-accent hover:text-[var(--link-hover)]">{email.displayId}</a></td>
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
        <div class="flex gap-2 mb-3">
          <button type="button" class="px-3 py-1 text-xs rounded-full transition-colors {emailAddMode === 'create' ? 'bg-accent text-white' : 'bg-glass-hover text-text-muted'}" onclick={() => { emailAddMode = 'create'; emailLinkQuery = ''; emailLinkResults = []; }}>Create New</button>
          <button type="button" class="px-3 py-1 text-xs rounded-full transition-colors {emailAddMode === 'link' ? 'bg-accent text-white' : 'bg-glass-hover text-text-muted'}" onclick={() => { emailAddMode = 'link'; }}>Link Existing</button>
        </div>
        {#if emailAddMode === 'create'}
          <form method="POST" action="?/addEmail" class="space-y-3">
            <div>
              <label for="newEmailAddress" class="block text-sm font-medium text-text-secondary">Email</label>
              <input id="newEmailAddress" name="email" type="email" required class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Email address" />
            </div>
            <Button type="submit" size="sm">Add Email</Button>
          </form>
        {:else}
          <div class="space-y-3">
            <div>
              <label for="borLinkEmail" class="block text-sm font-medium text-text-secondary">Search emails</label>
              <input id="borLinkEmail" type="text" bind:value={emailLinkQuery} oninput={searchExistingEmails} class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Type to search existing emails..." />
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
      items={crmPhoneNumbers}
      columns={[
        { key: "displayId", label: "ID", sortable: true, sortValue: (p) => p.displayId },
        { key: "phoneNumber", label: "Phone", sortable: true, sortValue: (p) => p.phoneNumber },
        { key: "isPrimary", label: "Primary", sortable: false },
        { key: "delete", label: "", headerClass: "w-10" },
      ]}
      defaultSortKey="phoneNumber"
      searchFilter={(p, q) => p.phoneNumber.toLowerCase().includes(q) || p.displayId.toLowerCase().includes(q)}
      emptyMessage="No phone numbers linked yet."
      addLabel="Phone Number"
      onFormToggle={(open) => { if (!open) { phoneAddMode = 'create'; phoneLinkQuery = ''; phoneLinkResults = []; } }}
    >
      {#snippet row(phone, searchQuery)}
        <td class="font-mono text-sm whitespace-nowrap"><a href={resolve(`/phone-numbers/${phone.id}?from=${$page.url.pathname}`)} class="text-accent hover:text-[var(--link-hover)]">{phone.displayId}</a></td>
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
        <div class="flex gap-2 mb-3">
          <button type="button" class="px-3 py-1 text-xs rounded-full transition-colors {phoneAddMode === 'create' ? 'bg-accent text-white' : 'bg-glass-hover text-text-muted'}" onclick={() => { phoneAddMode = 'create'; phoneLinkQuery = ''; phoneLinkResults = []; }}>Create New</button>
          <button type="button" class="px-3 py-1 text-xs rounded-full transition-colors {phoneAddMode === 'link' ? 'bg-accent text-white' : 'bg-glass-hover text-text-muted'}" onclick={() => { phoneAddMode = 'link'; }}>Link Existing</button>
        </div>
        {#if phoneAddMode === 'create'}
          <form method="POST" action="?/addPhoneNumber" class="space-y-3">
            <div>
              <label for="newPhoneNumber" class="block text-sm font-medium text-text-secondary">Phone Number</label>
              <input id="newPhoneNumber" name="phoneNumber" type="tel" required class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Phone number" />
            </div>
            <Button type="submit" size="sm">Add Phone Number</Button>
          </form>
        {:else}
          <div class="space-y-3">
            <div>
              <label for="borLinkPhone" class="block text-sm font-medium text-text-secondary">Search phone numbers</label>
              <input id="borLinkPhone" type="text" bind:value={phoneLinkQuery} oninput={searchExistingPhones} class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Type to search existing phone numbers..." />
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
      items={socialIds}
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
              <label for="newSocialHandle" class="block text-sm font-medium text-text-secondary">Handle</label>
              <input id="newSocialHandle" name="handle" type="text" required class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="@username or profile URL" />
            </div>
            <div>
              <label for="newSocialPlatform" class="block text-sm font-medium text-text-secondary">Platform</label>
              <SearchableSelect
                options={platformConfigs.map((p) => ({ value: p.id, label: p.name }))}
                name="platformId"
                id="newSocialPlatform"
                placeholder="Select platform..."
              />
            </div>
            <Button type="submit" size="sm">Add Social ID</Button>
          </form>
        {:else}
          <div class="space-y-3">
            <div>
              <label for="borLinkSocialId" class="block text-sm font-medium text-text-secondary">Search social IDs</label>
              <input id="borLinkSocialId" type="text" bind:value={socialIdLinkQuery} oninput={searchExistingSocialIds} class="glass-input mt-1 block w-full px-3 py-2 text-sm" placeholder="Type to search existing social IDs..." />
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

  <!-- Activities -->
  <div class="mb-6">
    <ActivityConversationView
      {activities}
      entityType="website-booking-request"
      entityId={booking.id}
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
    </ActivityConversationView>
  </div>

  <!-- Danger Zone (Admin only) -->
  {#if isAdmin}
    <div class="glass-card p-6 border-[var(--btn-danger-border)] bg-destructive">
      <h2 class="text-lg font-semibold text-destructive-foreground">Danger Zone</h2>
      {#if showDeleteConfirm}
        <p class="mt-2 text-sm text-destructive-foreground/80">Are you sure you want to delete this booking request? This cannot be undone.</p>
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
          Delete Booking Request
        </button>
      {/if}
    </div>
  {/if}
</div>

{#if showLossDialog}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="glass-card p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold text-text-primary">Close as Lost</h3>
      <p class="mt-2 text-sm text-text-secondary">Optionally provide details for closing this booking request.</p>
      <div class="mt-3">
        <label for="wbrLossReasonSelect" class="block text-sm font-medium text-text-secondary mb-1">Loss Reason</label>
        <select id="wbrLossReasonSelect" class="glass-input block w-full px-3 py-2 text-sm" bind:value={selectedLossReason}>
          <option value="">-- Select --</option>
          {#each lossReasons as reason, i (i)}
            <option value={reason.name}>{reason.name}</option>
          {/each}
        </select>
      </div>
      <textarea
        bind:value={lossNotes}
        rows="3"
        class="glass-input mt-3 block w-full px-3 py-2 text-sm"
        placeholder="Loss notes..."
      ></textarea>
      <div class="mt-4 flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onclick={() => { showLossDialog = false; selectedLossReason = ""; lossNotes = ""; }}>Cancel</Button>
        <Button variant="destructive" size="sm" onclick={submitLoss}>Close as Lost</Button>
      </div>
    </div>
  </div>
{/if}
