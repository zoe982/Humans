<script lang="ts">
  import type { PageData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";

  let { data }: { data: PageData } = $props();

  type DiscountCode = {
    id: string;
    crmDisplayId: string | null;
    code: string;
    description: string | null;
    percentOff: number;
    isActive: boolean;
    humanId: string | null;
    humanName: string | null;
    humanDisplayId: string | null;
    accountId: string | null;
    accountName: string | null;
    accountDisplayId: string | null;
  };

  const discountCodes = $derived(data.discountCodes as DiscountCode[]);
</script>

<EntityListPage
  title="Discount Codes"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports", href: "/reports" }, { label: "Discount Codes" }]}
  items={discountCodes}
  columns={[
    { key: "crmDisplayId", label: "ID" },
    { key: "code", label: "Code" },
    { key: "percentOff", label: "% Off" },
    { key: "active", label: "Active" },
    { key: "description", label: "Description" },
    { key: "human", label: "Human" },
    { key: "account", label: "Account" },
  ]}
  searchFilter={(dc, q) =>
    dc.code.toLowerCase().includes(q) ||
    (dc.description?.toLowerCase().includes(q) ?? false) ||
    (dc.humanName?.toLowerCase().includes(q) ?? false) ||
    (dc.accountName?.toLowerCase().includes(q) ?? false) ||
    (dc.crmDisplayId?.toLowerCase().includes(q) ?? false)
  }
  searchPlaceholder="Search codes, descriptions, humans, accounts..."
>
  {#snippet desktopRow(dc)}
    <td class="font-mono text-sm whitespace-nowrap"><a href="/discount-codes/{dc.id}" class="text-accent hover:text-[var(--link-hover)]">{dc.crmDisplayId ?? "—"}</a></td>
    <td class="font-medium font-mono">{dc.code}</td>
    <td class="text-sm">{dc.percentOff}%</td>
    <td>
      {#if dc.isActive}
        <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-green">Active</span>
      {:else}
        <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-muted">Inactive</span>
      {/if}
    </td>
    <td class="text-sm text-text-secondary max-w-xs truncate">{dc.description ?? "—"}</td>
    <td>
      {#if dc.humanId}
        <a href="/humans/{dc.humanId}" class="text-accent hover:text-[var(--link-hover)]">{dc.humanName ?? "—"}</a>
        {#if dc.humanDisplayId}
          <span class="ml-1 text-xs text-text-muted">{dc.humanDisplayId}</span>
        {/if}
      {:else}
        <span class="text-text-muted">—</span>
      {/if}
    </td>
    <td>
      {#if dc.accountId}
        <a href="/accounts/{dc.accountId}" class="text-accent hover:text-[var(--link-hover)]">{dc.accountName ?? "—"}</a>
        {#if dc.accountDisplayId}
          <span class="ml-1 text-xs text-text-muted">{dc.accountDisplayId}</span>
        {/if}
      {:else}
        <span class="text-text-muted">—</span>
      {/if}
    </td>
  {/snippet}
  {#snippet mobileCard(dc)}
    <a href="/discount-codes/{dc.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{dc.crmDisplayId ?? "—"}</span>
      <div class="font-medium font-mono text-accent">{dc.code}</div>
      <div class="text-sm text-text-secondary">
        <span>{dc.percentOff}% off</span>
        {#if dc.isActive}
          <span class="ml-2 glass-badge text-xs badge-green">Active</span>
        {:else}
          <span class="ml-2 glass-badge text-xs bg-glass text-text-muted">Inactive</span>
        {/if}
        {#if dc.humanName}
          <span class="ml-2">{dc.humanName}</span>
        {/if}
      </div>
    </a>
  {/snippet}
</EntityListPage>
