import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

type PaginatedMeta = { meta: { page: number; limit: number; total: number } };

function hasMeta(value: unknown): value is PaginatedMeta {
  return typeof value === "object" && value !== null && "meta" in value && typeof (value as { meta: unknown }).meta === "object";
}

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export const load = async ({ locals, cookies }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const headers = { Cookie: `humans_session=${sessionToken ?? ""}` };

  // Helper: always consume the response body to release the connection
  // (Cloudflare Workers limit concurrent outbound connections to 6)
  async function fetchJson(url: string): Promise<{ ok: boolean; status: number; data: unknown }> {
    const res = await fetch(url, { headers });
    const data: unknown = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  }

  const [humans, activities, geoInterests, petsCount, recent, dailyCounts_] = await Promise.all([
    fetchJson(`${PUBLIC_API_URL}/api/humans?page=1&limit=1`),
    fetchJson(`${PUBLIC_API_URL}/api/activities?page=1&limit=1`),
    fetchJson(`${PUBLIC_API_URL}/api/geo-interests`),
    fetchJson(`${PUBLIC_API_URL}/api/pets/count`),
    fetchJson(`${PUBLIC_API_URL}/api/activities?page=1&limit=10`),
    fetchJson(`${PUBLIC_API_URL}/api/activities/daily-counts?days=30`),
  ]);

  if (!humans.ok) console.error("[dashboard] Failed to load humans:", humans.status);
  if (!activities.ok) console.error("[dashboard] Failed to load activities:", activities.status);
  if (!geoInterests.ok) console.error("[dashboard] Failed to load geo-interests:", geoInterests.status);

  const humansRaw = humans.ok ? humans.data : null;
  const activitiesRaw = activities.ok ? activities.data : null;
  const geoInterestsRaw = geoInterests.ok ? geoInterests.data : null;
  const petsCountRaw = petsCount.ok ? petsCount.data : null;

  const humansTotal = hasMeta(humansRaw) ? humansRaw.meta.total : 0;
  const activitiesTotal = hasMeta(activitiesRaw) ? activitiesRaw.meta.total : 0;
  const geoInterestsList = isListData(geoInterestsRaw) ? geoInterestsRaw.data : [];
  const petsTotal = (petsCountRaw as { data?: { total?: number } } | null)?.data?.total ?? 0;

  const recentRaw = recent.ok ? recent.data : null;
  const recentActivities = isListData(recentRaw) ? recentRaw.data : [];

  const dailyCountsRaw = dailyCounts_.ok ? dailyCounts_.data : null;
  const dailyCounts = isListData(dailyCountsRaw) ? dailyCountsRaw.data : [];

  return {
    user: locals.user,
    counts: {
      humans: humansTotal,
      pets: petsTotal,
      activities: activitiesTotal,
      geoInterests: geoInterestsList.length,
    },
    recentActivities,
    dailyCounts,
  };
};
