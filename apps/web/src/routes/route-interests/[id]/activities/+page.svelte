<script lang="ts">
  import type { PageData } from "./$types";
  import ActivityConversationView from "$lib/components/ActivityConversationView.svelte";
  import RecordManagementBar from "$lib/components/RecordManagementBar.svelte";
  import { api } from "$lib/api";
  import { ApiRequestError } from "$lib/api";
  import { toast } from "svelte-sonner";
  import { invalidateAll } from "$app/navigation";
  import { Search } from "lucide-svelte";

  let { data }: { data: PageData } = $props();

  const routeInterest = $derived(data.routeInterest as {
    id: string;
    displayId: string;
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
  });
  const activities = $derived(data.activities as Array<{
    id: string; displayId: string; type: string; subject: string;
    body: string | null; notes: string | null; direction: string | null;
    activityDate: string; frontConversationId: string | null;
    ownerName?: string | null;
  }>);

  const title = $derived(`${routeInterest.originCity}, ${routeInterest.originCountry} → ${routeInterest.destinationCity}, ${routeInterest.destinationCountry}`);
  const subtitle = $derived.by(() => {
    if (activities.length === 0) return "Activities";
    const sorted = [...activities].sort((a, b) => a.activityDate.localeCompare(b.activityDate));
    const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const first = fmt(sorted[0].activityDate);
    const last = fmt(sorted[sorted.length - 1].activityDate);
    const range = first === last ? first : `${first} – ${last}`;
    return `Activities · ${activities.length} messages · ${range}`;
  });

  let searchQuery = $state("");

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

<RecordManagementBar
  backHref={`/route-interests/${routeInterest.id}`}
  backLabel="Route Interest"
  title={title}
>
  {#snippet actions()}
    <div class="relative">
      <Search
        size={14}
        class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
      />
      <input
        type="text"
        placeholder="Search activities..."
        bind:value={searchQuery}
        class="glass-input w-56 pl-8 pr-3 py-1.5 text-sm"
      />
    </div>
  {/snippet}
</RecordManagementBar>

<p class="text-xs text-text-muted mb-4 -mt-4 ml-1">{subtitle}</p>

<ActivityConversationView
  {activities}
  entityType="route-interest"
  entityId={routeInterest.id}
  onDelete={deleteActivity}
  hideHeader={true}
  {searchQuery}
/>
