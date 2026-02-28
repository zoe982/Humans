<script lang="ts">
  import type { PageData } from "./$types";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import MarketingAttributionCard from "$lib/components/MarketingAttributionCard.svelte";
  import { resolve } from "$app/paths";
  import { formatDateTime } from "$lib/utils/format";

  let { data }: { data: PageData } = $props();

  type LinkedLead = {
    leadType: string;
    leadId: string;
    leadDisplayId: string | null;
    leadName: string | null;
  };

  type Attribution = {
    id: string;
    crmDisplayId: string | null;
    createdAt: string;
    ftUtmSource: string | null;
    ltUtmSource: string | null;
    ftUtmMedium: string | null;
    ltUtmMedium: string | null;
    ftUtmCampaign: string | null;
    ltUtmCampaign: string | null;
    ftUtmContent: string | null;
    ltUtmContent: string | null;
    ftUtmTerm: string | null;
    ltUtmTerm: string | null;
    ftLandingPageUrl: string | null;
    ltLandingPageUrl: string | null;
    ftReferrerUrl: string | null;
    ltReferrerUrl: string | null;
    ftGclid: string | null;
    ltGclid: string | null;
    ftGbraid: string | null;
    ltGbraid: string | null;
    ftWbraid: string | null;
    ltWbraid: string | null;
    ftFbclid: string | null;
    ltFbclid: string | null;
    ftFbp: string | null;
    ltFbp: string | null;
    ftFbc: string | null;
    ltFbc: string | null;
    ftLiFatId: string | null;
    ltLiFatId: string | null;
    ftCapturedAt: string | null;
    ltCapturedAt: string | null;
    firstTouch: Record<string, unknown> | null;
    lastTouch: Record<string, unknown> | null;
    triggerEvent: string | null;
    eventMetadata: Record<string, unknown> | null;
    linkedLead: LinkedLead | null;
  };

  const attribution = $derived(data.attribution as Attribution);

  function leadHref(lead: LinkedLead): string {
    if (lead.leadType === "route_signup") return `/leads/route-signups/${lead.leadId}`;
    return `/leads/website-booking-requests/${lead.leadId}`;
  }

  function leadTypeLabel(type: string): string {
    if (type === "route_signup") return "Route Signup";
    return "Booking Request";
  }
</script>

<svelte:head>
  <title>{attribution.crmDisplayId ?? "Marketing Attribution"} - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <RecordManagementBar
    backHref="/marketing-attributions"
    backLabel="Marketing Attributions"
    title={attribution.crmDisplayId ?? "Marketing Attribution"}
  />

  <!-- Details -->
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Details</h2>
    <dl class="mt-4 grid grid-cols-2 gap-4">
      <div>
        <dt class="text-sm font-medium text-text-muted">MAT ID</dt>
        <dd class="mt-1 text-sm text-text-primary font-mono">{attribution.crmDisplayId ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Created</dt>
        <dd class="mt-1 text-sm text-text-primary">{formatDateTime(attribution.createdAt)}</dd>
      </div>
    </dl>
  </div>

  <!-- Linked Lead -->
  {#if attribution.linkedLead != null}
    <div class="glass-card p-6 mb-6">
      <h2 class="text-lg font-semibold text-text-primary">Linked Lead</h2>
      <div class="mt-4">
        <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-secondary">
          {leadTypeLabel(attribution.linkedLead.leadType)}
        </span>
        <a href={resolve(leadHref(attribution.linkedLead))} class="ml-2 text-accent hover:text-[var(--link-hover)]">
          {attribution.linkedLead.leadName ?? "—"}
        </a>
        {#if attribution.linkedLead.leadDisplayId}
          <span class="ml-1 text-xs text-text-muted font-mono">{attribution.linkedLead.leadDisplayId}</span>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Trigger Event -->
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary">Trigger Event</h2>
    <dl class="mt-4 grid grid-cols-2 gap-4">
      <div>
        <dt class="text-sm font-medium text-text-muted">Event</dt>
        <dd class="mt-1 text-sm text-text-primary">{attribution.triggerEvent ?? "—"}</dd>
      </div>
      <div>
        <dt class="text-sm font-medium text-text-muted">Event Metadata</dt>
        <dd class="mt-1 text-sm text-text-primary font-mono whitespace-pre-wrap break-all">{attribution.eventMetadata != null ? JSON.stringify(attribution.eventMetadata, null, 2) : "—"}</dd>
      </div>
    </dl>
  </div>

  <!-- Attribution Data -->
  <div class="glass-card p-6 mb-6">
    <h2 class="text-lg font-semibold text-text-primary mb-4">Attribution Data</h2>
    <MarketingAttributionCard {attribution} />
  </div>
</div>
