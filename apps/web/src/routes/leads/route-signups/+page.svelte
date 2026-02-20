<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import Pagination from "$lib/components/Pagination.svelte";
  import { signupStatusLabels } from "$lib/constants/labels";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Signup = {
    id: string;
    display_id: string | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    email: string | null;
    origin: string | null;
    destination: string | null;
    status: string | null;
    note: string | null;
    inserted_at: string;
    consent: boolean | null;
    newsletter_opt_in: boolean | null;
  };

  const signups = $derived(data.signups as Signup[]);

  function displayName(s: Signup): string {
    const parts = [s.first_name, s.middle_name, s.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  }

  function formatDatetime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  let pendingDeleteId = $state<string | null>(null);
  let deleteFormEl = $state<HTMLFormElement>();
</script>

<svelte:head>
  <title>Route Signups - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="Route Signups"
    breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Route Signups" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <!-- Mobile card view -->
  <div class="sm:hidden space-y-3">
    {#each signups as signup (signup.id)}
      <a href="/leads/route-signups/{signup.id}" class="glass-card p-4 block hover:ring-1 hover:ring-accent/40 transition">
        {#if signup.display_id}
          <span class="font-mono text-xs text-text-muted">{signup.display_id}</span>
        {/if}
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-accent">{displayName(signup)}</span>
          <StatusBadge status={signupStatusLabels[signup.status ?? ""] ?? signup.status ?? "—"} colorMap={{
            "Open": "bg-[rgba(59,130,246,0.15)] text-blue-300",
            "Qualified": "bg-[rgba(234,179,8,0.15)] text-yellow-300",
            "Converted": "bg-[rgba(34,197,94,0.15)] text-green-300",
            "Rejected": "bg-[rgba(239,68,68,0.15)] text-red-300",
          }} />
        </div>
        {#if signup.email}
          <p class="text-sm text-text-secondary truncate">{signup.email}</p>
        {/if}
        <div class="mt-1 flex gap-3 text-sm text-text-muted">
          {#if signup.origin}<span>{signup.origin}</span>{/if}
          {#if signup.origin && signup.destination}<span>→</span>{/if}
          {#if signup.destination}<span>{signup.destination}</span>{/if}
        </div>
        <div class="mt-2 flex items-center justify-between">
          <span class="text-xs text-text-muted">{formatDatetime(signup.inserted_at)}</span>
          {#if data.userRole === "admin"}
            <button type="button" class="text-red-400 hover:text-red-300 text-xs" onclick={(e) => { e.preventDefault(); pendingDeleteId = signup.id; }}>Delete</button>
          {/if}
        </div>
      </a>
    {:else}
      <div class="glass-card p-6 text-center text-sm text-text-muted">No route signups found.</div>
    {/each}
  </div>

  <!-- Desktop table view -->
  <div class="glass-card overflow-hidden hidden sm:block">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th scope="col">ID</th>
          <th scope="col">Name</th>
          <th scope="col">Email</th>
          <th scope="col">Origin</th>
          <th scope="col">Destination</th>
          <th scope="col">Status</th>
          <th scope="col">Date</th>
          {#if data.userRole === "admin"}
            <th scope="col">Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each signups as signup (signup.id)}
          <tr class="glass-row-hover">
            <td class="font-mono text-sm whitespace-nowrap">
              <a href="/leads/route-signups/{signup.id}" class="text-accent hover:text-cyan-300">{signup.display_id ?? "—"}</a>
            </td>
            <td class="font-medium">
              <a href="/leads/route-signups/{signup.id}" class="text-accent hover:text-cyan-300">{displayName(signup)}</a>
            </td>
            <td class="text-text-secondary">{signup.email ?? "—"}</td>
            <td class="text-text-secondary">{signup.origin ?? "—"}</td>
            <td class="text-text-secondary">{signup.destination ?? "—"}</td>
            <td>
              <StatusBadge status={signupStatusLabels[signup.status ?? ""] ?? signup.status ?? "—"} colorMap={{
                "Open": "bg-[rgba(59,130,246,0.15)] text-blue-300",
                "Qualified": "bg-[rgba(234,179,8,0.15)] text-yellow-300",
                "Converted": "bg-[rgba(34,197,94,0.15)] text-green-300",
                "Rejected": "bg-[rgba(239,68,68,0.15)] text-red-300",
              }} />
            </td>
            <td class="text-text-muted">{formatDatetime(signup.inserted_at)}</td>
            {#if data.userRole === "admin"}
              <td>
                <button type="button" class="text-red-400 hover:text-red-300 text-sm" onclick={() => { pendingDeleteId = signup.id; }}>Delete</button>
              </td>
            {/if}
          </tr>
        {:else}
          <tr>
            <td colspan={data.userRole === "admin" ? 8 : 7} class="px-6 py-8 text-center text-sm text-text-muted">No route signups found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <Pagination page={data.page} limit={data.limit} total={data.total} baseUrl="/leads/route-signups" />
</div>

<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden">
  <input type="hidden" name="id" value={pendingDeleteId ?? ""} />
</form>

<ConfirmDialog
  open={pendingDeleteId !== null}
  message="Are you sure you want to delete this route signup? This cannot be undone."
  onConfirm={() => { deleteFormEl?.requestSubmit(); pendingDeleteId = null; }}
  onCancel={() => { pendingDeleteId = null; }}
/>
