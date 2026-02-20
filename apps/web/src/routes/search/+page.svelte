<script lang="ts">
  import type { PageData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import { signupStatusColors } from "$lib/constants/colors";
  import { activityTypeLabels } from "$lib/constants/labels";

  let { data }: { data: PageData } = $props();

  type HumanResult = {
    id: string;
    firstName: string;
    lastName: string;
    emails: { email: string }[];
  };

  type SignupResult = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    origin: string | null;
    destination: string | null;
    status: string | null;
  };

  type ActivityResult = {
    id: string;
    type: string;
    subject: string;
    humanId: string | null;
    routeSignupId: string | null;
    activityDate: string;
  };

  type GeoInterestResult = {
    id: string;
    city: string;
    country: string;
    expressionCount: number;
    humanCount: number;
  };

  type AccountType = { id: string; name: string };
  type AccountResult = {
    id: string;
    name: string;
    status: string;
    types: AccountType[];
  };

  const humans = $derived(data.humans as HumanResult[]);
  const routeSignups = $derived(data.routeSignups as SignupResult[]);
  const activities = $derived(data.activities as ActivityResult[]);
  const geoInterests = $derived(data.geoInterests as GeoInterestResult[]);
  const accounts = $derived(data.accounts as AccountResult[]);
  const hasResults = $derived(humans.length > 0 || routeSignups.length > 0 || activities.length > 0 || geoInterests.length > 0 || accounts.length > 0);
</script>

<svelte:head>
  <title>Search - Humans CRM</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader title="Search" />

  <form method="GET" class="mt-4">
    <div class="flex gap-2">
      <input
        name="q"
        type="text"
        value={data.q}
        placeholder="Search humans, accounts, signups, activities..."
        class="glass-input flex-1 px-4 py-3 text-sm"
        autofocus
      />
      <button type="submit" class="btn-primary">Search</button>
    </div>
  </form>

  {#if data.q && !hasResults}
    <p class="mt-8 text-center text-sm text-text-muted">No results found for "{data.q}".</p>
  {/if}

  {#if accounts.length > 0}
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-text-primary">Accounts ({accounts.length})</h2>
      <ul class="mt-3 glass-card divide-y divide-glass-border">
        {#each accounts as account (account.id)}
          <li>
            <a href="/accounts/{account.id}" class="block px-6 py-4 hover:bg-glass-hover transition-colors">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium text-accent">{account.name}</p>
                {#each account.types as t}
                  <span class="glass-badge bg-[rgba(168,85,247,0.15)] text-purple-300 text-xs">{t.name}</span>
                {/each}
              </div>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if humans.length > 0}
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-text-primary">Humans ({humans.length})</h2>
      <ul class="mt-3 glass-card divide-y divide-glass-border">
        {#each humans as human (human.id)}
          <li>
            <a href="/humans/{human.id}" class="block px-6 py-4 hover:bg-glass-hover transition-colors">
              <p class="text-sm font-medium text-accent">{human.firstName} {human.lastName}</p>
              {#if human.emails?.length > 0}
                <p class="text-xs text-text-muted">{human.emails.map((e) => e.email).join(", ")}</p>
              {/if}
            </a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if routeSignups.length > 0}
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-text-primary">Route Signups ({routeSignups.length})</h2>
      <ul class="mt-3 glass-card divide-y divide-glass-border">
        {#each routeSignups as signup (signup.id)}
          <li>
            <a href="/leads/route-signups/{signup.id}" class="block px-6 py-4 hover:bg-glass-hover transition-colors">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-accent">
                  {[signup.first_name, signup.last_name].filter(Boolean).join(" ") || signup.email || "—"}
                </p>
                <span class="glass-badge {signupStatusColors[signup.status ?? ''] ?? 'bg-glass text-text-secondary'}">{signup.status ?? "—"}</span>
              </div>
              <p class="text-xs text-text-muted">
                {[signup.origin, signup.destination].filter(Boolean).join(" → ")}
                {#if signup.email}
                  &middot; {signup.email}
                {/if}
              </p>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if activities.length > 0}
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-text-primary">Activities ({activities.length})</h2>
      <ul class="mt-3 glass-card divide-y divide-glass-border">
        {#each activities as activity (activity.id)}
          <li class="px-6 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="glass-badge bg-glass text-text-secondary">
                  {activityTypeLabels[activity.type] ?? activity.type}
                </span>
                <p class="text-sm font-medium text-text-primary">{activity.subject}</p>
              </div>
              <span class="text-xs text-text-muted">{new Date(activity.activityDate).toLocaleDateString()}</span>
            </div>
            <div class="mt-1">
              {#if activity.humanId}
                <a href="/humans/{activity.humanId}" class="text-xs text-accent hover:text-cyan-300">View Human</a>
              {:else if activity.routeSignupId}
                <a href="/leads/route-signups/{activity.routeSignupId}" class="text-xs text-accent hover:text-cyan-300">View Signup</a>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if geoInterests.length > 0}
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-text-primary">Geo-Interests ({geoInterests.length})</h2>
      <ul class="mt-3 glass-card divide-y divide-glass-border">
        {#each geoInterests as gi (gi.id)}
          <li>
            <a href="/geo-interests/{gi.id}" class="block px-6 py-4 hover:bg-glass-hover transition-colors">
              <p class="text-sm font-medium text-accent">{gi.city}, {gi.country}</p>
              <p class="text-xs text-text-muted">
                {gi.humanCount} human{gi.humanCount !== 1 ? "s" : ""} &middot;
                {gi.expressionCount} expression{gi.expressionCount !== 1 ? "s" : ""}
              </p>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
