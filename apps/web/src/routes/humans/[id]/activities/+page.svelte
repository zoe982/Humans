<script lang="ts">
  import type { PageData } from "./$types";
  import ActivityConversationView from "$lib/components/ActivityConversationView.svelte";
  import { api } from "$lib/api";
  import { ApiRequestError } from "$lib/api";
  import { toast } from "svelte-sonner";
  import { invalidateAll } from "$app/navigation";
  import { ArrowLeft } from "lucide-svelte";

  let { data }: { data: PageData } = $props();

  const human = $derived(data.human as { id: string; displayId: string; firstName: string; lastName: string });
  const activities = $derived(data.activities as Array<{
    id: string; displayId: string; type: string; subject: string;
    body: string | null; notes: string | null; direction: string | null;
    activityDate: string; frontConversationId: string | null;
    ownerName?: string | null;
  }>);

  const humanName = $derived(`${human.firstName} ${human.lastName}`);
  const dateRange = $derived.by(() => {
    if (activities.length === 0) return "";
    const sorted = [...activities].sort((a, b) => a.activityDate.localeCompare(b.activityDate));
    const first = new Date(sorted[0].activityDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const last = new Date(sorted[sorted.length - 1].activityDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

<div class="flex items-center gap-3 mb-4">
  <a
    href="/humans/{human.id}"
    class="flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors duration-150"
  >
    <ArrowLeft size={14} />
    <span class="font-medium text-text-primary hover:text-accent">{humanName}</span>
    <span class="text-text-muted text-xs">({human.displayId})</span>
  </a>
  <span class="text-text-muted text-xs select-none" style="opacity: 0.4;">|</span>
  <span class="text-sm font-semibold text-text-primary">Activities</span>
  {#if activities.length > 0}
    <span class="text-xs text-text-muted">{activities.length} messages{dateRange ? ` · ${dateRange}` : ""}</span>
  {/if}
</div>

<ActivityConversationView
  {activities}
  entityType="human"
  entityId={human.id}
  onDelete={deleteActivity}
/>
