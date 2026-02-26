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

<!-- Hero Bar — Score Summary Strip -->
<div
  class="flex items-center gap-4 flex-wrap rounded-xl border border-[rgba(6,182,212,0.18)] bg-gradient-to-r from-[rgba(6,182,212,0.06)] to-[rgba(59,130,246,0.06)] px-4 py-3 mb-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
>
  <LeadScoreBadge score={score.scoreTotal} {band} size="lg" />

  <div class="flex gap-2 flex-wrap">
    <span class="glass-badge inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold badge-green">
      +{score.scoreFit} Fit
    </span>
    <span class="glass-badge inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold badge-blue">
      +{score.scoreIntent} Intent
    </span>
    <span class="glass-badge inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold badge-purple">
      +{score.scoreEngagement} Engage
    </span>
    <span class="glass-badge inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold badge-red">
      -{score.scoreNegative} Neg
    </span>
  </div>

  <a href={resolve(detailHref)} class="ml-auto flex items-center gap-1 text-sm text-accent hover:underline">
    Full details
    <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z" clip-rule="evenodd" /></svg>
  </a>
</div>

<!-- 3-column category grid: [Fit+Engagement] [Intent] [Negative+Lifecycle] -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

  <!-- Column 1: Fit stacked above Engagement -->
  <div class="flex flex-col gap-4">

    <!-- Fit Card -->
    <div class="rounded-xl border-l-[3px] border-l-green-500/50 bg-[rgba(34,197,94,0.04)] p-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold uppercase text-green-400">Fit</span>
        <span class="text-xs text-text-muted">{score.scoreFit}/35</span>
      </div>
      <div class="space-y-1">
        <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.fitMatchesCurrentWebsiteFlight ? 'bg-[rgba(34,197,94,0.07)]' : ''}">
          <input
            type="checkbox"
            checked={score.fitMatchesCurrentWebsiteFlight}
            onchange={(e) => toggleFlag("fitMatchesCurrentWebsiteFlight", e.currentTarget.checked)}
            disabled={saving}
            class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
          />
          <div>
            <span class="text-xs text-text-primary leading-tight block">Website flight match</span>
            <span class="text-[10px] text-text-muted">+30 pts</span>
          </div>
        </label>
        <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.fitPriceAcknowledgedOk ? 'bg-[rgba(34,197,94,0.07)]' : ''}">
          <input
            type="checkbox"
            checked={score.fitPriceAcknowledgedOk}
            onchange={(e) => toggleFlag("fitPriceAcknowledgedOk", e.currentTarget.checked)}
            disabled={saving}
            class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
          />
          <div>
            <span class="text-xs text-text-primary leading-tight block">Price acknowledged OK</span>
            <span class="text-[10px] text-text-muted">+5 pts</span>
          </div>
        </label>
      </div>
    </div>

    <!-- Engagement Card -->
    <div class="rounded-xl border-l-[3px] border-l-purple-500/50 bg-[rgba(168,85,247,0.04)] p-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold uppercase text-purple-400">Engagement</span>
        <span class="text-xs text-text-muted">{score.scoreEngagement}/15</span>
      </div>
      <div class="space-y-1">
        <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.engagementRespondedFast ? 'bg-[rgba(168,85,247,0.07)]' : ''}">
          <input
            type="checkbox"
            checked={score.engagementRespondedFast}
            onchange={(e) => toggleFlag("engagementRespondedFast", e.currentTarget.checked)}
            disabled={saving}
            class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
          />
          <div>
            <span class="text-xs text-text-primary leading-tight block">Responded fast</span>
            <span class="text-[10px] text-text-muted">+15 pts</span>
          </div>
        </label>
        <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.engagementRespondedSlow ? 'bg-[rgba(168,85,247,0.07)]' : ''}">
          <input
            type="checkbox"
            checked={score.engagementRespondedSlow}
            onchange={(e) => toggleFlag("engagementRespondedSlow", e.currentTarget.checked)}
            disabled={saving}
            class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
          />
          <div>
            <span class="text-xs text-text-primary leading-tight block">Responded slow</span>
            <span class="text-[10px] text-text-muted">+8 pts</span>
          </div>
        </label>
      </div>
    </div>

  </div>

  <!-- Column 2: Intent (tallest — anchors grid height) -->
  <div class="rounded-xl border-l-[3px] border-l-blue-500/50 bg-[rgba(59,130,246,0.04)] p-3">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-semibold uppercase text-blue-400">Intent</span>
      <span class="text-xs text-text-muted">{score.scoreIntent}/50</span>
    </div>
    <div class="space-y-1">
      <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.intentDepositPaid ? 'bg-[rgba(59,130,246,0.07)]' : ''}">
        <input
          type="checkbox"
          checked={score.intentDepositPaid}
          onchange={(e) => toggleFlag("intentDepositPaid", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <div>
          <span class="text-xs text-text-primary leading-tight block">Deposit paid</span>
          <span class="text-[10px] text-text-muted">+50 pts</span>
        </div>
      </label>
      <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.intentPaymentDetailsSent ? 'bg-[rgba(59,130,246,0.07)]' : ''}">
        <input
          type="checkbox"
          checked={score.intentPaymentDetailsSent}
          onchange={(e) => toggleFlag("intentPaymentDetailsSent", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <div>
          <span class="text-xs text-text-primary leading-tight block">Payment details sent</span>
          <span class="text-[10px] text-text-muted">+35 pts</span>
        </div>
      </label>
      <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.intentRequestedPaymentDetails ? 'bg-[rgba(59,130,246,0.07)]' : ''}">
        <input
          type="checkbox"
          checked={score.intentRequestedPaymentDetails}
          onchange={(e) => toggleFlag("intentRequestedPaymentDetails", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <div>
          <span class="text-xs text-text-primary leading-tight block">Requested payment details</span>
          <span class="text-[10px] text-text-muted">+25 pts</span>
        </div>
      </label>
      <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.intentBookingSubmitted ? 'bg-[rgba(59,130,246,0.07)]' : ''}">
        <input
          type="checkbox"
          checked={score.intentBookingSubmitted}
          onchange={(e) => toggleFlag("intentBookingSubmitted", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <div>
          <span class="text-xs text-text-primary leading-tight block">Booking submitted</span>
          <span class="text-[10px] text-text-muted">+20 pts</span>
        </div>
      </label>
      <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.intentBookingStarted ? 'bg-[rgba(59,130,246,0.07)]' : ''}">
        <input
          type="checkbox"
          checked={score.intentBookingStarted}
          onchange={(e) => toggleFlag("intentBookingStarted", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <div>
          <span class="text-xs text-text-primary leading-tight block">Booking started</span>
          <span class="text-[10px] text-text-muted">+10 pts</span>
        </div>
      </label>
      <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.intentRouteSignupSubmitted ? 'bg-[rgba(59,130,246,0.07)]' : ''}">
        <input
          type="checkbox"
          checked={score.intentRouteSignupSubmitted}
          onchange={(e) => toggleFlag("intentRouteSignupSubmitted", e.currentTarget.checked)}
          disabled={saving}
          class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <div>
          <span class="text-xs text-text-primary leading-tight block">Route signup submitted</span>
          <span class="text-[10px] text-text-muted">+5 pts</span>
        </div>
      </label>
    </div>
  </div>

  <!-- Column 3: Negative stacked above Lifecycle -->
  <div class="flex flex-col gap-4">

    <!-- Negative Card -->
    <div class="rounded-xl border-l-[3px] border-l-red-500/50 bg-[rgba(239,68,68,0.04)] p-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold uppercase text-red-400">Negative</span>
        <span class="text-xs text-text-muted">-{score.scoreNegative}/60</span>
      </div>
      <div class="space-y-1">
        <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.negativeNoContactMethod ? 'bg-[rgba(239,68,68,0.07)]' : ''}">
          <input
            type="checkbox"
            checked={score.negativeNoContactMethod}
            onchange={(e) => toggleFlag("negativeNoContactMethod", e.currentTarget.checked)}
            disabled={saving}
            class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
          />
          <div>
            <span class="text-xs text-text-primary leading-tight block">No contact method</span>
            <span class="text-[10px] text-text-muted">-30 pts</span>
          </div>
        </label>
        <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.negativeOffNetworkRequest ? 'bg-[rgba(239,68,68,0.07)]' : ''}">
          <input
            type="checkbox"
            checked={score.negativeOffNetworkRequest}
            onchange={(e) => toggleFlag("negativeOffNetworkRequest", e.currentTarget.checked)}
            disabled={saving}
            class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
          />
          <div>
            <span class="text-xs text-text-primary leading-tight block">Off-network request</span>
            <span class="text-[10px] text-text-muted">-25 pts</span>
          </div>
        </label>
        <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.negativePriceObjection ? 'bg-[rgba(239,68,68,0.07)]' : ''}">
          <input
            type="checkbox"
            checked={score.negativePriceObjection}
            onchange={(e) => toggleFlag("negativePriceObjection", e.currentTarget.checked)}
            disabled={saving}
            class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
          />
          <div>
            <span class="text-xs text-text-primary leading-tight block">Price objection</span>
            <span class="text-[10px] text-text-muted">-20 pts</span>
          </div>
        </label>
        <label class="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.06)] {score.negativeGhostedAfterPaymentSent ? 'bg-[rgba(239,68,68,0.07)]' : ''}">
          <input
            type="checkbox"
            checked={score.negativeGhostedAfterPaymentSent}
            onchange={(e) => toggleFlag("negativeGhostedAfterPaymentSent", e.currentTarget.checked)}
            disabled={saving}
            class="mt-0.5 h-4 w-4 rounded border-glass-border bg-glass accent-accent"
          />
          <div>
            <span class="text-xs text-text-primary leading-tight block">Ghosted after payment sent</span>
            <span class="text-[10px] text-text-muted">-15 pts</span>
          </div>
        </label>
      </div>
    </div>

    <!-- Lifecycle: Customer has flown -->
    <div
      class="rounded-xl border px-4 py-2.5 transition-colors {score.customerHasFlown
        ? 'border-[rgba(234,179,8,0.40)] bg-[rgba(234,179,8,0.12)]'
        : 'border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.06)] hover:bg-[rgba(234,179,8,0.10)]'}"
    >
      <label class="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={score.customerHasFlown}
          onchange={(e) => toggleFlag("customerHasFlown", e.currentTarget.checked)}
          disabled={saving}
          class="h-4 w-4 rounded border-glass-border bg-glass accent-accent"
        />
        <span class="text-xs font-medium text-text-primary">Customer has flown</span>
        <span class="text-[10px] text-text-muted">(min 95 pts)</span>
      </label>
    </div>

  </div>

</div>
