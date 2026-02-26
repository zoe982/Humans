<script lang="ts">
  import LeadScoreBadge from "$lib/components/LeadScoreBadge.svelte";
  import { getLeadScoreBand } from "@humans/shared";
  import { api } from "$lib/api";
  import { resolve } from "$app/paths";

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

  type Props = {
    leadScore: LeadScoreFull;
    detailHref: string;
    onScoreUpdate?: (updated: LeadScoreFull) => void;
  };

  let { leadScore, detailHref, onScoreUpdate }: Props = $props();

  let localOverride = $state<LeadScoreFull | null>(null);
  const score = $derived(localOverride ?? leadScore);

  let saving = $state(false);
  const band = $derived(getLeadScoreBand(score.scoreTotal));

  async function toggleFlag(flagName: string, value: boolean) {
    saving = true;
    try {
      const result = await api(`/api/lead-scores/${score.id}/flags`, {
        method: "PATCH",
        body: JSON.stringify({ [flagName]: value }),
      });
      if (result != null && typeof result === "object" && "data" in result) {
        const updated = (result as { data: LeadScoreFull }).data;
        localOverride = updated;
        onScoreUpdate?.(updated);
      }
    } catch {
      // Error displayed by api() helper
    } finally {
      saving = false;
    }
  }
</script>

<!-- Score Summary -->
<div class="flex items-center gap-6 flex-wrap mb-4">
  <LeadScoreBadge score={score.scoreTotal} {band} size="lg" />
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
  <a href={resolve(detailHref)} class="ml-auto text-sm text-accent hover:underline">
    View Full Details &rarr;
  </a>
</div>

<!-- 4-column flag grid -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- Fit Column -->
  <div>
    <div class="text-xs font-semibold text-green-400 mb-2">Fit ({score.scoreFit}/35)</div>
    <div class="space-y-2">
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.fitMatchesCurrentWebsiteFlight}
          onchange={(e) => toggleFlag("fitMatchesCurrentWebsiteFlight", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Website flt +30</span>
      </label>
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.fitPriceAcknowledgedOk}
          onchange={(e) => toggleFlag("fitPriceAcknowledgedOk", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Price OK +5</span>
      </label>
    </div>
  </div>

  <!-- Intent Column -->
  <div>
    <div class="text-xs font-semibold text-blue-400 mb-2">Intent ({score.scoreIntent}/50)</div>
    <div class="space-y-2">
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.intentDepositPaid}
          onchange={(e) => toggleFlag("intentDepositPaid", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Deposit paid 50</span>
      </label>
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.intentPaymentDetailsSent}
          onchange={(e) => toggleFlag("intentPaymentDetailsSent", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Payment sent 35</span>
      </label>
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.intentRequestedPaymentDetails}
          onchange={(e) => toggleFlag("intentRequestedPaymentDetails", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Requested dtl 25</span>
      </label>
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.intentBookingSubmitted}
          onchange={(e) => toggleFlag("intentBookingSubmitted", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Booking sub 20</span>
      </label>
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.intentBookingStarted}
          onchange={(e) => toggleFlag("intentBookingStarted", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Booking start 10</span>
      </label>
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.intentRouteSignupSubmitted}
          onchange={(e) => toggleFlag("intentRouteSignupSubmitted", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Route signup 5</span>
      </label>
    </div>
  </div>

  <!-- Engagement Column -->
  <div>
    <div class="text-xs font-semibold text-purple-400 mb-2">Engagement ({score.scoreEngagement}/15)</div>
    <div class="space-y-2">
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.engagementRespondedFast}
          onchange={(e) => toggleFlag("engagementRespondedFast", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Responded fast +15</span>
      </label>
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.engagementRespondedSlow}
          onchange={(e) => toggleFlag("engagementRespondedSlow", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Responded slow +8</span>
      </label>
    </div>
  </div>

  <!-- Negative Column -->
  <div>
    <div class="text-xs font-semibold text-red-400 mb-2">Negative (-{score.scoreNegative}/60)</div>
    <div class="space-y-2">
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.negativeNoContactMethod}
          onchange={(e) => toggleFlag("negativeNoContactMethod", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">No contact -30</span>
      </label>
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.negativeOffNetworkRequest}
          onchange={(e) => toggleFlag("negativeOffNetworkRequest", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Off-network -25</span>
      </label>
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.negativePriceObjection}
          onchange={(e) => toggleFlag("negativePriceObjection", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Price objection -20</span>
      </label>
      <label class="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={score.negativeGhostedAfterPaymentSent}
          onchange={(e) => toggleFlag("negativeGhostedAfterPaymentSent", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs text-text-primary leading-tight">Ghosted -15</span>
      </label>
    </div>
  </div>
</div>

<!-- Lifecycle -->
<div class="mt-4 pt-3 border-t border-glass-border">
  <label class="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={score.customerHasFlown}
      onchange={(e) => toggleFlag("customerHasFlown", e.currentTarget.checked)}
      disabled={saving}
      class="h-3.5 w-3.5 rounded border-glass-border bg-glass accent-accent"
    />
    <span class="text-xs text-text-primary">Customer has flown</span>
    <span class="text-xs text-text-muted">(min 95 pts)</span>
  </label>
</div>
