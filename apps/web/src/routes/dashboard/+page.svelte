<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import ActivityChart from "$lib/components/ActivityChart.svelte";
  import { Users, PawPrint, Activity, Globe2, Plus, Search, ClipboardList } from "lucide-svelte";
  import { activityTypeLabels } from "$lib/constants/labels";
  import { activityTypeColors } from "$lib/constants/colors";

  let { data }: { data: PageData } = $props();

  type RecentActivity = {
    id: string;
    type: string;
    subject: string;
    activityDate: string;
    humanName: string | null;
    accountName: string | null;
  };

  const recentActivities = $derived(data.recentActivities as RecentActivity[]);
  const dailyCounts = $derived(data.dailyCounts as { date: string; count: number }[]);
</script>

<svelte:head>
  <title>Dashboard - Humans</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Dashboard" />
  <p class="mt-2 text-text-secondary">Welcome back, {data.user?.name ?? "User"}.</p>

  <!-- Search bar -->
  <form method="GET" action="/search" class="mt-6">
    <div class="relative">
      <Search size={20} class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      <input
        type="text"
        name="q"
        placeholder="Search humans, accounts, activities..."
        class="glass-input w-full pl-12 pr-4 py-3 text-base"
      />
    </div>
  </form>

  <!-- Stats -->
  <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
    <a href="/humans" class="glass-card p-6 transition hover:ring-1 hover:ring-accent/40">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-text-muted">Humans</h3>
        <Users size={20} class="text-text-muted" />
      </div>
      <p class="mt-2 text-3xl font-bold text-text-primary">{data.counts.humans}</p>
    </a>
    <a href="/humans" class="glass-card p-6 transition hover:ring-1 hover:ring-accent/40">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-text-muted">Pets</h3>
        <PawPrint size={20} class="text-text-muted" />
      </div>
      <p class="mt-2 text-3xl font-bold text-text-primary">{data.counts.pets}</p>
    </a>
    <a href="/activities" class="glass-card p-6 transition hover:ring-1 hover:ring-accent/40">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-text-muted">Total Activities</h3>
        <Activity size={20} class="text-text-muted" />
      </div>
      <p class="mt-2 text-3xl font-bold text-text-primary">{data.counts.activities}</p>
    </a>
    <a href="/geo-interests" class="glass-card p-6 transition hover:ring-1 hover:ring-accent/40">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-text-muted">Geo-Interests</h3>
        <Globe2 size={20} class="text-text-muted" />
      </div>
      <p class="mt-2 text-3xl font-bold text-text-primary">{data.counts.geoInterests}</p>
    </a>
  </div>

  <!-- Activity Chart -->
  {#if dailyCounts.length > 0}
    <div class="mt-8 glass-card p-6">
      <h2 class="text-lg font-semibold text-text-primary mb-4">Activity (Last 30 Days)</h2>
      <ActivityChart data={dailyCounts} />
    </div>
  {/if}

  <!-- Quick Actions -->
  <div class="mt-8">
    <h2 class="text-lg font-semibold text-text-primary mb-3">Quick Actions</h2>
    <div class="flex flex-wrap gap-3">
      <a href="/humans/new" class="btn-ghost inline-flex items-center gap-2 text-sm">
        <Plus size={16} /> New Human
      </a>
      <a href="/activities/new" class="btn-ghost inline-flex items-center gap-2 text-sm">
        <ClipboardList size={16} /> Log Activity
      </a>
      <a href="/search" class="btn-ghost inline-flex items-center gap-2 text-sm">
        <Search size={16} /> Search Records
      </a>
    </div>
  </div>

  <!-- Recent Activity -->
  <div class="mt-8">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold text-text-primary">Recent Activity</h2>
      <a href="/activities" class="text-sm text-accent hover:text-cyan-300">View all</a>
    </div>
    <div class="glass-card divide-y divide-glass-border">
      {#each recentActivities as activity (activity.id)}
        <a href="/activities/{activity.id}" class="flex items-center gap-3 px-4 py-3 hover:bg-glass-hover transition-colors">
          <span class="glass-badge text-xs {activityTypeColors[activity.type] ?? 'bg-glass text-text-secondary'}">
            {activityTypeLabels[activity.type] ?? activity.type}
          </span>
          <span class="flex-1 text-sm text-text-primary truncate">{activity.subject}</span>
          {#if activity.humanName}
            <span class="text-xs text-text-muted hidden sm:inline">{activity.humanName}</span>
          {:else if activity.accountName}
            <span class="text-xs text-text-muted hidden sm:inline">{activity.accountName}</span>
          {/if}
          <span class="text-xs text-text-muted">{new Date(activity.activityDate).toLocaleDateString()}</span>
        </a>
      {:else}
        <div class="px-4 py-6 text-center text-sm text-text-muted">No recent activities.</div>
      {/each}
    </div>
  </div>
</div>
