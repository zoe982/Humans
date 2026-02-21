<script lang="ts">
  import type { PageData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";

  let { data }: { data: PageData } = $props();

  type Email = {
    id: string;
    displayId: string;
    ownerType: string;
    ownerId: string;
    email: string;
    labelName: string | null;
    isPrimary: boolean;
    ownerName: string | null;
    ownerDisplayId: string | null;
  };

  const emails = $derived(data.emails as Email[]);

  const labelColors: Record<string, string> = {
    work: "badge-blue",
    personal: "badge-green",
    other: "bg-glass text-text-secondary",
  };

  function ownerHref(e: Email): string {
    return e.ownerType === "human" ? `/humans/${e.ownerId}` : `/accounts/${e.ownerId}`;
  }
</script>

<EntityListPage
  title="Emails"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports", href: "/reports" }, { label: "Emails" }]}
  newHref="/emails/new"
  newLabel="Add Email"
  items={emails}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "owner", label: "Owner" },
    { key: "email", label: "Email" },
    { key: "label", label: "Label" },
    { key: "primary", label: "Primary" },
  ]}
  searchFilter={(e, q) =>
    e.email.toLowerCase().includes(q) ||
    (e.ownerName?.toLowerCase().includes(q) ?? false) ||
    (e.ownerDisplayId?.toLowerCase().includes(q) ?? false) ||
    (e.labelName?.toLowerCase().includes(q) ?? false) ||
    e.displayId.toLowerCase().includes(q)
  }
  searchPlaceholder="Search emails, owners, labels..."
>
  {#snippet desktopRow(email)}
    <td class="font-mono text-sm"><a href="/emails/{email.id}" class="text-accent hover:text-[var(--link-hover)]">{email.displayId}</a></td>
    <td class="font-medium">
      <a href={ownerHref(email)} class="text-accent hover:text-[var(--link-hover)]">{email.ownerName ?? "\u2014"}</a>
      {#if email.ownerDisplayId}
        <span class="ml-1 text-xs text-text-muted">{email.ownerDisplayId}</span>
      {/if}
    </td>
    <td>{email.email}</td>
    <td>
      {#if email.labelName}
        <span class="glass-badge {labelColors[email.labelName.toLowerCase()] ?? 'bg-glass text-text-secondary'}">{email.labelName}</span>
      {:else}
        <span class="text-text-muted">\u2014</span>
      {/if}
    </td>
    <td class="text-text-muted">{email.isPrimary ? "Yes" : "\u2014"}</td>
  {/snippet}
  {#snippet mobileCard(email)}
    <a href="/emails/{email.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{email.displayId}</span>
      <div class="font-medium text-accent">{email.email}</div>
      <div class="text-sm text-text-secondary">
        {email.ownerName ?? "\u2014"}
        {#if email.labelName}
          <span class="ml-2 glass-badge text-xs {labelColors[email.labelName.toLowerCase()] ?? 'bg-glass text-text-secondary'}">{email.labelName}</span>
        {/if}
      </div>
    </a>
  {/snippet}
</EntityListPage>
