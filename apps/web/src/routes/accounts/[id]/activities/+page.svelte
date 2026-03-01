<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import ActivityConversationView from "$lib/components/ActivityConversationView.svelte";
  import { api } from "$lib/api";
  import { ApiRequestError } from "$lib/api";
  import { toast } from "svelte-sonner";
  import { invalidateAll } from "$app/navigation";

  let { data }: { data: PageData } = $props();

  const account = $derived(data.account as { id: string; displayId: string; name: string });
  const activities = $derived(data.activities as Array<{
    id: string; displayId: string; type: string; subject: string;
    body: string | null; notes: string | null; direction: string | null;
    activityDate: string; frontConversationId: string | null;
    ownerName?: string | null;
  }>);

  const dateRange = $derived.by(() => {
    if (activities.length === 0) return "";
    const sorted = [...activities].sort((a, b) => a.activityDate.localeCompare(b.activityDate));
    const first = new Date(sorted[0]?.activityDate ?? "").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const last = new Date(sorted[sorted.length - 1]?.activityDate ?? "").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return first === last ? first : `${first} – ${last}`;
  });

  async function deleteActivity(id: string) {
    try {
      await api(`/api/activities/${id}`, { method: "DELETE" });
      toast.success("Activity deleted");
      await invalidateAll();
    } catch (e: unknown) {
      const msg = e instanceof ApiRequestError ? e.message : "Failed to delete activity";
      toast.error(msg);
    }
  }
</script>

<PageHeader
  title="Activity History"
  breadcrumbs={[
    { label: "Accounts", href: "/accounts" },
    { label: `${account.name} (${account.displayId})`, href: `/accounts/${account.id}` },
    { label: "Activities" },
  ]}
/>

<p class="text-sm text-text-muted mb-4">
  {activities.length} messages{dateRange ? ` · ${dateRange}` : ""}
</p>

<ActivityConversationView
  {activities}
  entityType="account"
  entityId={account.id}
  onDelete={deleteActivity}
/>
