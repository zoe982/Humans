<script lang="ts">
  import type { PageData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import { agreementStatusColors } from "$lib/constants/colors";
  import { agreementStatusLabels } from "$lib/constants/labels";
  import { resolve } from "$app/paths";

  let { data }: { data: PageData } = $props();

  type Agreement = {
    id: string;
    displayId: string;
    title: string;
    typeName: string | null;
    status: string;
    activationDate: string | null;
    humanId: string | null;
    humanName: string | null;
    humanDisplayId: string | null;
    accountId: string | null;
    accountName: string | null;
    accountDisplayId: string | null;
    createdAt: string;
  };

  const agreements = $derived(data.agreements as Agreement[]);

  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const statusColorMap = Object.fromEntries(
    Object.entries(agreementStatusColors).map(([k, v]) => [agreementStatusLabels[k] ?? k, v])
  );
</script>

<EntityListPage
  title="Agreements"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports", href: "/reports" }, { label: "Agreements" }]}
  newHref="/agreements/new"
  newLabel="New Agreement"
  items={agreements}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "title", label: "Title" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "human", label: "Human" },
    { key: "account", label: "Account" },
    { key: "activationDate", label: "Activation Date" },
  ]}
  searchFilter={(a, q) =>
    a.title.toLowerCase().includes(q) ||
    (a.typeName?.toLowerCase().includes(q) ?? false) ||
    (a.humanName?.toLowerCase().includes(q) ?? false) ||
    (a.accountName?.toLowerCase().includes(q) ?? false) ||
    a.displayId.toLowerCase().includes(q)
  }
  searchPlaceholder="Search agreements..."
>
  {#snippet desktopRow(a)}
    <td class="font-mono text-sm"><a href={resolve(`/agreements/${a.id}`)} class="text-accent hover:text-[var(--link-hover)]">{a.displayId}</a></td>
    <td class="font-medium"><a href={resolve(`/agreements/${a.id}`)} class="text-accent hover:text-[var(--link-hover)]">{a.title}</a></td>
    <td class="text-sm text-text-secondary">{a.typeName ?? "\u2014"}</td>
    <td><StatusBadge status={agreementStatusLabels[a.status] ?? a.status} colorMap={statusColorMap} /></td>
    <td>
      {#if a.humanId}
        <a href={resolve(`/humans/${a.humanId}`)} class="text-accent hover:text-[var(--link-hover)]">{a.humanName ?? "\u2014"}</a>
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
    <td>
      {#if a.accountId}
        <a href={resolve(`/accounts/${a.accountId}`)} class="text-accent hover:text-[var(--link-hover)]">{a.accountName ?? "\u2014"}</a>
      {:else}
        <span class="text-text-muted">&mdash;</span>
      {/if}
    </td>
    <td class="text-sm text-text-secondary">{a.activationDate ?? "\u2014"}</td>
  {/snippet}
  {#snippet mobileCard(a)}
    <a href={resolve(`/agreements/${a.id}`)} class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <div class="flex items-center justify-between">
        <span class="font-mono text-xs text-text-muted">{a.displayId}</span>
        <StatusBadge status={agreementStatusLabels[a.status] ?? a.status} colorMap={statusColorMap} />
      </div>
      <div class="font-medium mt-1">{a.title}</div>
      <div class="text-sm text-text-secondary mt-1">
        {#if a.typeName}<span>{a.typeName}</span>{/if}
        {#if a.humanName}<span class="ml-2">{a.humanName}</span>{/if}
        {#if a.accountName}<span class="ml-2">{a.accountName}</span>{/if}
      </div>
    </a>
  {/snippet}
</EntityListPage>
