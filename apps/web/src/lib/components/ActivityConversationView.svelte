<script lang="ts">
  import type { Snippet } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { slide } from "svelte/transition";
  import { Search, Trash2 } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import HighlightText from "$lib/components/HighlightText.svelte";
  import FormattedActivityText from "$lib/components/FormattedActivityText.svelte";
  import { activityTypeColors } from "$lib/constants/colors";
  import { activityTypeLabels } from "$lib/constants/labels";
  import { parseActivityContent, splitEmailSignature } from "$lib/utils/activity-helpers";
  import { page } from "$app/stores";
  import { resolve } from "$app/paths";

  type GeoExpr = { city?: string | null; country?: string | null };
  type RouteExpr = { originCity?: string | null; originCountry?: string | null; destinationCity?: string | null; destinationCountry?: string | null };
  type LinkedOpp = { displayId?: string | null; stage?: string | null; opportunityId?: string | null };

  type Activity = {
    id: string;
    displayId: string;
    type: string;
    subject: string;
    body: string | null;
    notes: string | null;
    direction: string | null;
    activityDate: string;
    frontConversationId: string | null;
    senderName?: string | null;
    ownerName?: string | null;
    ownerDisplayId?: string | null;
    humanName?: string | null;
    humanDisplayId?: string | null;
    geoInterestExpressions?: GeoExpr[];
    routeInterestExpressions?: RouteExpr[];
    linkedOpportunities?: LinkedOpp[];
    [key: string]: unknown;
  };

  type Props = {
    activities: Activity[];
    entityType: "human" | "account" | "opportunity" | "general-lead" | "website-booking-request" | "route-interest" | "route-signup";
    entityId: string;
    addForm?: Snippet;
    onDelete?: (id: string) => void;
    onFormToggle?: (open: boolean) => void;
    maxMessages?: number;
    showViewAll?: boolean;
    searchQuery?: string;
    hideHeader?: boolean;
  };

  let {
    activities,
    entityType,
    entityId,
    addForm,
    onDelete,
    onFormToggle,
    maxMessages,
    showViewAll = false,
    searchQuery: externalQuery,
    hideHeader = false,
  }: Props = $props();

  let showForm = $state(false);
  let internalQuery = $state("");

  // When an external searchQuery binding is provided, use it; otherwise use internal state.
  const searchQuery = $derived(externalQuery !== undefined ? externalQuery : internalQuery);

  // Sort ascending (oldest first) for chronological reading order.
  const sortedActivities = $derived.by(() => {
    return [...activities].sort(
      (a, b) => new Date(a.activityDate).getTime() - new Date(b.activityDate).getTime(),
    );
  });

  // Filter by search query across subject, body, notes, and type label.
  const filteredActivities = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedActivities;
    return sortedActivities.filter((a) => {
      const typeLabel = (activityTypeLabels[a.type] ?? a.type).toLowerCase();
      return (
        a.subject.toLowerCase().includes(q) ||
        (a.body ?? "").toLowerCase().includes(q) ||
        (a.notes ?? "").toLowerCase().includes(q) ||
        typeLabel.includes(q)
      );
    });
  });

  // For detail page: slice to the N most recent messages from the bottom.
  const visibleActivities = $derived.by(() => {
    if (maxMessages !== undefined && filteredActivities.length > maxMessages) {
      return filteredActivities.slice(filteredActivities.length - maxMessages);
    }
    return filteredActivities;
  });

  const totalCount = $derived(filteredActivities.length);
  const isTruncated = $derived(
    maxMessages !== undefined && filteredActivities.length > maxMessages,
  );
  const hiddenCount = $derived(isTruncated ? filteredActivities.length - maxMessages! : 0);

  // Format a date string to a short month+day label: "Jan 19".
  function formatDaySeparator(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  // Format a date string to time only: "4:11 PM".
  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // Return the calendar date portion (YYYY-MM-DD) for comparison.
  function calendarDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-CA"); // ISO-style date
  }

  // Determine whether to show a sender label for a given message.
  // A label is suppressed when the previous visible message had the same direction
  // and same senderName, and no day separator or conversation separator intervenes.
  function shouldShowSenderLabel(
    index: number,
    direction: string | null,
    senderName: string | null,
  ): boolean {
    if (index === 0) return true;
    const prev = visibleActivities[index - 1];
    const prevParsed = parseActivityContent(prev);
    const prevDay = calendarDate(prev.activityDate);
    // eslint-disable-next-line security/detect-object-injection
    const currDay = calendarDate(visibleActivities[index].activityDate);
    // Show label after a day change.
    if (prevDay !== currDay) return true;
    // Show label after a conversation change.
    // eslint-disable-next-line security/detect-object-injection
    const currConv = visibleActivities[index].frontConversationId;
    const prevConv = prev.frontConversationId;
    if (
      currConv !== null &&
      prevConv !== null &&
      currConv !== prevConv
    ) return true;
    // Show label when direction or sender changes.
    return prevParsed.direction !== direction || prevParsed.senderName !== senderName;
  }

  // Determine whether to show a day separator before a message.
  function shouldShowDaySeparator(index: number): boolean {
    if (index === 0) return true;
    const prev = visibleActivities[index - 1];
    // eslint-disable-next-line security/detect-object-injection
    return calendarDate(prev.activityDate) !== calendarDate(visibleActivities[index].activityDate);
  }

  // Determine whether to show a conversation divider before a message.
  // A divider appears when frontConversationId changes between adjacent messages
  // (but not on the very first message and not when a day separator already shows).
  function shouldShowConversationDivider(index: number): boolean {
    if (index === 0) return false;
    if (shouldShowDaySeparator(index)) return false;
    const prev = visibleActivities[index - 1];
    // eslint-disable-next-line security/detect-object-injection
    const curr = visibleActivities[index];
    return (
      curr.frontConversationId !== null &&
      prev.frontConversationId !== null &&
      curr.frontConversationId !== prev.frontConversationId
    );
  }

  // Build the sender display label: "← Michael" or "Barbara →".
  function senderLabel(direction: string | null, senderName: string | null): string {
    const name = senderName ?? (direction === "outbound" ? "Us" : "Them");
    if (direction === "outbound") return `${name} →`;
    if (direction === "inbound") return `← ${name}`;
    return name;
  }

  function entityBasePath(type: string, id: string): string {
    const map: Record<string, string> = {
      human: `/humans/${id}`,
      account: `/accounts/${id}`,
      opportunity: `/opportunities/${id}`,
      "general-lead": `/leads/general-leads/${id}`,
      "website-booking-request": `/leads/website-booking-requests/${id}`,
      "route-interest": `/route-interests/${id}`,
      "route-signup": `/leads/route-signups/${id}`,
    };
    // eslint-disable-next-line security/detect-object-injection
    return map[type] ?? `/humans/${id}`;
  }

  function hasLinkedEntities(a: Activity): boolean {
    return (
      (a.geoInterestExpressions != null && a.geoInterestExpressions.length > 0) ||
      (a.routeInterestExpressions != null && a.routeInterestExpressions.length > 0) ||
      (a.linkedOpportunities != null && a.linkedOpportunities.length > 0)
    );
  }

  // Track which activity indices have overflowing body text
  const overflowSet = new SvelteSet<number>();

  function detectOverflow(node: HTMLElement, index: number) {
    const wrapper = node.closest('.activity-body-wrapper') as HTMLElement | null;
    const check = () => {
      if (!wrapper) return;
      if (node.scrollHeight > node.clientHeight + 2) {
        wrapper.classList.add('is-truncated');
        overflowSet.add(index);
      } else {
        wrapper.classList.remove('is-truncated');
        overflowSet.delete(index);
      }
    };
    requestAnimationFrame(check);
    const ro = new ResizeObserver(check);
    ro.observe(node);
    return { destroy() { ro.disconnect(); } };
  }
