<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import ActivityConversationView from "$lib/components/ActivityConversationView.svelte";
  import { api } from "$lib/api";
  import { ApiRequestError } from "$lib/api";
  import { toast } from "svelte-sonner";
  import { invalidateAll } from "$app/navigation";
  import { formatShortDate } from "$lib/utils/format";

  let { data }: { data: PageData } = $props();

  const opportunity = $derived(data.opportunity as { id: string; displayId: string; stage: string });
  const activities = $derived(data.activities as Array<{
    id: string; displayId: string; type: string; subject: string;
    body: string | null; notes: string | null; direction: string | null;
    activityDate: string; frontConversationId: string | null;
    ownerName?: string | null;
  }>);

  const dateRange = $derived.by(() => {
    if (activities.length === 0) return "";
    const sorted = [...activities].sort((a, b) => a.activityDate.localeCompare(b.activityDate));
    const first = formatShortDate(sorted[0].activityDate);
    const last = formatShortDate(sorted[sorted.length - 1].activityDate);
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
    { label: "Opportunities", href: "/opportunities" },
    { label: opportunity.displayId, href: `/opportunities/${opportunity.id}` },
    { label: "Activities" },
  ]}
/>

<p class="text-sm text-text-muted mb-4">
  {activities.length} messages{dateRange ? ` · ${dateRange}` : ""}
</p>

<ActivityConversationView
  {activities}
  entityType="opportunity"
  entityId={opportunity.id}
  onDelete={deleteActivity}
/>
