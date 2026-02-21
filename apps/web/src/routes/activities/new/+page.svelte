<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import AlertBanner from "$lib/components/AlertBanner.svelte";
  import SearchableSelect from "$lib/components/SearchableSelect.svelte";
  import GeoInterestPicker from "$lib/components/GeoInterestPicker.svelte";
  import RouteInterestPicker from "$lib/components/RouteInterestPicker.svelte";
  import { ACTIVITY_TYPE_OPTIONS } from "$lib/constants/labels";
  import { X } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Human = {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
  };
  type Account = { id: string; name: string };
  type RouteSignup = { id: string; display_id: string | null; first_name: string | null; last_name: string | null; origin: string | null; destination: string | null };
  type WebsiteBookingRequest = { id: string; crm_display_id: string | null; passenger_name: string | null; origin: string | null; destination: string | null };
  type GeoInterestItem = { id?: string; city?: string; country?: string; notes?: string };
  type RouteInterestItem = { id?: string; originCity?: string; originCountry?: string; destinationCity?: string; destinationCountry?: string; frequency?: string; travelYear?: number; travelMonth?: number; travelDay?: number; notes?: string };

  const humans = $derived(data.humans as Human[]);
  const accountsList = $derived(data.accounts as Account[]);
  const routeSignups = $derived((data.routeSignups ?? []) as RouteSignup[]);
  const websiteBookingRequests = $derived((data.websiteBookingRequests ?? []) as WebsiteBookingRequest[]);
  const apiUrl = $derived(data.apiUrl as string);
  let selectedType = $state("email");
  let geoInterests = $state<GeoInterestItem[]>([]);
  let showGeoInterestPicker = $state(false);
  let routeInterests = $state<RouteInterestItem[]>([]);
  let showRouteInterestPicker = $state(false);

  function displayName(h: Human): string {
    return [h.firstName, h.middleName, h.lastName].filter(Boolean).join(" ");
  }

  const humanOptions = $derived(humans.map((h) => ({ value: h.id, label: displayName(h) })));
  const accountOptions = $derived(accountsList.map((a) => ({ value: a.id, label: a.name })));
  const routeSignupOptions = $derived(routeSignups.map((s) => ({
    value: s.id,
    label: `${s.display_id ?? s.id.slice(0, 8)} — ${s.first_name ?? ""} ${s.last_name ?? ""} (${s.origin ?? "?"} → ${s.destination ?? "?"})`.trim(),
  })));
  const bookingRequestOptions = $derived(websiteBookingRequests.map((b) => ({
    value: b.id,
    label: `${b.crm_display_id ?? b.id.slice(0, 8)} — ${b.passenger_name ?? "Unknown"} (${b.origin ?? "?"} → ${b.destination ?? "?"})`.trim(),
  })));
</script>