</script>

<div class="glass-card overflow-hidden">
  <!-- Header (hidden when parent provides its own via RecordManagementBar) -->
  {#if !hideHeader}
    <div class="flex items-center justify-between px-4 pt-4 pb-3">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold text-text-primary">Activities</h2>
        {#if !showForm && activities.length > 0 && externalQuery === undefined}
          <div class="relative">
            <Search
              size={14}
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search..."
              bind:value={internalQuery}
              class="glass-input w-48 pl-8 pr-3 py-1.5 text-sm"
            />
          </div>
        {/if}
      </div>
      {#if addForm}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onclick={() => {
            showForm = !showForm;
            onFormToggle?.(showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Activity"}
        </Button>
      {/if}
    </div>
  {/if}

  <!-- Add Form -->
  {#if showForm && addForm}
    <div
      transition:slide={{ duration: 250 }}
      class="mx-5 mb-4 p-4 rounded-lg border border-glass-border"
      style="background: rgba(255,255,255,0.06);"
    >
      {@render addForm()}
    </div>
  {/if}

  <!-- Empty State -->
  {#if activities.length === 0}
    <p class="text-text-muted text-sm px-5 pb-5">No activities yet.</p>
  {:else if visibleActivities.length === 0}
    <p class="text-text-muted text-sm px-5 pb-5">No activities match your search.</p>
  {:else}
    <div class="border-t border-glass-border"></div>

    <!-- Message Feed -->
    <div class="px-4 py-3 flex flex-col gap-1">
      {#each visibleActivities as activity, i (i)}
        {@const parsed = parseActivityContent(activity)}
        {@const isOutbound = parsed.direction === "outbound"}
        {@const showDay = shouldShowDaySeparator(i)}
        {@const showConvDivider = shouldShowConversationDivider(i)}
        {@const showSender = shouldShowSenderLabel(i, parsed.direction, parsed.senderName)}
        {@const emailParts = parsed.text ? splitEmailSignature(parsed.text) : null}

        <!-- Day Separator -->
        {#if showDay}
          <div class="flex items-center gap-3 my-1.5">
            <div class="flex-1 h-px" style="background: rgba(255,255,255,0.10);"></div>
            <span class="text-xs text-text-muted select-none shrink-0">
              {formatDaySeparator(activity.activityDate)}
            </span>
            <div class="flex-1 h-px" style="background: rgba(255,255,255,0.10);"></div>
          </div>
        {/if}

        <!-- Conversation Divider -->
        {#if showConvDivider}
          <div class="flex items-center gap-2 my-1.5">
            <div class="flex-1 h-px" style="background: rgba(255,255,255,0.08);"></div>
            <span
              class="text-xs select-none shrink-0"
              style="color: var(--color-text-muted); letter-spacing: 0.03em;"
            >
              ═══ New conversation · {formatDaySeparator(activity.activityDate)} ═══
            </span>
            <div class="flex-1 h-px" style="background: rgba(255,255,255,0.08);"></div>
          </div>
        {/if}

        <!-- Sender Label -->
        {#if showSender && parsed.direction !== null}
          <p
            class="text-xs font-medium mt-2 mb-0.5 select-none"
            style="color: var(--color-text-muted);"
          >
            {senderLabel(parsed.direction, parsed.senderName)}
          </p>
        {/if}

        <!-- Message Panel -->
        <div
          class="group message-panel"
          class:message-outbound={isOutbound}
          class:message-inbound={!isOutbound}
        >
          <!-- Body Text with truncation -->
          <div class="activity-body-wrapper">
            <div
              class="text-sm text-text-primary break-words activity-body-text"
              use:detectOverflow={i}
            >
              {#if emailParts}
                <FormattedActivityText text={emailParts.body} query={searchQuery} />
              {:else}
                <HighlightText text={activity.subject} query={searchQuery} />
              {/if}
            </div>
            <a
              href={resolve(`/activities/${activity.id}?from=${$page.url.pathname}`)}
              class="activity-view-full"
            >
              View full activity &rarr;
            </a>
          </div>
          {#if emailParts?.signature && !overflowSet.has(i)}
            <details class="mt-2 text-xs text-text-muted">
              <summary class="cursor-pointer select-none opacity-60 hover:opacity-100 transition-opacity">
                Signature
              </summary>
              <div class="mt-1 whitespace-pre-line opacity-50">
                {emailParts.signature}
              </div>
            </details>
          {/if}

          <!-- Linked Entity Tags -->
          {#if hasLinkedEntities(activity)}
            <div class="flex flex-wrap gap-1.5 mb-2">
              {#each activity.geoInterestExpressions ?? [] as geo, geoIdx (geoIdx)}
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs" style="background: rgba(6,182,212,0.15); color: var(--color-accent);">
                  {geo.city ?? "?"}{geo.country ? `, ${geo.country}` : ""}
                </span>
              {/each}
              {#each activity.routeInterestExpressions ?? [] as route, routeIdx (routeIdx)}
                <span class="inline-flex items-center rounded-full badge-purple px-2 py-0.5 text-xs">
                  {route.originCity ?? "?"} &rarr; {route.destinationCity ?? "?"}
                </span>
              {/each}
              {#each activity.linkedOpportunities ?? [] as opp, oppIdx (oppIdx)}
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs" style="background: rgba(245,158,11,0.15); color: rgb(245,158,11);">
                  {opp.displayId ?? "OPP"}{opp.stage ? ` · ${opp.stage}` : ""}
                </span>
              {/each}
            </div>
          {/if}

          <!-- Footer Metadata -->
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 min-w-0">
              <!-- Display ID link -->
              <a
                href={resolve(`/activities/${activity.id}?from=${$page.url.pathname}`)}
                class="activity-display-id"
              >
                {activity.displayId}
              </a>

              <!-- Separator dot -->
              <span
                class="text-xs shrink-0 select-none"
                style="color: var(--color-text-muted); opacity: 0.35;"
              >·</span>

              <!-- Relative time -->
              <span
                class="text-xs shrink-0 hover:opacity-100"
                style="color: var(--color-text-muted); opacity: 0.5; transition: opacity 0.2s;"
                title={new Date(activity.activityDate).toLocaleString()}
              >
                {formatTime(activity.activityDate)}
              </span>

              <!-- Separator dot -->
              <span
                class="text-xs shrink-0 select-none"
                style="color: var(--color-text-muted); opacity: 0.35;"
              >·</span>

              <!-- Channel / Type Badge -->
              <span
                class="glass-badge text-xs shrink-0 {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}"
                style="font-size: 0.65rem; padding: 0.1rem 0.45rem; line-height: 1.4;"
              >
                <HighlightText
                  text={activityTypeLabels[activity.type] ?? activity.type}
                  query={searchQuery}
                />
              </span>
            </div>

            <!-- Delete Button -->
            {#if onDelete}
              <button
                type="button"
                onclick={() => onDelete!(activity.id)}
                class="flex items-center justify-center w-6 h-6 rounded-md shrink-0 transition-all duration-150 opacity-0 group-hover:opacity-100"
                style="color: var(--color-text-muted);"
                aria-label="Delete activity"
                onmouseenter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.color = "var(--destructive-foreground)";
                  el.style.background = "var(--destructive)";
                }}
                onmouseleave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.color = "var(--color-text-muted)";
                  el.style.background = "transparent";
                }}
              >
                <Trash2 size={12} />
              </button>
            {/if}
          </div>
        </div>
      {/each}

      <!-- View All / Truncation Footer -->
      {#if isTruncated}
        <div class="flex items-center gap-3 mt-3 mb-1">
          <div class="flex-1 h-px" style="background: rgba(255,255,255,0.08);"></div>
          <span class="text-xs shrink-0" style="color: var(--color-text-muted);">
            {maxMessages} of {totalCount} messages
            {#if showViewAll}
              ·
              <a
                href={resolve(`${entityBasePath(entityType, entityId)}/activities`)}
                class="text-accent hover:text-[var(--link-hover)] transition-colors duration-150"
              >
                View all →
              </a>
            {:else}
              · {hiddenCount} older hidden
            {/if}
          </span>
          <div class="flex-1 h-px" style="background: rgba(255,255,255,0.08);"></div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .message-panel {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    padding: 8px 12px;
    border-left: 3px solid rgba(147, 165, 184, 0.25);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    transition: border-left-color 0.2s, background 0.2s, box-shadow 0.2s;
  }

  .message-outbound {
    border-left: 3px solid rgba(6, 182, 212, 0.5);
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.08),
      rgba(255, 255, 255, 0.04)
    );
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .message-inbound {
    border-left: 3px solid rgba(147, 165, 184, 0.25);
  }

  /* Light-mode overrides */
  :global(.light) .message-panel {
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(0, 0, 0, 0.07);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.70);
    border-left: 3px solid rgba(100, 116, 139, 0.22);
  }

  :global(.light) .message-outbound {
    border-left: 3px solid rgba(6, 182, 212, 0.45);
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.07),
      rgba(255, 255, 255, 0.50)
    );
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.80);
  }

  :global(.light) .message-inbound {
    border-left: 3px solid rgba(100, 116, 139, 0.22);
  }

  /* ── Body truncation ── */
  .activity-body-wrapper {
    position: relative;
    margin-bottom: 0.5rem;
  }

  .activity-body-text {
    max-height: 31.25rem; /* 25 lines × 1.25rem */
    overflow: hidden;
    line-height: 1.25rem;
  }

  /* Fade last 3rem to transparent via mask (theme-agnostic) */
  .is-truncated .activity-body-text {
    -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 3rem), transparent 100%);
    mask-image: linear-gradient(to bottom, black calc(100% - 3rem), transparent 100%);
  }

  .activity-view-full {
    display: none;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-accent);
    margin-top: 0.375rem;
    transition: color 0.15s;
  }
  .activity-view-full:hover {
    color: var(--link-hover);
  }
  .is-truncated .activity-view-full {
    display: block;
  }

  /* ── Display ID pill ── */
  .activity-display-id {
    display: inline-flex;
    align-items: center;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-accent);
    background: rgba(6, 182, 212, 0.10);
    border: 1px solid rgba(6, 182, 212, 0.20);
    border-radius: 0.375rem;
    padding: 0.125rem 0.375rem;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
    flex-shrink: 0;
    line-height: 1.4;
    text-decoration: none;
  }

  .activity-display-id:hover {
    background: rgba(6, 182, 212, 0.18);
    border-color: rgba(6, 182, 212, 0.38);
    box-shadow: 0 0 8px rgba(6, 182, 212, 0.14);
    color: var(--link-hover);
  }

  :global(.light) .activity-display-id {
    color: #0891b2;
    background: rgba(6, 182, 212, 0.10);
    border-color: rgba(6, 182, 212, 0.22);
  }

  :global(.light) .activity-display-id:hover {
    background: rgba(6, 182, 212, 0.16);
    border-color: rgba(6, 182, 212, 0.35);
    color: #0e7490;
  }
</style>
