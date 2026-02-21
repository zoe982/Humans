<script lang="ts">
  import type { PageData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";

  let { data }: { data: PageData } = $props();

  type PhoneNumber = {
    id: string;
    displayId: string;
    ownerType: string;
    ownerId: string;
    phoneNumber: string;
    labelName: string | null;
    hasWhatsapp: boolean;
    isPrimary: boolean;
    ownerName: string | null;
    ownerDisplayId: string | null;
  };

  const phoneNumbers = $derived(data.phoneNumbers as PhoneNumber[]);

  function ownerHref(p: PhoneNumber): string {
    return p.ownerType === "human" ? `/humans/${p.ownerId}` : `/accounts/${p.ownerId}`;
  }
</script>

<EntityListPage
  title="Phone Numbers"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports", href: "/reports" }, { label: "Phone Numbers" }]}
  newHref="/phone-numbers/new"
  newLabel="Add Phone"
  items={phoneNumbers}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "owner", label: "Owner" },
    { key: "phoneNumber", label: "Phone Number" },
    { key: "label", label: "Label" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "primary", label: "Primary" },
  ]}
  searchFilter={(p, q) =>
    p.phoneNumber.toLowerCase().includes(q) ||
    (p.ownerName?.toLowerCase().includes(q) ?? false) ||
    (p.ownerDisplayId?.toLowerCase().includes(q) ?? false) ||
    (p.labelName?.toLowerCase().includes(q) ?? false) ||
    p.displayId.toLowerCase().includes(q)
  }
  searchPlaceholder="Search phones, owners, labels..."
>
  {#snippet desktopRow(phone)}
    <td class="font-mono text-sm"><a href="/phone-numbers/{phone.id}" class="text-accent hover:text-[var(--link-hover)]">{phone.displayId}</a></td>
    <td class="font-medium">
      <a href={ownerHref(phone)} class="text-accent hover:text-[var(--link-hover)]">{phone.ownerName ?? "\u2014"}</a>
      {#if phone.ownerDisplayId}
        <span class="ml-1 text-xs text-text-muted">{phone.ownerDisplayId}</span>
      {/if}
    </td>
    <td>{phone.phoneNumber}</td>
    <td>
      {#if phone.labelName}
        <span class="glass-badge bg-glass text-text-secondary">{phone.labelName}</span>
      {:else}
        <span class="text-text-muted">\u2014</span>
      {/if}
    </td>
    <td class="text-text-muted">{phone.hasWhatsapp ? "Yes" : "\u2014"}</td>
    <td class="text-text-muted">{phone.isPrimary ? "Yes" : "\u2014"}</td>
  {/snippet}
  {#snippet mobileCard(phone)}
    <a href="/phone-numbers/{phone.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{phone.displayId}</span>
      <div class="font-medium text-accent">{phone.phoneNumber}</div>
      <div class="text-sm text-text-secondary">
        {phone.ownerName ?? "\u2014"}
        {#if phone.labelName}
          <span class="ml-2 glass-badge text-xs bg-glass text-text-secondary">{phone.labelName}</span>
        {/if}
      </div>
    </a>
  {/snippet}
</EntityListPage>
