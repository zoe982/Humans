import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export const load = async ({ locals, cookies }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const headers = { Cookie: `humans_session=${sessionToken ?? ""}` };

  const [humansRes, activitiesRes, geoInterestsRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/humans`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/activities`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/geo-interests`, { headers }),
  ]);

  if (!humansRes.ok) console.error("[dashboard] Failed to load humans:", humansRes.status);
  if (!activitiesRes.ok) console.error("[dashboard] Failed to load activities:", activitiesRes.status);
  if (!geoInterestsRes.ok) console.error("[dashboard] Failed to load geo-interests:", geoInterestsRes.status);

  const humansRaw: unknown = humansRes.ok ? await humansRes.json() : null;
  const activitiesRaw: unknown = activitiesRes.ok ? await activitiesRes.json() : null;
  const geoInterestsRaw: unknown = geoInterestsRes.ok ? await geoInterestsRes.json() : null;

  const humansList = isListData(humansRaw) ? humansRaw.data as { id: string }[] : [];
  const activitiesList = isListData(activitiesRaw) ? activitiesRaw.data : [];
  const geoInterestsList = isListData(geoInterestsRaw) ? geoInterestsRaw.data : [];

  // Count pets by fetching per-human (pets are nested under humans)
  // For now, count from the humans list endpoint which doesn't include pets,
  // so we fetch each human's pets. For efficiency with few humans, this is fine.
  let totalPets = 0;
  const petFetches = humansList.map(async (h) => {
    const res = await fetch(`${PUBLIC_API_URL}/api/humans/${h.id}/pets`, { headers });
    if (!res.ok) return 0;
    const raw: unknown = await res.json();
    return isListData(raw) ? raw.data.length : 0;
  });
  const petCounts = await Promise.all(petFetches);
  totalPets = petCounts.reduce((sum, c) => sum + c, 0);

  return {
    user: locals.user,
    counts: {
      humans: humansList.length,
      pets: totalPets,
      activities: activitiesList.length,
      geoInterests: geoInterestsList.length,
    },
  };
};
