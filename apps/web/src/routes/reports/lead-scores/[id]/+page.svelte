<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { resolve } from "$app/paths";
  import { api } from "$lib/api";
  import { invalidateAll } from "$app/navigation";
  import { getLeadScoreBand } from "@humans/shared";

  let { data }: { data: PageData } = $props();

  type LeadScore = {
    id: string;
    displayId: string;
    generalLeadId: string | null;
    websiteBookingRequestId: string | null;
    routeSignupId: string | null;
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
    scoreFit: number;
    scoreIntent: number;
    scoreEngagement: number;
    scoreNegative: number;
    scoreTotal: number;
    scoreUpdatedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };

  let score = $state(data.score as LeadScore);
  const parentEntity = $derived(data.parentEntity as Record<string, unknown> | null);

  // Keep in sync with server data
  $effect(() => {
    score = data.score as LeadScore;
  });

  const band = $derived(getLeadScoreBand(score.scoreTotal));
  const parentType = $derived(
    score.generalLeadId != null
      ? "general_lead"
      : score.websiteBookingRequestId != null
        ? "website_booking_request"
        : "route_signup",
  );
  const parentId = $derived(score.generalLeadId ?? score.websiteBookingRequestId ?? score.routeSignupId ?? "");
  const parentLabel = $derived(
    parentType === "general_lead"
      ? "General Lead"
      : parentType === "website_booking_request"
        ? "Booking Request"
        : "Route Signup",
  );
  const parentHref = $derived(
    parentType === "general_lead"
      ? resolve(`/leads/general-leads/${parentId}`)
      : parentType === "website_booking_request"
        ? resolve(`/leads/website-booking-requests/${parentId}`)
        : resolve(`/leads/route-signups/${parentId}`),
  );

  let saving = $state(false);

  async function toggleFlag(flagName: string, value: boolean) {
    saving = true;
    try {
      const result = await api(`/api/lead-scores/${score.id}/flags`, {
        method: "PATCH",
        body: JSON.stringify({ [flagName]: value }),
      });
      if (result != null && typeof result === "object" && "data" in result) {
        score = (result as { data: LeadScore }).data;
      }
    } catch {
      // Error displayed by api() helper
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>{score.displayId} - Lead Score - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Header -->
  <RecordManagementBar
    backHref="/reports/lead-scores"
    backLabel="Lead Scores"
    title={score.displayId}
  >
    {#snippet actions()}
      <LeadScoreBadge score={score.scoreTotal} {band} size="lg" />
    {/snippet}
  </RecordManagementBar>

  <!-- Score Summary -->
  <div class="glass-card p-6 mb-6">
    <div class="flex items-center gap-6 flex-wrap">
      <div class="text-center">
        <div class="text-4xl font-bold text-text-primary">{score.scoreTotal}</div>
        <div class="text-sm text-text-muted mt-1">Total Score</div>
      </div>
      <div class="flex gap-4 text-sm">
        <div class="text-center">
          <div class="text-lg font-semibold text-green-400">+{score.scoreFit}</div>
          <div class="text-text-muted">Fit</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-semibold text-blue-400">+{score.scoreIntent}</div>
          <div class="text-text-muted">Intent</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-semibold text-purple-400">+{score.scoreEngagement}</div>
          <div class="text-text-muted">Engage</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-semibold text-red-400">-{score.scoreNegative}</div>
          <div class="text-text-muted">Negative</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Parent Entity Context -->
  {#if parentEntity != null}
    <div class="glass-card p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-text-primary">{parentLabel}</h2>
        <a href={parentHref} class="text-sm text-accent hover:underline">
          View {parentLabel} &rarr;
        </a>
      </div>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {#if parentEntity.type === "general_lead"}
          <div>
            <dt class="text-text-muted">Name</dt>
            <dd class="text-text-secondary">{[parentEntity.firstName, parentEntity.middleName, parentEntity.lastName].filter(Boolean).join(" ") || "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Status</dt>
            <dd class="text-text-secondary">{parentEntity.status ?? "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Owner</dt>
            <dd class="text-text-secondary">{parentEntity.ownerName ?? "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Emails</dt>
            <dd class="text-text-secondary">{Array.isArray(parentEntity.emails) ? (parentEntity.emails as { email: string }[]).map(e => e.email).join(", ") : "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Phones</dt>
            <dd class="text-text-secondary">{Array.isArray(parentEntity.phoneNumbers) ? (parentEntity.phoneNumbers as { phoneNumber: string }[]).map(p => p.phoneNumber).join(", ") : "—"}</dd>
          </div>
        {:else if parentEntity.type === "website_booking_request"}
          <div>
            <dt class="text-text-muted">Name</dt>
            <dd class="text-text-secondary">{[parentEntity.first_name, parentEntity.last_name].filter(Boolean).join(" ") || "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Email</dt>
            <dd class="text-text-secondary">{parentEntity.client_email ?? "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Origin</dt>
            <dd class="text-text-secondary">{parentEntity.origin_city ?? "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Destination</dt>
            <dd class="text-text-secondary">{parentEntity.destination_city ?? "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Travel Date</dt>
            <dd class="text-text-secondary">{parentEntity.travel_date ?? "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Status</dt>
            <dd class="text-text-secondary">{parentEntity.status ?? "—"}</dd>
          </div>
        {:else}
          <div>
            <dt class="text-text-muted">Name</dt>
            <dd class="text-text-secondary">{[parentEntity.first_name, parentEntity.last_name].filter(Boolean).join(" ") || "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Email</dt>
            <dd class="text-text-secondary">{parentEntity.email ?? "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Origin</dt>
            <dd class="text-text-secondary">{parentEntity.origin ?? "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Destination</dt>
            <dd class="text-text-secondary">{parentEntity.destination ?? "—"}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Status</dt>
            <dd class="text-text-secondary">{parentEntity.status ?? "—"}</dd>
          </div>
        {/if}
      </dl>
    </div>
  {:else}
    <div class="glass-card p-4 mb-6">
      <div class="flex items-center justify-between">
        <span class="text-sm text-text-muted">{parentLabel}</span>
        <a href={parentHref} class="text-accent hover:underline text-sm">
          View {parentLabel} &rarr;
        </a>
      </div>
    </div>
  {/if}

  <!-- Fit Section -->
  <div class="glass-card p-6 mb-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-text-primary">Fit</h2>
      <span class="text-sm text-text-muted">Subtotal: {score.scoreFit}/35</span>
    </div>
    <div class="space-y-3">
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.fitMatchesCurrentWebsiteFlight}
          onchange={(e) => toggleFlag("fitMatchesCurrentWebsiteFlight", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Matches current website flight</span>
        <span class="ml-auto text-xs text-text-muted">+30 pts</span>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.fitPriceAcknowledgedOk}
          onchange={(e) => toggleFlag("fitPriceAcknowledgedOk", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Price acknowledged OK</span>
        <span class="ml-auto text-xs text-text-muted">+5 pts</span>
      </label>
    </div>
  </div>

  <!-- Intent Section -->
  <div class="glass-card p-6 mb-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-text-primary">Intent</h2>
      <span class="text-sm text-text-muted">Subtotal: {score.scoreIntent}/50 (highest wins)</span>
    </div>
    <div class="space-y-3">
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.intentDepositPaid}
          onchange={(e) => toggleFlag("intentDepositPaid", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Deposit paid</span>
        <span class="ml-auto text-xs text-text-muted">50 pts</span>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.intentPaymentDetailsSent}
          onchange={(e) => toggleFlag("intentPaymentDetailsSent", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Payment details sent</span>
        <span class="ml-auto text-xs text-text-muted">35 pts</span>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.intentRequestedPaymentDetails}
          onchange={(e) => toggleFlag("intentRequestedPaymentDetails", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Requested payment details</span>
        <span class="ml-auto text-xs text-text-muted">25 pts</span>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.intentBookingSubmitted}
          onchange={(e) => toggleFlag("intentBookingSubmitted", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Booking submitted</span>
        <span class="ml-auto text-xs text-text-muted">20 pts</span>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.intentBookingStarted}
          onchange={(e) => toggleFlag("intentBookingStarted", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Booking started</span>
        <span class="ml-auto text-xs text-text-muted">10 pts</span>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.intentRouteSignupSubmitted}
          onchange={(e) => toggleFlag("intentRouteSignupSubmitted", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Route signup submitted</span>
        <span class="ml-auto text-xs text-text-muted">5 pts</span>
      </label>
    </div>
  </div>

  <!-- Engagement Section -->
  <div class="glass-card p-6 mb-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-text-primary">Engagement</h2>
      <span class="text-sm text-text-muted">Subtotal: {score.scoreEngagement}/15 (one only)</span>
    </div>
    <div class="space-y-3">
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.engagementRespondedFast}
          onchange={(e) => toggleFlag("engagementRespondedFast", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Responded fast</span>
        <span class="ml-auto text-xs text-text-muted">+15 pts</span>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.engagementRespondedSlow}
          onchange={(e) => toggleFlag("engagementRespondedSlow", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Responded slow</span>
        <span class="ml-auto text-xs text-text-muted">+8 pts</span>
      </label>
    </div>
  </div>

  <!-- Negative Section -->
  <div class="glass-card p-6 mb-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-text-primary">Negative</h2>
      <span class="text-sm text-text-muted">Subtotal: -{score.scoreNegative}/60</span>
    </div>
    <div class="space-y-3">
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.negativeNoContactMethod}
          onchange={(e) => toggleFlag("negativeNoContactMethod", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">No contact method</span>
        <span class="ml-auto text-xs text-red-400">-30 pts</span>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.negativeOffNetworkRequest}
          onchange={(e) => toggleFlag("negativeOffNetworkRequest", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Off-network request</span>
        <span class="ml-auto text-xs text-red-400">-25 pts</span>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.negativePriceObjection}
          onchange={(e) => toggleFlag("negativePriceObjection", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Price objection</span>
        <span class="ml-auto text-xs text-red-400">-20 pts</span>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={score.negativeGhostedAfterPaymentSent}
          onchange={(e) => toggleFlag("negativeGhostedAfterPaymentSent", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-sm text-text-primary">Ghosted after payment sent</span>
        <span class="ml-auto text-xs text-red-400">-15 pts</span>
      </label>
    </div>
  </div>

  <!-- Lifecycle Section -->
  <div class="glass-card p-6 mb-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-text-primary">Lifecycle</h2>
    </div>
    <label class="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={score.customerHasFlown}
        onchange={(e) => toggleFlag("customerHasFlown", e.currentTarget.checked)}
        disabled={saving}
        class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
      />
      <span class="text-sm text-text-primary">Customer has flown</span>
      <span class="ml-auto text-xs text-text-muted">Override: min 95 pts</span>
    </label>
  </div>

  <!-- Metadata -->
  <div class="glass-card p-6">
    <h2 class="text-lg font-semibold text-text-primary mb-4">Metadata</h2>
    <dl class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <dt class="text-text-muted">ID</dt>
        <dd class="font-mono text-text-secondary">{score.id}</dd>
      </div>
      <div>
        <dt class="text-text-muted">Display ID</dt>
        <dd class="font-mono text-text-secondary">{score.displayId}</dd>
      </div>
      <div>
        <dt class="text-text-muted">Created</dt>
        <dd class="text-text-secondary">{new Date(score.createdAt).toLocaleString()}</dd>
      </div>
      <div>
        <dt class="text-text-muted">Last Updated</dt>
        <dd class="text-text-secondary">{new Date(score.updatedAt).toLocaleString()}</dd>
      </div>
      {#if score.scoreUpdatedAt != null}
        <div>
          <dt class="text-text-muted">Score Last Computed</dt>
          <dd class="text-text-secondary">{new Date(score.scoreUpdatedAt).toLocaleString()}</dd>
        </div>
      {/if}
    </dl>
  </div>
</div>
