<script lang="ts">
  import type { PageData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import { resolve } from "$app/paths";

  let { data }: { data: PageData } = $props();

  type ReferralCode = {
    id: string;
    displayId: string;
    code: string;
    description: string | null;
    isActive: boolean;
    humanId: string | null;
    humanName: string | null;
    humanDisplayId: string | null;
    accountId: string | null;
    accountName: string | null;
    accountDisplayId: string | null;
  };

  const referralCodes = $derived(data.referralCodes as ReferralCode[]);
</script>

<EntityListPage
  title="Referral Codes"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports", href: "/reports" }, { label: "Referral Codes" }]}
  newHref="/referral-codes/new"
  newLabel="Add Referral Code"
  items={referralCodes}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "code", label: "Code" },
    { key: "description", label: "Description" },
    { key: "active", label: "Active" },
    { key: "human", label: "Human" },
    { key: "account", label: "Account" },
  ]}
  searchFilter={(rc, q) =>
    rc.code.toLowerCase().includes(q) ||
    (rc.description?.toLowerCase().includes(q) ?? false) ||
    (rc.humanName?.toLowerCase().includes(q) ?? false) ||
    (rc.accountName?.toLowerCase().includes(q) ?? false) ||
    rc.displayId.toLowerCase().includes(q)
  }
  searchPlaceholder="Search codes, descriptions, humans, accounts..."
>
  {#snippet desktopRow(rc)}
    <td class="font-mono text-sm whitespace-nowrap"><a href={resolve(`/referral-codes/${rc.id}`)} class="text-accent hover:text-[var(--link-hover)]">{rc.displayId}</a></td>
    <td class="font-medium">{rc.code}</td>
    <td class="text-sm text-text-secondary max-w-xs truncate">{rc.description ?? "—"}</td>
    <td>
      {#if rc.isActive}
        <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium badge-green">Active</span>
      {:else}
        <span class="glass-badge inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-glass text-text-muted">Inactive</span>
      {/if}
    </td>
    <td>
      {#if rc.humanId}
        <a href={resolve(`/humans/${rc.humanId}`)} class="text-accent hover:text-[var(--link-hover)]">{rc.humanName ?? "—"}</a>
        {#if rc.humanDisplayId}
          <span class="ml-1 text-xs text-text-muted">{rc.humanDisplayId}</span>
        {/if}
      {:else}
        <span class="text-text-muted">—</span>
      {/if}
    </td>
    <td>
      {#if rc.accountId}
        <a href={resolve(`/accounts/${rc.accountId}`)} class="text-accent hover:text-[var(--link-hover)]">{rc.accountName ?? "—"}</a>
        {#if rc.accountDisplayId}
          <span class="ml-1 text-xs text-text-muted">{rc.accountDisplayId}</span>
        {/if}
      {:else}
        <span class="text-text-muted">—</span>
      {/if}
    </td>
  {/snippet}
  {#snippet mobileCard(rc)}
    <a href={resolve(`/referral-codes/${rc.id}`)} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{rc.displayId}</span>
      <div class="font-medium text-accent">{rc.code}</div>
      <div class="text-sm text-text-secondary">
        {#if rc.isActive}
          <span class="glass-badge text-xs badge-green">Active</span>
        {:else}
          <span class="glass-badge text-xs bg-glass text-text-muted">Inactive</span>
        {/if}
        {#if rc.humanName}
          <span class="ml-2">{rc.humanName}</span>
        {/if}
      </div>
    </a>
  {/snippet}
</EntityListPage>
