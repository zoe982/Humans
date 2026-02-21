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

  const [humansRes, activitiesRes, geoInterestsRes, petsCountRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/humans?page=1&limit=1`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/activities?page=1&limit=1`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/geo-interests`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/pets/count`, { headers }),
  ]);

  if (!humansRes.ok) console.error("[dashboard] Failed to load humans:", humansRes.status);
  if (!activitiesRes.ok) console.error("[dashboard] Failed to load activities:", activitiesRes.status);
  if (!geoInterestsRes.ok) console.error("[dashboard] Failed to load geo-interests:", geoInterestsRes.status);

  const humansRaw: unknown = humansRes.ok ? await humansRes.json() : null;
  const activitiesRaw: unknown = activitiesRes.ok ? await activitiesRes.json() : null;
  const geoInterestsRaw: unknown = geoInterestsRes.ok ? await geoInterestsRes.json() : null;
  const petsCountRaw: unknown = petsCountRes.ok ? await petsCountRes.json() : null;

  const humansTotal = hasMeta(humansRaw) ? humansRaw.meta.total : 0;
  const activitiesTotal = hasMeta(activitiesRaw) ? activitiesRaw.meta.total : 0;
  const geoInterestsList = isListData(geoInterestsRaw) ? geoInterestsRaw.data : [];
  const petsTotal = (petsCountRaw as { data?: { total?: number } } | null)?.data?.total ?? 0;

  // Fetch recent activities and daily counts in parallel
  const [recentRes, dailyCountsRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/activities?page=1&limit=10`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/activities/daily-counts?days=30`, { headers }),
  ]);
  const recentRaw: unknown = recentRes.ok ? await recentRes.json() : null;
  const recentActivities = isListData(recentRaw) ? recentRaw.data : [];

  const dailyCountsRaw: unknown = dailyCountsRes.ok ? await dailyCountsRes.json() : null;
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
