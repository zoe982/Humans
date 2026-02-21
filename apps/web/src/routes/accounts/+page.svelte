<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import EntityListPage from "$lib/components/EntityListPage.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import { statusColors } from "$lib/constants/colors";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type AccountType = { id: string; name: string };
  type Account = {
    id: string;
    displayId: string;
    name: string;
    status: string;
    types: AccountType[];
    createdAt: string;
  };

  const accounts = $derived(data.accounts as Account[]);
</script>

<EntityListPage
  title="Accounts"
  breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounts" }]}
  newHref="/accounts/new"
  newLabel="Add Account"
  items={accounts}
  error={form?.error}
  columns={[
    { key: "displayId", label: "ID" },
    { key: "name", label: "Name" },
    { key: "status", label: "Status" },
    { key: "types", label: "Types" },
    { key: "createdAt", label: "Created" },
  ]}
  searchFilter={(a, q) =>
    a.name.toLowerCase().includes(q) ||
    a.displayId.toLowerCase().includes(q) ||
    a.status.toLowerCase().includes(q) ||
    a.types.some((t) => t.name.toLowerCase().includes(q))
  }
  searchPlaceholder="Search accounts..."
  deleteAction="?/delete"
  deleteMessage="Are you sure you want to delete this account? This cannot be undone."
  canDelete={data.userRole === "admin"}
>
  {#snippet desktopRow(account)}
    <td class="font-mono text-sm">
      <a href="/accounts/{account.id}" class="text-accent hover:text-[var(--link-hover)]">{account.displayId}</a>
    </td>
    <td class="font-medium">
      <a href="/accounts/{account.id}" class="text-accent hover:text-[var(--link-hover)]">{account.name}</a>
    </td>
    <td>
      <StatusBadge status={account.status ?? "open"} colorMap={statusColors} />
    </td>
    <td>
      <div class="flex gap-1 flex-wrap">
        {#each account.types as t}
          <span class="glass-badge badge-purple">
            {t.name}
          </span>
        {/each}
      </div>
    </td>
    <td class="text-text-muted">{new Date(account.createdAt).toLocaleDateString()}</td>
  {/snippet}
  {#snippet mobileCard(account)}
    <a href="/accounts/{account.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
      <span class="font-mono text-xs text-text-muted">{account.displayId}</span>
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium text-accent">{account.name}</span>
        <StatusBadge status={account.status ?? "open"} colorMap={statusColors} />
      </div>
      <div class="flex gap-1 flex-wrap">
        {#each account.types as t}
          <span class="glass-badge text-xs badge-purple">{t.name}</span>
        {/each}
      </div>
      {#if data.userRole === "admin"}
        <div class="mt-2 flex justify-end">
          <button type="button" class="text-destructive-foreground hover:opacity-80 text-xs" onclick={(e) => { e.preventDefault(); }}>Delete</button>
        </div>
      {/if}
    </a>
  {/snippet}
</EntityListPage>
