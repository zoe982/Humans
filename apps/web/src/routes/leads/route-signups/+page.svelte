<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Signup = {
    id: string;
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

  const statusLabels: Record<string, string> = {
    open: "Open",
    qualified: "Qualified",
    closed_converted: "Converted",
    closed_rejected: "Rejected",
  };

  function displayName(s: Signup): string {
    const parts = [s.first_name, s.middle_name, s.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  }

  function formatDatetime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function handleDelete(e: Event) {
    if (!confirm("Are you sure you want to delete this route signup? This cannot be undone.")) {
      e.preventDefault();
    }
  }
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

  <div class="glass-card overflow-hidden">
    <table class="min-w-full">
      <thead class="glass-thead">
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Origin</th>
          <th>Destination</th>
          <th>Status</th>
          <th class="hidden sm:table-cell">Date</th>
          {#if data.userRole === "admin"}
            <th>Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each signups as signup (signup.id)}
          <tr class="glass-row-hover">
            <td class="font-medium">
              <a href="/leads/route-signups/{signup.id}" class="text-accent hover:text-cyan-300">{displayName(signup)}</a>
            </td>
            <td class="text-text-secondary">{signup.email ?? "—"}</td>
            <td class="text-text-secondary">{signup.origin ?? "—"}</td>
            <td class="text-text-secondary">{signup.destination ?? "—"}</td>
            <td>
              <StatusBadge status={statusLabels[signup.status ?? ""] ?? signup.status ?? "—"} colorMap={{
                "Open": "bg-[rgba(59,130,246,0.15)] text-blue-300",
                "Qualified": "bg-[rgba(234,179,8,0.15)] text-yellow-300",
                "Converted": "bg-[rgba(34,197,94,0.15)] text-green-300",
                "Rejected": "bg-[rgba(239,68,68,0.15)] text-red-300",
              }} />
            </td>
            <td class="hidden sm:table-cell text-text-muted">{formatDatetime(signup.inserted_at)}</td>
            {#if data.userRole === "admin"}
              <td>
                <form method="POST" action="?/delete" onsubmit={handleDelete}>
                  <input type="hidden" name="id" value={signup.id} />
                  <button type="submit" class="text-red-400 hover:text-red-300 text-sm">Delete</button>
                </form>
              </td>
            {/if}
          </tr>
        {:else}
          <tr>
            <td colspan={data.userRole === "admin" ? 7 : 6} class="px-6 py-8 text-center text-sm text-text-muted">No route signups found.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