<svelte:head>
  <title>New Activity - Humans</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <PageHeader
    title="New Activity"
    breadcrumbs={[{ label: "Activities", href: "/activities" }, { label: "New" }]}
  />

  {#if form?.error}
    <AlertBanner type="error" message={form.error} />
  {/if}

  <form method="POST" action="?/create" class="space-y-6 glass-card p-6">
    <div>
      <label for="type" class="block text-sm font-medium text-text-secondary mb-1">Type</label>
      <SearchableSelect
        options={ACTIVITY_TYPE_OPTIONS}
        name="type"
        id="type"
        value={selectedType}
        required={true}
        placeholder="Select type..."
        onSelect={(v) => { selectedType = v; }}
      />
    </div>

    {#if selectedType === "email"}
    <div>
      <label for="subject" class="block text-sm font-medium text-text-secondary mb-1">Subject</label>
      <input
        id="subject" name="subject" type="text" required maxlength={500}
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="Brief description of the activity"
      />
    </div>
    {/if}

    <div>
      <label for="notes" class="block text-sm font-medium text-text-secondary mb-1">Notes</label>
      <textarea
        id="notes" name="notes" rows={4} maxlength={10000}
        class="glass-input block w-full px-3 py-2 text-sm"
        placeholder="Optional notes..."
      ></textarea>
    </div>

    <div>
      <label for="activityDate" class="block text-sm font-medium text-text-secondary mb-1">Activity Date</label>
      <input
        id="activityDate" name="activityDate" type="datetime-local" required
        class="glass-input block w-full px-3 py-2 text-sm"
      />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label for="humanId" class="block text-sm font-medium text-text-secondary mb-1">Linked Human</label>
        <SearchableSelect
          options={humanOptions}
          name="humanId"
          id="humanId"
          emptyOption="— None —"
          placeholder="Search humans..."
        />
      </div>
      <div>
        <label for="accountId" class="block text-sm font-medium text-text-secondary mb-1">Linked Account</label>
        <SearchableSelect
          options={accountOptions}
          name="accountId"
          id="accountId"
          emptyOption="— None —"
          placeholder="Search accounts..."
        />
      </div>
      <div>
        <label for="routeSignupId" class="block text-sm font-medium text-text-secondary mb-1">Linked Route Signup</label>
        <SearchableSelect
          options={routeSignupOptions}
          name="routeSignupId"
          id="routeSignupId"
          emptyOption="— None —"
          placeholder="Search route signups..."
        />
      </div>
      <div>
        <label for="websiteBookingRequestId" class="block text-sm font-medium text-text-secondary mb-1">Linked Booking Request</label>
        <SearchableSelect
          options={bookingRequestOptions}
          name="websiteBookingRequestId"
          id="websiteBookingRequestId"
          emptyOption="— None —"
          placeholder="Search booking requests..."
        />
      </div>
    </div>
    <p class="text-xs text-text-muted">At least one linked entity is required.</p>

    <!-- Geo-Interests -->
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-2">Geo-Interests</label>
      {#if geoInterests.length > 0}
        <input type="hidden" name="geoInterestsJson" value={JSON.stringify(geoInterests)} />
        <div class="flex flex-wrap gap-2 mb-2">
          {#each geoInterests as geo, i}
            <span class="inline-flex items-center gap-1 rounded-full bg-[rgba(6,182,212,0.15)] text-accent px-2.5 py-1 text-sm">
              {geo.city ?? "New"}{geo.country ? `, ${geo.country}` : ""}
              <button type="button" class="ml-0.5 hover:text-[var(--link-hover)]" onclick={() => { geoInterests = geoInterests.filter((_, idx) => idx !== i); }}>
                <X size={12} />
              </button>
            </span>
          {/each}
        </div>
      {/if}
      {#if showGeoInterestPicker}
        <div class="p-3 rounded-lg bg-glass border border-glass-border space-y-3" id="new-geo-picker">
          <GeoInterestPicker
            {apiUrl}
            geoInterestIdName="pendingGeoId"
            cityName="pendingGeoCity"
            countryName="pendingGeoCountry"
            notesName="pendingGeoNotes"
          />
          <div class="flex gap-2">
            <Button
              type="button"
              size="sm"
              onclick={() => {
                const container = document.getElementById("new-geo-picker");
                if (container) {
                  const geoId = container.querySelector<HTMLInputElement>('input[name="pendingGeoId"]')?.value;
                  const city = container.querySelector<HTMLInputElement>('input[name="pendingGeoCity"]')?.value;
                  const country = container.querySelector<HTMLInputElement>('input[name="pendingGeoCountry"]')?.value;
                  const notes = container.querySelector<HTMLTextAreaElement>('textarea[name="pendingGeoNotes"]')?.value;
                  const item: GeoInterestItem = { id: geoId || undefined, city: city || undefined, country: country || undefined, notes: notes || undefined };
                  if (item.id || (item.city && item.country)) {
                    geoInterests = [...geoInterests, item];
                  }
                }
                showGeoInterestPicker = false;
              }}
            >
              Add
            </Button>
            <Button type="button" variant="ghost" size="sm" onclick={() => { showGeoInterestPicker = false; }}>
              Cancel
            </Button>
          </div>
        </div>
      {:else}
        <Button type="button" variant="link" size="sm" onclick={() => { showGeoInterestPicker = true; }}>
          + Add Geo-Interest
        </Button>
      {/if}
    </div>

    <!-- Route-Interests -->
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-2">Route-Interests</label>
      {#if routeInterests.length > 0}
        <input type="hidden" name="routeInterestsJson" value={JSON.stringify(routeInterests)} />
        <div class="flex flex-wrap gap-2 mb-2">
          {#each routeInterests as route, i}
            <span class="inline-flex items-center gap-1 rounded-full badge-purple px-2.5 py-1 text-sm">
              {route.originCity ?? "?"} &rarr; {route.destinationCity ?? "?"}
              <button type="button" class="ml-0.5 hover:opacity-80" onclick={() => { routeInterests = routeInterests.filter((_, idx) => idx !== i); }}>
                <X size={12} />
              </button>
            </span>
          {/each}
        </div>
      {/if}
      {#if showRouteInterestPicker}
        <div class="p-3 rounded-lg bg-glass border border-glass-border space-y-3" id="new-route-picker">
          <RouteInterestPicker
            {apiUrl}
            routeInterestIdName="pendingRouteId"
            originCityName="pendingRouteOriginCity"
            originCountryName="pendingRouteOriginCountry"
            destinationCityName="pendingRouteDestCity"
            destinationCountryName="pendingRouteDestCountry"
            frequencyName="pendingRouteFrequency"
            travelYearName="pendingRouteTravelYear"
            travelMonthName="pendingRouteTravelMonth"
            travelDayName="pendingRouteTravelDay"
            notesName="pendingRouteNotes"
          />
          <div class="flex gap-2">
            <Button
              type="button"
              size="sm"
              onclick={() => {
                const container = document.getElementById("new-route-picker");
                if (container) {
                  const routeId = container.querySelector<HTMLInputElement>('input[name="pendingRouteId"]')?.value;
                  const originCity = container.querySelector<HTMLInputElement>('input[name="pendingRouteOriginCity"]')?.value;
                  const originCountry = container.querySelector<HTMLInputElement>('input[name="pendingRouteOriginCountry"]')?.value;
                  const destCity = container.querySelector<HTMLInputElement>('input[name="pendingRouteDestCity"]')?.value;
                  const destCountry = container.querySelector<HTMLInputElement>('input[name="pendingRouteDestCountry"]')?.value;
                  const frequency = container.querySelector<HTMLInputElement>('input[name="pendingRouteFrequency"]')?.value;
                  const travelYear = container.querySelector<HTMLInputElement>('input[name="pendingRouteTravelYear"]')?.value;
                  const travelMonth = container.querySelector<HTMLInputElement>('input[name="pendingRouteTravelMonth"]')?.value;
                  const travelDay = container.querySelector<HTMLInputElement>('input[name="pendingRouteTravelDay"]')?.value;
                  const notes = container.querySelector<HTMLTextAreaElement>('textarea[name="pendingRouteNotes"]')?.value;
                  const item: RouteInterestItem = {
                    id: routeId || undefined,
                    originCity: originCity || undefined,
                    originCountry: originCountry || undefined,
                    destinationCity: destCity || undefined,
                    destinationCountry: destCountry || undefined,
                    frequency: frequency || undefined,
                    travelYear: travelYear ? parseInt(travelYear, 10) : undefined,
                    travelMonth: travelMonth ? parseInt(travelMonth, 10) : undefined,
                    travelDay: travelDay ? parseInt(travelDay, 10) : undefined,
                    notes: notes || undefined,
                  };
                  if (item.id || (item.originCity && item.originCountry && item.destinationCity && item.destinationCountry)) {
                    routeInterests = [...routeInterests, item];
                  }
                }
                showRouteInterestPicker = false;
              }}
            >
              Add
            </Button>
            <Button type="button" variant="ghost" size="sm" onclick={() => { showRouteInterestPicker = false; }}>
              Cancel
            </Button>
          </div>
        </div>
      {:else}
        <Button type="button" variant="link" size="sm" onclick={() => { showRouteInterestPicker = true; }}>
          + Add Route-Interest
        </Button>
      {/if}
    </div>

    <div class="flex gap-3">
      <Button type="submit">Create Activity</Button>
      <a href="/activities" class="btn-ghost">Cancel</a>
    </div>
  </form>
</div>
