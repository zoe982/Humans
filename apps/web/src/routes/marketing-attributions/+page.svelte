<script lang="ts">
  import type { PageData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
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
    linkedLead: LinkedLead | null;
  };

  const attributions = $derived(data.attributions as Attribution[]);

  function leadHref(lead: LinkedLead): string {
    if (lead.leadType === "route_signup") return `/leads/route-signups/${lead.leadId}`;
    return `/leads/website-booking-requests/${lead.leadId}`;
  }

  function leadTypeLabel(type: string): string {
    if (type === "route_signup") return "Route Signup";
    return "Booking Request";
  }
</script>

<EntityListPage
  title="Marketing Attributions"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports", href: "/reports" }, { label: "Marketing Attributions" }]}
  items={attributions}
  columns={[
    { key: "id", label: "MAT ID" },
    { key: "created", label: "Created" },
    { key: "leadType", label: "Lead Type" },
    { key: "lead", label: "Lead" },
    { key: "ftSource", label: "First Touch Source" },
    { key: "ltSource", label: "Last Touch Source" },
  ]}
  searchFilter={(a, q) =>
    (a.crmDisplayId?.toLowerCase().includes(q) ?? false) ||
    (a.ftUtmSource?.toLowerCase().includes(q) ?? false) ||
    (a.ltUtmSource?.toLowerCase().includes(q) ?? false) ||
    (a.linkedLead?.leadName?.toLowerCase().includes(q) ?? false) ||
    (a.linkedLead?.leadDisplayId?.toLowerCase().includes(q) ?? false)
  }
  searchPlaceholder="Search by ID, source, or lead name..."
>
  {#snippet desktopRow(a)}
    <td class="font-mono text-sm whitespace-nowrap">
      <a href={resolve(`/marketing-attributions/${a.id}`)} class="text-accent hover:text-[var(--link-hover)]">{a.crmDisplayId ?? "—"}</a>
    </td>
    <td class="text-sm text-text-secondary whitespace-nowrap">{formatDateTime(a.createdAt)}</td>
    <td class="text-sm text-text-secondary">{a.linkedLead != null ? leadTypeLabel(a.linkedLead.leadType) : "—"}</td>
    <td>
      {#if a.linkedLead != null}
        <a href={resolve(leadHref(a.linkedLead))} class="text-accent hover:text-[var(--link-hover)]">
          {a.linkedLead.leadName ?? a.linkedLead.leadDisplayId ?? "—"}
        </a>
        {#if a.linkedLead.leadDisplayId}
          <span class="ml-1 text-xs text-text-muted">{a.linkedLead.leadDisplayId}</span>
        {/if}
      {:else}
        <span class="text-text-muted">—</span>
      {/if}
    </td>
    <td class="text-sm text-text-secondary">{a.ftUtmSource ?? "—"}</td>
    <td class="text-sm text-text-secondary">{a.ltUtmSource ?? "—"}</td>
  {/snippet}
  {#snippet mobileCard(a)}
    <a href={resolve(`/marketing-attributions/${a.id}`)} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{a.crmDisplayId ?? "—"}</span>
      <div class="text-sm text-text-primary mt-1">
        {#if a.linkedLead != null}
          {a.linkedLead.leadName ?? leadTypeLabel(a.linkedLead.leadType)}
        {:else}
          No linked lead
        {/if}
      </div>
      <div class="text-xs text-text-muted mt-1">
        FT: {a.ftUtmSource ?? "—"} / LT: {a.ltUtmSource ?? "—"}
      </div>
    </a>
  {/snippet}
</EntityListPage>
